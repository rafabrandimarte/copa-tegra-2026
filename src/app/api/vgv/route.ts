import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { praca, valor } = await req.json();
  const db = getDb();
  db.prepare('UPDATE vgv SET valor_atual = ?, updated_at = CURRENT_TIMESTAMP WHERE praca = ?').run(valor, praca);
  return NextResponse.json({ success: true });
}

export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM vgv').all();
  return NextResponse.json(rows);
}
