import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb, normalizeCpf, mapPraca } from '@/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

function detectTipo(headers: string[]): string {
  const h = headers.map(x => (x || '').toString().toLowerCase());
  if (h.includes('posição') && h.includes('unidade') && h.includes('equipe')) return 'base_corretores';
  if (h.includes('venda_final') || h.includes('multip') || h.includes('statuscontrato2')) return 'vendas';
  if (h.includes('tipo visita')) return 'visitas';
  if (h.some(x => x.includes('período') || x.includes('periodo')) && h.includes('pontuação')) return 'roleta_ou_oferta';
  return 'desconhecido';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const allRows: any[] = XLSX.utils.sheet_to_json(firstSheet);
    if (allRows.length === 0) return NextResponse.json({ error: 'Planilha vazia' }, { status: 400 });

    const headers = Object.keys(allRows[0]);
    let tipo = detectTipo(headers);
    if (tipo === 'roleta_ou_oferta') {
      const p = (allRows[0]['Período'] || allRows[0]['Periodo'] || '').toString();
      tipo = p === 'Oferta' ? 'oferta' : 'roleta';
    }

    const db = readDb();
    let count = 0;

    switch (tipo) {
      case 'base_corretores': count = importBase(db, allRows); break;
      case 'vendas': count = importVendas(db, allRows); break;
      case 'visitas': count = importVisitas(db, allRows); break;
      case 'roleta': count = importRoleta(db, wb); break;
      case 'oferta': count = importOferta(db, allRows); break;
      default: return NextResponse.json({ error: `Tipo não reconhecido. Colunas: ${headers.join(', ')}` }, { status: 400 });
    }

    writeDb(db);
    return NextResponse.json({ success: true, tipo, count, message: `${count} registros importados (${tipo})` });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar' }, { status: 500 });
  }
}

function upsertCorretor(db: any, cpf: string, nome: string, nomeComercial: string, posicao: string, equipe: string, diretoria: string, praca: 'sp'|'campinas') {
  const idx = db.corretores.findIndex((c: any) => c.cpf === cpf);
  const c = { cpf, nome, nome_comercial: nomeComercial, posicao, equipe, diretoria, praca };
  if (idx >= 0) db.corretores[idx] = c;
  else db.corretores.push(c);
}

function addEvento(db: any, extId: string, cpf: string, tipo: string, pontos: number, mult: number, emp: string, prod: string, semana: string, data: string, det: string) {
  if (db.eventos.some((e: any) => e.external_id === extId)) return false;
  db.eventos.push({ id: db.nextEventId++, external_id: extId, corretor_cpf: cpf, tipo, pontos, multiplicador: mult, empreendimento: emp, produto: prod, semana, data, detalhes: det });
  return true;
}

function importBase(db: any, rows: any[]) {
  let count = 0;
  for (const row of rows) {
    const cpf = normalizeCpf(row['CPF / CNPJ'] || row['CPF/CNPJ']);
    const nome = (row['Nome Completo'] || '').toString().trim();
    const nomeComercial = (row['Nome Comercial'] || nome).toString().trim();
    const posicao = (row['Posição'] || '').toString().trim();
    const equipe = (row['Equipe'] || '').toString().trim();
    const diretoria = (row['Diretoria'] || '').toString().trim();
    const unidade = (row['Unidade'] || '').toString().trim();
    const praca = unidade.toLowerCase().includes('campinas') ? 'campinas' as const : 'sp' as const;
    if (!cpf || !nome) continue;
    upsertCorretor(db, cpf, nome, nomeComercial, posicao, equipe, diretoria, praca);
    count++;
  }
  return count;
}

function importVendas(db: any, rows: any[]) {
  let count = 0;
  for (const row of rows) {
    const cpf = normalizeCpf(row['CPF Corretor']);
    const corretor = (row['Corretor'] || '').toString().trim();
    const gerente = (row['Gerente'] || '').toString().trim();
    const diretoria = (row['Diretoria'] || '').toString().trim();
    const praca = mapPraca(row['Regiao'] || row['Regional']);
    const emp = (row['Empreendimento'] || '').toString().trim();
    const multip = parseFloat(row['Multip'] || '1') || 1;
    const pontuacao = parseFloat(row['PONTUAÇÃO'] || row['Pontuação'] || '0') || 0;
    const semana = (row['Semana'] || '').toString().trim();
    const dataAss = (row['Data Assinatura'] || '').toString();
    const statusVenda = (row['Status Venda'] || '').toString().trim();
    const proposta = (row['Proposta Vweb'] || '').toString().trim();
    if (!cpf || !corretor) continue;
    if (statusVenda && statusVenda !== 'ASSINADO') continue;
    upsertCorretor(db, cpf, corretor, corretor, 'Corretor', gerente, diretoria, praca);
    const extId = `venda_${proposta || (cpf + '_' + emp + '_' + dataAss)}`;
    const pts = pontuacao * multip;
    if (addEvento(db, extId, cpf, 'venda', pts, multip, emp, row['Produto']||'', semana, dataAss, JSON.stringify({multip, pontuacaoOriginal: pontuacao}))) count++;
  }
  return count;
}

function importVisitas(db: any, rows: any[]) {
  let count = 0;
  const PONTOS: Record<string,number> = { 'indicação': 20, 'indicacao': 20, 'retorno': 20 };
  for (const row of rows) {
    const cpf = normalizeCpf(row['CPF Corretor']);
    const corretor = (row['Corretor'] || '').toString().trim();
    const gerente = (row['Gerente'] || '').toString().trim();
    const sup = (row['Superintendente/ Diretor'] || row['Superintendente/Diretor'] || '').toString().trim();
    const praca = mapPraca(row['Regional']);
    const produto = (row['Produto'] || '').toString().trim();
    const tipoVisita = (row['Tipo Visita'] || '').toString().trim();
    const data = (row['Data'] || '').toString();
    const tipoImovel = (row['Tipo Imóvel'] || '').toString().trim();
    if (!cpf || !corretor || !tipoVisita) continue;
    upsertCorretor(db, cpf, corretor, corretor, 'Corretor', gerente, sup, praca);
    const pontos = PONTOS[tipoVisita.toLowerCase()] || 10;
    const extId = `visita_${cpf}_${data}_${produto}_${tipoVisita}_${tipoImovel}`;
    if (addEvento(db, extId, cpf, tipoVisita.toLowerCase(), pontos, 1, produto, produto, '', data, '')) count++;
  }
  return count;
}

function importRoleta(db: any, wb: any) {
  const sheetName = wb.SheetNames.find((s: string) => s.toLowerCase().includes('roleta')) || wb.SheetNames[0];
  const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);
  let count = 0;
  for (const row of rows) {
    const rowId = (row['Id'] || '').toString().trim();
    const cpf = normalizeCpf(row['CPF Corretor']);
    const corretor = (row['Corretor'] || '').toString().trim();
    const gerente = (row['Gerente'] || '').toString().trim();
    const sup = (row['Superintendente/Diretor'] || row['Superintendente/ Diretor'] || '').toString().trim();
    const praca = mapPraca(row['Regional']);
    const produto = (row['Produto'] || '').toString().trim();
    const pontos = parseFloat(row['Pontuação'] || '5') || 5;
    const semana = (row['Semana'] || '').toString().trim();
    const periodo = (row['Período'] || row['Periodo'] || '').toString().trim();
    const data = (row['Data'] || '').toString();
    if (!cpf || !corretor) continue;
    upsertCorretor(db, cpf, corretor, corretor, 'Corretor', gerente, sup, praca);
    const extId = rowId ? `roleta_${rowId}` : `roleta_${cpf}_${data}_${periodo}_${produto}`;
    if (addEvento(db, extId, cpf, 'roleta', pontos, 1, produto, produto, semana, data, JSON.stringify({periodo}))) count++;
  }
  return count;
}

function importOferta(db: any, rows: any[]) {
  let count = 0;
  for (const row of rows) {
    const rowId = (row['Id'] || '').toString().trim();
    const cpf = normalizeCpf(row['CPF Corretor']);
    const corretor = (row['Corretor'] || '').toString().trim();
    const gerente = (row['Gerente'] || '').toString().trim();
    const sup = (row['Superintendente/Diretor'] || row['Superintendente/ Diretor'] || '').toString().trim();
    const praca = mapPraca(row['Regional']);
    const produto = (row['Produto'] || '').toString().trim();
    const pontos = parseFloat(row['Pontuação'] || '10') || 10;
    const data = (row['Data'] || '').toString();
    if (!cpf || !corretor) continue;
    upsertCorretor(db, cpf, corretor, corretor, 'Corretor', gerente, sup, praca);
    const extId = rowId ? `oferta_${rowId}` : `oferta_${cpf}_${data}_${produto}`;
    if (addEvento(db, extId, cpf, 'oferta', pontos, 1, produto, produto, '', data, '')) count++;
  }
  return count;
}
