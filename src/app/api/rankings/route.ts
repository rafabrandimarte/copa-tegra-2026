import { NextRequest, NextResponse } from 'next/server';
import { readDb, getFases } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const praca = req.nextUrl.searchParams.get('praca') || 'sp';
  const db = readDb();

  // Filter corretores by praca (exclude managers)
  const corretoresPraca = db.corretores.filter(c =>
    c.praca === praca &&
    !['Gerente de Vendas', 'Diretor de Vendas', 'Superintendente Online'].includes(c.posicao)
  );

  // Artilheiros: sum eventos per corretor
  const artilheiros = corretoresPraca.map(c => {
    const eventos = db.eventos.filter(e => e.corretor_cpf === c.cpf);
    const pontos = eventos.reduce((s, e) => s + e.pontos, 0);
    return {
      cpf: c.cpf,
      nome: c.nome_comercial || c.nome,
      gerente: c.equipe,
      diretoria: c.diretoria,
      pontos,
      total_eventos: eventos.length,
    };
  }).filter(a => a.pontos > 0).sort((a, b) => b.pontos - a.pontos);

  // Selecoes: calculate manager points per rules
  // Roleta: 10pts (seg-sab) or 20pts (dom) per DAY with >=5 corretores
  // Indicação: 20pts each, Retorno: 20pts each
  // Venda: 50pts * multiplicador, Golaço: 250pts * multiplicador
  const equipeMap = new Map<string, { gerente: string; diretoria: string; corretores: Set<string> }>();
  for (const c of corretoresPraca) {
    if (!equipeMap.has(c.equipe)) {
      equipeMap.set(c.equipe, { gerente: c.equipe, diretoria: c.diretoria, corretores: new Set() });
    }
    equipeMap.get(c.equipe)!.corretores.add(c.cpf);
  }

  const selecoes = Array.from(equipeMap.entries()).map(([equipe, eq]) => {
    const cpfs = eq.corretores;
    const eventosEquipe = db.eventos.filter(e => cpfs.has(e.corretor_cpf));
    let pontos = 0;

    // Roleta: group by date, count distinct corretores per day, award if >=5
    const roletaPorDia = new Map<string, Set<string>>();
    for (const e of eventosEquipe) {
      if (e.tipo === 'roleta') {
        const dia = e.data || 'unknown';
        if (!roletaPorDia.has(dia)) roletaPorDia.set(dia, new Set());
        roletaPorDia.get(dia)!.add(e.corretor_cpf);
      }
    }
    for (const [dia, cpfsNoDia] of Array.from(roletaPorDia.entries())) {
      if (cpfsNoDia.size >= 5) {
        // Check if Sunday (try to parse date)
        let isDomingo = false;
        try {
          const parts = dia.split(/[\/\-]/);
          let dateObj: Date | null = null;
          if (parts.length === 3) {
            // Try DD/MM/YYYY or YYYY-MM-DD
            if (parts[0].length === 4) dateObj = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
            else dateObj = new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
          }
          if (dateObj && dateObj.getDay() === 0) isDomingo = true;
        } catch {}
        pontos += isDomingo ? 20 : 10;
      }
    }

    // Indicação e Retorno: 20pts each
    for (const e of eventosEquipe) {
      if (e.tipo === 'indicação' || e.tipo === 'indicacao') pontos += 20;
      else if (e.tipo === 'retorno') pontos += 20;
    }

    // Venda: 50pts * mult for regular, 250pts * mult for Golaço empreendimentos
    const GOLACO_EMPREENDIMENTOS = [
      'ALENZA CAMBUÍ', 'BUENO BRANDÃO 257', 'D\'ORU', 'DSG ITAIM',
      'GRAVURA PERDIZES', 'TEG - SACOMÃ', 'TEG SACOMÃ', 'ZAHLE JARDINS',
      'YPY ALTO DO IPIRANGA', 'LUCE CAMBUÍ', 'AMPÈRE BROOKLIN', 'AMPERE BROOKLIN',
      'MOZAE HIGIENÓPOLIS', 'MOZAE HIGIENOPOLIS', 'CAPITOLO BY PIERO LISSONI',
      'NOVA VIVERE CAMINHOS DA LAPA',
    ];
    for (const e of eventosEquipe) {
      if (e.tipo === 'venda') {
        const empUpper = (e.empreendimento || '').toUpperCase();
        const isGolaco = GOLACO_EMPREENDIMENTOS.some(g => empUpper.includes(g.toUpperCase()));
        pontos += (isGolaco ? 250 : 50) * (e.multiplicador || 1);
      }
    }

    // TODO: if Golaço list changes, update GOLACO_EMPREENDIMENTOS above

    return { gerente: eq.gerente, diretoria: eq.diretoria, pontos, total_corretores: cpfs.size };
  }).filter(s => s.pontos > 0).sort((a, b) => b.pontos - a.pontos);

  const vgvAtual = praca === 'sp' ? db.vgv.sp : db.vgv.campinas;

  return NextResponse.json({
    artilheiros,
    selecoes,
    fases: getFases(praca),
    vgvAtual,
    stats: {
      totalCorretores: corretoresPraca.length,
      totalEventos: db.eventos.filter(e => corretoresPraca.some(c => c.cpf === e.corretor_cpf)).length,
    },
  });
}
