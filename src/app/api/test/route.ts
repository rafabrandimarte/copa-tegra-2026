import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const cwd = process.cwd();
  const dirname = __dirname;
  const candidates = [
    path.join(cwd, 'data', 'db.json'),
    path.join(cwd, '..', 'data', 'db.json'),
    path.join(dirname, 'data', 'db.json'),
    path.join(dirname, '..', 'data', 'db.json'),
    path.join(dirname, '..', '..', 'data', 'db.json'),
    path.join(dirname, '..', '..', '..', 'data', 'db.json'),
    '/var/task/data/db.json',
    '/var/task/.next/server/data/db.json',
  ];
  
  const results: Record<string, boolean> = {};
  for (const p of candidates) {
    results[p] = fs.existsSync(p);
  }

  // Also list files in cwd and dirname
  let cwdFiles: string[] = [];
  let dirnameFiles: string[] = [];
  try { cwdFiles = fs.readdirSync(cwd); } catch {}
  try { dirnameFiles = fs.readdirSync(dirname); } catch {}

  return NextResponse.json({ cwd, dirname, candidates: results, cwdFiles, dirnameFiles });
}
