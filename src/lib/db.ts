import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'copa.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initDb(db);
  }
  return db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS corretores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cpf TEXT UNIQUE,
      nome TEXT NOT NULL,
      nome_comercial TEXT,
      posicao TEXT,
      equipe TEXT NOT NULL,
      diretoria TEXT,
      praca TEXT NOT NULL CHECK(praca IN ('sp', 'campinas')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS eventos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE,
      corretor_cpf TEXT NOT NULL,
      tipo TEXT NOT NULL,
      pontos REAL NOT NULL,
      multiplicador REAL DEFAULT 1.0,
      empreendimento TEXT,
      produto TEXT,
      semana TEXT,
      data TEXT,
      detalhes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vgv (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      praca TEXT NOT NULL UNIQUE,
      valor_atual REAL NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    INSERT OR IGNORE INTO vgv (praca, valor_atual) VALUES ('sp', 0);
    INSERT OR IGNORE INTO vgv (praca, valor_atual) VALUES ('campinas', 0);

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    INSERT OR IGNORE INTO config (key, value) VALUES ('admin_password', 'admin123');

    CREATE INDEX IF NOT EXISTS idx_eventos_cpf ON eventos(corretor_cpf);
    CREATE INDEX IF NOT EXISTS idx_eventos_tipo ON eventos(tipo);
    CREATE INDEX IF NOT EXISTS idx_corretores_praca ON corretores(praca);
  `);
}

// Pontuação por empreendimento/SAP (da aba Premissas)
const PONTUACAO_EMPREENDIMENTO: Record<string, number> = {
  'ALENZA CAMBUÍ': 250,
  'ÁRIA HIGIENÓPOLIS': 100,
  'BEM MOEMA': 100,
  'BUENO BRANDÃO 257': 250,
  'ELO': 50, 'ELO 2 CAMINHOS DA LAPA': 50,
  'ELO DUO CAMINHOS DA LAPA': 100,
  "D'ORU": 250,
  'DSG ITAIM': 250,
  'GRAVURA PERDIZES': 250,
  'SOMA PERDIZES': 100,
  'TEG - SACOMÃ': 250, 'TEG SACOMÃ': 250,
  'TEG MOOCA': 50,
  'UNIVERSO TATUAPÉ - ESFERA': 50, 'ESFERA': 50,
  'UNIVERSO TATUAPÉ - ÓRBITA': 100, 'ÓRBITA': 100,
  'YARD CAMBUÍ': 100,
  'ZAHLE JARDINS': 250,
  'YPY ALTO DO IPIRANGA': 250,
  'LUCE CAMBUÍ': 250,
  'VISTA HORIZONTE': 50,
  'AMPÈRE BROOKLIN': 250,
  'LAZUR MANSÕES': 50, 'LAZUR': 50,
  'MOZAE HIGIENÓPOLIS': 250,
  'CAPITOLO BY PIERO LISSONI': 250, 'CAPITOLO': 250,
  'GARDEN DESIGN': 50, 'GARDEN DESIGN PRIVATE PARK RESIDENCE': 50,
  'NOVA VIVERE CAMINHOS DA LAPA': 50, 'NOVA VIVERE': 50,
  'RESERVA': 50,
  'CHÂTEAU JARDIN': 50, 'CHATEAU JARDIN': 50,
  'TIÈL': 250, 'TIÈL VILA NOVA CONCEIÇÃO': 250, 'TIEL': 250,
};

export function getPontuacaoVenda(empreendimento: string): number {
  if (!empreendimento) return 50;
  const emp = empreendimento.trim().toUpperCase();
  // Direct match
  for (const [key, pts] of Object.entries(PONTUACAO_EMPREENDIMENTO)) {
    if (emp.includes(key.toUpperCase())) return pts;
  }
  return 50; // default
}

export function mapPraca(regional: string | undefined): 'sp' | 'campinas' {
  if (!regional) return 'sp';
  const r = regional.toLowerCase();
  if (r.includes('campinas')) return 'campinas';
  return 'sp';
}

export function normalizeCpf(cpf: string | undefined | null): string {
  if (!cpf) return '';
  return cpf.toString().replace(/[^\d]/g, '');
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
