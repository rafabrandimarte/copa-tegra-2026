import { NextRequest, NextResponse } from 'next/server';
import { readDb, getFases } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const praca = req.nextUrl.searchParams.get('praca') || 'sp';
  const db = readDb();

  // Filter corretores by praca (exclude managers)
  const corretoresPraca = db.corretores.filter(c =>
    c.praca === praca &&
    !['Gerente de Vendas', 'Diretor de Vendas', 'Superintendente Online'].includes(c.posicao)
  );

  // Artilheiros: sum eventos per corretor
  const artilheiros = corretoresPraca.map(c => {
    const eventos = db.eventos.filter(e => e.corretor_cpf === c.cpf);
    const pontos = eventos.reduce((s, e) => s + e.pontos, 0);
    return {
      cpf: c.cpf,
      nome: c.nome_comercial || c.nome,
      gerente: c.equipe,
      diretoria: c.diretoria,
      pontos,
      total_eventos: eventos.length,
    };
  }).filter(a => a.pontos > 0).sort((a, b) => b.pontos - a.pontos);

  // Selecoes: sum by equipe
  const equipeMap = new Map<string, { gerente: string; diretoria: string; pontos: number; corretores: Set<string> }>();
  for (const c of corretoresPraca) {
    if (!equipeMap.has(c.equipe)) {
      equipeMap.set(c.equipe, { gerente: c.equipe, diretoria: c.diretoria, pontos: 0, corretores: new Set() });
    }
    const eq = equipeMap.get(c.equipe)!;
    eq.corretores.add(c.cpf);
    const pontos = db.eventos.filter(e => e.corretor_cpf === c.cpf).reduce((s, e) => s + e.pontos, 0);
    eq.pontos += pontos;
  }
  const selecoes = Array.from(equipeMap.values())
    .filter(s => s.pontos > 0)
    .map(s => ({ gerente: s.gerente, diretoria: s.diretoria, pontos: s.pontos, total_corretores: s.corretores.size }))
    .sort((a, b) => b.pontos - a.pontos);

  const vgvAtual = praca === 'sp' ? db.vgv.sp : db.vgv.campinas;

  return NextResponse.json({
    artilheiros,
    selecoes,
    fases: getFases(praca),
    vgvAtual,
    stats: {
      totalCorretores: corretoresPraca.length,
      totalEventos: db.eventos.filter(e => corretoresPraca.some(c => c.cpf === e.corretor_cpf)).length,
    },
  });
}
