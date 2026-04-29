import { NextRequest, NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cpf = req.nextUrl.searchParams.get('cpf');
  if (!cpf) return NextResponse.json({ error: 'CPF required' }, { status: 400 });

  const db = readDb();
  const corretor = db.corretores.find(c => c.cpf === cpf);
  if (!corretor) return NextResponse.json({ error: 'Corretor não encontrado' }, { status: 404 });

  const eventos = db.eventos.filter(e => e.corretor_cpf === cpf);
  const totalPontos = eventos.reduce((s, e) => s + e.pontos, 0);

  // Resumo by tipo
  const resumoMap = new Map<string, { tipo: string; total: number; quantidade: number }>();
  for (const e of eventos) {
    const r = resumoMap.get(e.tipo) || { tipo: e.tipo, total: 0, quantidade: 0 };
    r.total += e.pontos;
    r.quantidade++;
    resumoMap.set(e.tipo, r);
  }
  const resumo = Array.from(resumoMap.values()).sort((a, b) => b.total - a.total);

  return NextResponse.json({ corretor, eventos: eventos.slice(0, 50), resumo, totalPontos });
}
