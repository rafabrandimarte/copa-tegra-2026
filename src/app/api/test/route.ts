import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export async function GET() {
  try {
    const db = readDb();
    return NextResponse.json({ 
      ok: true, 
      corretores: db.corretores.length,
      eventos: db.eventos.length 
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
