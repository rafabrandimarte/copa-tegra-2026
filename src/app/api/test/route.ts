import { NextResponse } from 'next/server';
import seedData from '@/lib/seed-data.json';

export async function GET() {
  return NextResponse.json({ 
    ok: true, 
    corretores: (seedData as any).corretores?.length ?? 0,
    eventos: (seedData as any).eventos?.length ?? 0 
  });
}
