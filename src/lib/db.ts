import fs from 'fs';
import path from 'path';

const BUNDLED_DB = path.join(process.cwd(), 'data', 'db.json');
const RUNTIME_DB = '/tmp/db.json';

// In dev mode, use local data dir
const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL === '1';

interface Corretor {
  cpf: string;
  nome: string;
  nome_comercial: string;
  posicao: string;
  equipe: string;
  diretoria: string;
  praca: 'sp' | 'campinas';
}

interface Evento {
  id: number;
  external_id: string;
  corretor_cpf: string;
  tipo: string;
  pontos: number;
  multiplicador: number;
  empreendimento: string;
  produto: string;
  semana: string;
  data: string;
  detalhes: string;
}

export interface DB {
  corretores: Corretor[];
  eventos: Evento[];
  vgv: { sp: number; campinas: number };
  config: { admin_password: string };
  nextEventId: number;
}

function getDefaultDb(): DB {
  return { corretores: [], eventos: [], vgv: { sp: 0, campinas: 0 }, config: { admin_password: 'admin123' }, nextEventId: 1 };
}

export function readDb(): DB {
  const writePath = isProduction ? RUNTIME_DB : BUNDLED_DB;

  // If runtime file doesn't exist in production, copy from bundled
  if (isProduction && !fs.existsSync(RUNTIME_DB)) {
    try {
      if (fs.existsSync(BUNDLED_DB)) {
        fs.copyFileSync(BUNDLED_DB, RUNTIME_DB);
      } else {
        fs.writeFileSync(RUNTIME_DB, JSON.stringify(getDefaultDb()));
      }
    } catch (e) {
      // If can't write to /tmp, just read from bundled
      try {
        return JSON.parse(fs.readFileSync(BUNDLED_DB, 'utf-8'));
      } catch {
        return getDefaultDb();
      }
    }
  }

  const readPath = fs.existsSync(writePath) ? writePath : BUNDLED_DB;
  try {
    return JSON.parse(fs.readFileSync(readPath, 'utf-8'));
  } catch {
    return getDefaultDb();
  }
}

export function writeDb(db: DB): void {
  const writePath = isProduction ? RUNTIME_DB : BUNDLED_DB;
  try {
    fs.writeFileSync(writePath, JSON.stringify(db));
  } catch (e) {
    console.error('Failed to write DB:', e);
  }
}

export function normalizeCpf(cpf: string | undefined | null): string {
  if (!cpf) return '';
  return cpf.toString().replace(/[^\d]/g, '');
}

export function mapPraca(regional: string | undefined): 'sp' | 'campinas' {
  if (!regional) return 'sp';
  return regional.toLowerCase().includes('campinas') ? 'campinas' : 'sp';
}

export interface FaseInfo {
  nome: string;
  meta: number;
  percentual: number;
  premiacao: number;
}

export function getFases(praca: string): FaseInfo[] {
  if (praca === 'sp') {
    return [
      { nome: 'Fase de Grupos', meta: 70_000_000, percentual: 50, premiacao: 50_000 },
      { nome: '16 Avos', meta: 84_000_000, percentual: 60, premiacao: 60_000 },
      { nome: 'Oitavas', meta: 98_000_000, percentual: 70, premiacao: 70_000 },
      { nome: 'Quartas', meta: 112_000_000, percentual: 80, premiacao: 80_000 },
      { nome: 'Semifinal', meta: 126_000_000, percentual: 90, premiacao: 90_000 },
      { nome: 'Final', meta: 140_000_000, percentual: 100, premiacao: 100_000 },
    ];
  }
  return [
    { nome: 'Fase de Grupos', meta: 9_000_000, percentual: 50, premiacao: 17_000 },
    { nome: '16 Avos', meta: 11_000_000, percentual: 60, premiacao: 20_400 },
    { nome: 'Oitavas', meta: 12_600_000, percentual: 70, premiacao: 23_800 },
    { nome: 'Quartas', meta: 14_400_000, percentual: 80, premiacao: 27_200 },
    { nome: 'Semifinal', meta: 16_200_000, percentual: 90, premiacao: 30_600 },
    { nome: 'Final', meta: 18_000_000, percentual: 100, premiacao: 34_000 },
  ];
}
