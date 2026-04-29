import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST() {
  const db = getDb();

  const sampleCorretores = [
    { nome: 'Lucas Mendes', selecao: 'Brasil', gerente: 'Carlos Silva', praca: 'sp' },
    { nome: 'Ana Beatriz', selecao: 'Brasil', gerente: 'Carlos Silva', praca: 'sp' },
    { nome: 'Pedro Henrique', selecao: 'Argentina', gerente: 'Maria Santos', praca: 'sp' },
    { nome: 'Juliana Costa', selecao: 'Argentina', gerente: 'Maria Santos', praca: 'sp' },
    { nome: 'Rafael Oliveira', selecao: 'Alemanha', gerente: 'Roberto Lima', praca: 'sp' },
    { nome: 'Fernanda Rocha', selecao: 'Alemanha', gerente: 'Roberto Lima', praca: 'sp' },
    { nome: 'Thiago Alves', selecao: 'França', gerente: 'Patricia Souza', praca: 'sp' },
    { nome: 'Camila Ferreira', selecao: 'França', gerente: 'Patricia Souza', praca: 'sp' },
    { nome: 'Diego Martins', selecao: 'Espanha', gerente: 'Andre Ramos', praca: 'campinas' },
    { nome: 'Larissa Nunes', selecao: 'Espanha', gerente: 'Andre Ramos', praca: 'campinas' },
    { nome: 'Bruno Cardoso', selecao: 'Itália', gerente: 'Claudia Dias', praca: 'campinas' },
    { nome: 'Mariana Ribeiro', selecao: 'Itália', gerente: 'Claudia Dias', praca: 'campinas' },
  ];

  const insertC = db.prepare('INSERT OR IGNORE INTO corretores (nome, selecao, gerente, praca) VALUES (?, ?, ?, ?)');
  const getC = db.prepare('SELECT id FROM corretores WHERE nome = ? AND praca = ?');
  const insertP = db.prepare('INSERT INTO pontuacoes (corretor_id, acao, pontos, empreendimento, peso, semana) VALUES (?, ?, ?, ?, ?, ?)');
  const insertS = db.prepare('INSERT INTO selecoes_pontuacoes (gerente, praca, acao, pontos, empreendimento, peso, semana) VALUES (?, ?, ?, ?, ?, ?, ?)');

  const acoes = [
    { acao: 'roleta', pontos: 5 },
    { acao: 'escala_on', pontos: 5 },
    { acao: 'treinamento', pontos: 10 },
    { acao: 'indicacao', pontos: 20 },
    { acao: 'retorno', pontos: 20 },
    { acao: 'venda', pontos: 50, emp: 'Elo' },
    { acao: 'venda', pontos: 50, emp: 'Ária Higienópolis' },
    { acao: 'golaco', pontos: 250, emp: 'Tièl' },
  ];

  const acoesSelecao = [
    { acao: 'roleta_seg_sab', pontos: 10 },
    { acao: 'roleta_domingo', pontos: 20 },
    { acao: 'indicacao', pontos: 20 },
    { acao: 'retorno', pontos: 20 },
    { acao: 'venda', pontos: 50, emp: 'Soma Perdizes' },
  ];

  const transaction = db.transaction(() => {
    // Clear existing data
    db.exec('DELETE FROM pontuacoes; DELETE FROM selecoes_pontuacoes; DELETE FROM corretores;');

    for (const c of sampleCorretores) {
      insertC.run(c.nome, c.selecao, c.gerente, c.praca);
      const row = getC.get(c.nome, c.praca) as any;
      if (!row) continue;

      // Random subset of actions for each corretor
      const numAcoes = 3 + Math.floor(Math.random() * 5);
      for (let i = 0; i < numAcoes; i++) {
        const a = acoes[Math.floor(Math.random() * acoes.length)];
        const peso = a.emp?.includes('Ária') ? 2 : 1;
        insertP.run(row.id, a.acao, a.pontos, a.emp || null, peso, 'sem1');
      }
    }

    // Selecoes
    const seen = new Set<string>();
    for (const c of sampleCorretores) {
      const g = { gerente: c.gerente, praca: c.praca };
      const key = `${g.gerente}-${g.praca}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const numAcoes = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < numAcoes; i++) {
        const a = acoesSelecao[Math.floor(Math.random() * acoesSelecao.length)];
        const peso = a.emp?.includes('Soma') ? 2 : 1;
        insertS.run(g.gerente, g.praca, a.acao, a.pontos, a.emp || null, peso, 'sem1');
      }
    }

    // Set sample VGV
    db.prepare('UPDATE vgv SET valor_atual = ? WHERE praca = ?').run(82_000_000, 'sp');
    db.prepare('UPDATE vgv SET valor_atual = ? WHERE praca = ?').run(10_500_000, 'campinas');
  });

  transaction();
  return NextResponse.json({ success: true, message: 'Dados de exemplo inseridos!' });
}
