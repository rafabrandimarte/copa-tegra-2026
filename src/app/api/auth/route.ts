import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  const db = getDb();
  const config = db.prepare("SELECT value FROM config WHERE key = 'admin_password'").get() as any;

  if (password === (config?.value || 'admin123')) {
    return NextResponse.json({ success: true, token: 'copa-tegra-admin-2026' });
  }
  return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
}
