import { NextRequest, NextResponse } from 'next/server';
import { getDb, getFases } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const praca = req.nextUrl.searchParams.get('praca') || 'sp';
  const db = getDb();

  // Artilheiros: corretores with sum of all their eventos
  const artilheiros = db.prepare(`
    SELECT
      c.cpf,
      COALESCE(c.nome_comercial, c.nome) as nome,
      c.equipe as gerente,
      c.diretoria,
      COALESCE(SUM(e.pontos), 0) as pontos,
      COUNT(e.id) as total_eventos
    FROM corretores c
    LEFT JOIN eventos e ON e.corretor_cpf = c.cpf
    WHERE c.praca = ?
      AND (c.posicao IS NULL OR c.posicao NOT IN ('Gerente de Vendas', 'Diretor de Vendas', 'Superintendente Online'))
    GROUP BY c.cpf
    HAVING pontos > 0
    ORDER BY pontos DESC
  `).all(praca);

  // Seleções: sum by equipe (gerente)
  const selecoes = db.prepare(`
    SELECT
      c.equipe as gerente,
      c.diretoria,
      COALESCE(SUM(e.pontos), 0) as pontos,
      COUNT(DISTINCT c.cpf) as total_corretores
    FROM corretores c
    LEFT JOIN eventos e ON e.corretor_cpf = c.cpf
    WHERE c.praca = ?
      AND (c.posicao IS NULL OR c.posicao NOT IN ('Gerente de Vendas', 'Diretor de Vendas', 'Superintendente Online'))
    GROUP BY c.equipe
    HAVING pontos > 0
    ORDER BY pontos DESC
  `).all(praca);

  // VGV
  const vgv = db.prepare('SELECT valor_atual FROM vgv WHERE praca = ?').get(praca) as any;

  // Stats
  const totalCorretores = db.prepare('SELECT COUNT(*) as c FROM corretores WHERE praca = ?').get(praca) as any;
  const totalEventos = db.prepare(`
    SELECT COUNT(*) as c FROM eventos e
    JOIN corretores c ON c.cpf = e.corretor_cpf
    WHERE c.praca = ?
  `).get(praca) as any;

  return NextResponse.json({
    artilheiros,
    selecoes,
    fases: getFases(praca),
    vgvAtual: vgv?.valor_atual || 0,
    stats: {
      totalCorretores: totalCorretores?.c || 0,
      totalEventos: totalEventos?.c || 0,
    },
  });
}
