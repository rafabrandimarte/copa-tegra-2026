import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const seedData = require('@/lib/seed-data.json');
    return NextResponse.json({ 
      ok: true, 
      corretores: seedData?.corretores?.length ?? 0,
      eventos: seedData?.eventos?.length ?? 0 
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
