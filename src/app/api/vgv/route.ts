import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { praca, valor } = await req.json();
  const db = readDb();
  if (praca === 'sp') db.vgv.sp = valor;
  else db.vgv.campinas = valor;
  writeDb(db);
  return NextResponse.json({ success: true });
}

export async function GET() {
  const db = readDb();
  return NextResponse.json([
    { praca: 'sp', valor_atual: db.vgv.sp },
    { praca: 'campinas', valor_atual: db.vgv.campinas },
  ]);
}
