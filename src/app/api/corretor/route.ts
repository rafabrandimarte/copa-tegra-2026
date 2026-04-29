import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cpf = req.nextUrl.searchParams.get('cpf');
  if (!cpf) return NextResponse.json({ error: 'CPF required' }, { status: 400 });

  const db = getDb();

  const corretor = db.prepare(`
    SELECT cpf, nome, nome_comercial, posicao, equipe, diretoria, praca
    FROM corretores WHERE cpf = ?
  `).get(cpf);

  if (!corretor) return NextResponse.json({ error: 'Corretor não encontrado' }, { status: 404 });

  const eventos = db.prepare(`
    SELECT tipo, pontos, multiplicador, empreendimento, semana, data, detalhes
    FROM eventos WHERE corretor_cpf = ?
    ORDER BY created_at DESC
  `).all(cpf);

  // Summary by tipo
  const resumo = db.prepare(`
    SELECT tipo, SUM(pontos) as total, COUNT(*) as quantidade
    FROM eventos WHERE corretor_cpf = ?
    GROUP BY tipo
    ORDER BY total DESC
  `).all(cpf);

  const totalPontos = db.prepare(`
    SELECT COALESCE(SUM(pontos), 0) as total FROM eventos WHERE corretor_cpf = ?
  `).get(cpf) as any;

  return NextResponse.json({
    corretor,
    eventos,
    resumo,
    totalPontos: totalPontos?.total || 0,
  });
}
