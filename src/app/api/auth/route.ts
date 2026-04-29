import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const db = readDb();
  if (password === db.config.admin_password) {
    return NextResponse.json({ success: true, token: 'copa-tegra-admin-2026' });
  }
  return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
}
