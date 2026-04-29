import { NextRequest, NextResponse } from 'next/server';
import { getDb, normalizeCpf, mapPraca } from '@/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

function detectTipo(headers: string[]): string {
  const h = headers.map(x => (x || '').toString().toLowerCase());
  if (h.includes('posição') && h.includes('unidade') && h.includes('equipe')) return 'base_corretores';
  if (h.includes('venda_final') || h.includes('multip') || h.includes('statuscontrato2')) return 'vendas';
  if (h.includes('tipo visita')) return 'visitas';
  if (h.some(x => x.includes('período') || x.includes('periodo')) && h.includes('pontuação')) {
    return 'roleta_ou_oferta';
  }
  return 'desconhecido';
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const tipoForced = formData.get('tipo') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const allRows: any[] = XLSX.utils.sheet_to_json(firstSheet);

    if (allRows.length === 0) {
      return NextResponse.json({ error: 'Planilha vazia' }, { status: 400 });
    }

    const headers = Object.keys(allRows[0]);
    let tipo = tipoForced || detectTipo(headers);

    if (tipo === 'roleta_ou_oferta') {
      const firstPeriodo = (allRows[0]['Período'] || allRows[0]['Periodo'] || '').toString();
      tipo = firstPeriodo === 'Oferta' ? 'oferta' : 'roleta';
    }

    const db = getDb();
    let result: { count: number; message: string };

    switch (tipo) {
      case 'base_corretores':
        result = importBaseCorretores(db, allRows);
        break;
      case 'vendas':
        result = importVendas(db, allRows);
        break;
      case 'visitas':
        result = importVisitas(db, allRows);
        break;
      case 'roleta':
        result = importRoleta(db, buffer, wb);
        break;
      case 'oferta':
        result = importOferta(db, allRows);
        break;
      default:
        return NextResponse.json({ error: `Tipo não reconhecido. Colunas: ${headers.join(', ')}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, tipo, ...result });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao processar arquivo' }, { status: 500 });
  }
}

const upsertCorretorSQL = `
  INSERT INTO corretores (cpf, nome, nome_comercial, posicao, equipe, diretoria, praca)
  VALUES (?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(cpf) DO NOTHING
`;

const insertEventoSQL = `
  INSERT OR IGNORE INTO eventos (external_id, corretor_cpf, tipo, pontos, multiplicador, empreendimento, produto, semana, data, detalhes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

function importBaseCorretores(db: any, rows: any[]) {
  const insert = db.prepare(`
    INSERT INTO corretores (cpf, nome, nome_comercial, posicao, equipe, diretoria, praca)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(cpf) DO UPDATE SET
      nome=excluded.nome, nome_comercial=excluded.nome_comercial,
      posicao=excluded.posicao, equipe=excluded.equipe,
      diretoria=excluded.diretoria, praca=excluded.praca
  `);

  const transaction = db.transaction(() => {
    let count = 0;
    for (const row of rows) {
      const cpf = normalizeCpf(row['CPF / CNPJ'] || row['CPF/CNPJ'] || row['cpf']);
      const nome = (row['Nome Completo'] || row['nome'] || '').toString().trim();
      const nomeComercial = (row['Nome Comercial'] || row['nome_comercial'] || nome).toString().trim();
      const posicao = (row['Posição'] || row['posicao'] || '').toString().trim();
      const equipe = (row['Equipe'] || row['equipe'] || '').toString().trim();
      const diretoria = (row['Diretoria'] || row['diretoria'] || '').toString().trim();
      const unidade = (row['Unidade'] || row['unidade'] || '').toString().trim();
      const praca = unidade.toLowerCase().includes('campinas') ? 'campinas' : 'sp';
      if (!cpf || !nome) continue;
      insert.run(cpf, nome, nomeComercial, posicao, equipe, diretoria, praca);
      count++;
    }
    return count;
  });
  const count = transaction();
  return { count, message: `${count} corretores importados/atualizados` };
}

function importVendas(db: any, rows: any[]) {
  const insertEvento = db.prepare(insertEventoSQL);
  const upsertCorretor = db.prepare(upsertCorretorSQL);

  const transaction = db.transaction(() => {
    let count = 0;
    for (const row of rows) {
      const cpfCorretor = normalizeCpf(row['CPF Corretor']);
      const corretor = (row['Corretor'] || '').toString().trim();
      const gerente = (row['Gerente'] || '').toString().trim();
      const diretoria = (row['Diretoria'] || '').toString().trim();
      const regiao = (row['Regiao'] || row['Regional'] || '').toString().trim();
      const praca = mapPraca(regiao);
      const empreendimento = (row['Empreendimento'] || '').toString().trim();
      const produto = (row['Produto'] || '').toString().trim();
      const multip = parseFloat(row['Multip'] || '1') || 1;
      const pontuacao = parseFloat(row['PONTUAÇÃO'] || row['Pontuação'] || '0') || 0;
      const semana = (row['Semana'] || '').toString().trim();
      const dataAssinatura = (row['Data Assinatura'] || '').toString();
      const statusVenda = (row['Status Venda'] || '').toString().trim();
      const vgvBruto = parseFloat(row['VGV Bruto'] || '0') || 0;
      const proposta = (row['Proposta Vweb'] || '').toString().trim();
      const unidade = (row['Unidade'] || '').toString().trim();

      if (!cpfCorretor || !corretor) continue;
      if (statusVenda && statusVenda !== 'ASSINADO') continue;

      upsertCorretor.run(cpfCorretor, corretor, corretor, 'Corretor', gerente, diretoria, praca);

      const pontosFinais = pontuacao * multip;
      // Unique key: proposta + unidade, or cpf+empreendimento+data
      const extId = `venda_${proposta || (cpfCorretor + '_' + empreendimento + '_' + dataAssinatura)}`;

      const detalhes = JSON.stringify({ vgvBruto, multip, pontuacaoOriginal: pontuacao, statusVenda, canal: row['Canal'] || row['Canal_Novo'] || '' });
      insertEvento.run(extId, cpfCorretor, 'venda', pontosFinais, multip, empreendimento, produto, semana, dataAssinatura, detalhes);
      count++;
    }
    return count;
  });
  const count = transaction();
  return { count, message: `${count} vendas importadas` };
}

function importVisitas(db: any, rows: any[]) {
  const insertEvento = db.prepare(insertEventoSQL);
  const upsertCorretor = db.prepare(upsertCorretorSQL);

  const transaction = db.transaction(() => {
    let count = 0;
    for (const row of rows) {
      const cpf = normalizeCpf(row['CPF Corretor']);
      const corretor = (row['Corretor'] || '').toString().trim();
      const gerente = (row['Gerente'] || '').toString().trim();
      const superintendente = (row['Superintendente/ Diretor'] || row['Superintendente/Diretor'] || '').toString().trim();
      const regional = (row['Regional'] || '').toString().trim();
      const praca = mapPraca(regional);
      const produto = (row['Produto'] || '').toString().trim();
      const tipoVisita = (row['Tipo Visita'] || '').toString().trim();
      const data = (row['Data'] || '').toString();
      const tipoImovel = (row['Tipo Imóvel'] || '').toString().trim();

      if (!cpf || !corretor || !tipoVisita) continue;
      upsertCorretor.run(cpf, corretor, corretor, 'Corretor', gerente, superintendente, praca);

      const PONTOS_VISITA: Record<string, number> = { 'indicação': 20, 'indicacao': 20, 'retorno': 20 };
      const pontos = PONTOS_VISITA[tipoVisita.toLowerCase()] || 10;

      // Unique key: cpf + data + produto + tipoVisita + tipoImovel
      const extId = `visita_${cpf}_${data}_${produto}_${tipoVisita}_${tipoImovel}`;

      const detalhes = JSON.stringify({ tipoVisita, gerentePresente: row['Gerente Presente'] || '', localAtendimento: row['Local de Atendimento'] || '' });
      insertEvento.run(extId, cpf, tipoVisita.toLowerCase(), pontos, 1, produto, produto, null, data, detalhes);
      count++;
    }
    return count;
  });
  const count = transaction();
  return { count, message: `${count} visitas importadas` };
}

function importRoleta(db: any, buffer: Buffer, wb: any) {
  const sheetName = wb.SheetNames.find((s: string) => s.toLowerCase().includes('roleta')) || wb.SheetNames[0];
  const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName]);

  const insertEvento = db.prepare(insertEventoSQL);
  const upsertCorretor = db.prepare(upsertCorretorSQL);

  const transaction = db.transaction(() => {
    let count = 0;
    for (const row of rows) {
      const rowId = (row['Id'] || '').toString().trim();
      const cpf = normalizeCpf(row['CPF Corretor']);
      const corretor = (row['Corretor'] || '').toString().trim();
      const gerente = (row['Gerente'] || '').toString().trim();
      const superintendente = (row['Superintendente/Diretor'] || row['Superintendente/ Diretor'] || '').toString().trim();
      const regional = (row['Regional'] || '').toString().trim();
      const praca = mapPraca(regional);
      const produto = (row['Produto'] || '').toString().trim();
      const pontos = parseFloat(row['Pontuação'] || row['Pontuacao'] || '5') || 5;
      const semana = (row['Semana'] || '').toString().trim();
      const periodo = (row['Período'] || row['Periodo'] || '').toString().trim();
      const data = (row['Data'] || '').toString();

      if (!cpf || !corretor) continue;
      upsertCorretor.run(cpf, corretor, corretor, 'Corretor', gerente, superintendente, praca);

      // Use spreadsheet Id as unique key
      const extId = rowId ? `roleta_${rowId}` : `roleta_${cpf}_${data}_${periodo}_${produto}`;

      const detalhes = JSON.stringify({ periodo, produto });
      insertEvento.run(extId, cpf, 'roleta', pontos, 1, produto, produto, semana, data, detalhes);
      count++;
    }
    return count;
  });
  const count = transaction();
  return { count, message: `${count} registros de roleta importados` };
}

function importOferta(db: any, rows: any[]) {
  const insertEvento = db.prepare(insertEventoSQL);
  const upsertCorretor = db.prepare(upsertCorretorSQL);

  const transaction = db.transaction(() => {
    let count = 0;
    for (const row of rows) {
      const rowId = (row['Id'] || '').toString().trim();
      const cpf = normalizeCpf(row['CPF Corretor']);
      const corretor = (row['Corretor'] || '').toString().trim();
      const gerente = (row['Gerente'] || '').toString().trim();
      const superintendente = (row['Superintendente/Diretor'] || row['Superintendente/ Diretor'] || '').toString().trim();
      const regional = (row['Regional'] || '').toString().trim();
      const praca = mapPraca(regional);
      const produto = (row['Produto'] || '').toString().trim();
      const pontos = parseFloat(row['Pontuação'] || row['Pontuacao'] || '10') || 10;
      const data = (row['Data'] || '').toString();

      if (!cpf || !corretor) continue;
      upsertCorretor.run(cpf, corretor, corretor, 'Corretor', gerente, superintendente, praca);

      const extId = rowId ? `oferta_${rowId}` : `oferta_${cpf}_${data}_${produto}`;

      const detalhes = JSON.stringify({ produto });
      insertEvento.run(extId, cpf, 'oferta', pontos, 1, produto, produto, null, data, detalhes);
      count++;
    }
    return count;
  });
  const count = transaction();
  return { count, message: `${count} registros de oferta importados` };
}
