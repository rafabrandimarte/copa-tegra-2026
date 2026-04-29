'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Artilheiro {
  cpf: string;
  nome: string;
  gerente: string;
  diretoria: string;
  pontos: number;
  total_eventos: number;
}

interface Selecao {
  gerente: string;
  diretoria: string;
  pontos: number;
  total_corretores: number;
}

interface FaseInfo {
  nome: string;
  meta: number;
  percentual: number;
  premiacao: number;
}

interface RankingData {
  artilheiros: Artilheiro[];
  selecoes: Selecao[];
  fases: FaseInfo[];
  vgvAtual: number;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v);

const formatMM = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(0)} MM`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)} mil`;
  return `R$ ${v}`;
};

function MedalIcon({ pos }: { pos: number }) {
  if (pos === 1) return <span className="text-2xl">🥇</span>;
  if (pos === 2) return <span className="text-2xl">🥈</span>;
  if (pos === 3) return <span className="text-2xl">🥉</span>;
  return <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center font-display text-sm text-white/40">{pos}</span>;
}

function PhaseProgress({ fases, vgvAtual }: { fases: FaseInfo[]; vgvAtual: number }) {
  const metaFinal = fases[fases.length - 1]?.meta || 1;
  const progresso = Math.min((vgvAtual / metaFinal) * 100, 100);
  const faseAtualIdx = fases.findIndex(f => vgvAtual < f.meta);
  const faseAtual = faseAtualIdx === -1 ? fases.length - 1 : faseAtualIdx;

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <span className="font-display text-sm text-white/60 uppercase tracking-wider">Progresso da Copa</span>
        <span className="font-score text-xl text-copa-yellow">{progresso.toFixed(1)}%</span>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 bg-white/5 rounded-full overflow-hidden mb-6">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: 'linear-gradient(90deg, #00A651, #FFD700)' }}
          initial={{ width: 0 }}
          animate={{ width: `${progresso}%` }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
        {/* Phase markers */}
        {fases.map((f, i) => {
          const pos = (f.meta / metaFinal) * 100;
          return (
            <div key={i} className="absolute top-0 h-full w-0.5 bg-white/20" style={{ left: `${pos}%` }} />
          );
        })}
      </div>

      {/* Phase labels */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {fases.map((f, i) => {
          const isCompleted = vgvAtual >= f.meta;
          const isCurrent = i === faseAtual;
          return (
            <motion.div
              key={i}
              className={`text-center p-3 rounded-lg transition-all ${
                isCompleted ? 'phase-completed bg-copa-yellow/10' : isCurrent ? 'phase-active bg-copa-green/10' : 'bg-white/[0.02]'
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="font-display text-xs uppercase tracking-wider text-white/50 mb-1">{f.nome}</div>
              <div className={`font-score text-lg ${isCompleted ? 'text-copa-yellow' : isCurrent ? 'text-copa-green' : 'text-white/30'}`}>
                {f.percentual}%
              </div>
              <div className="text-[10px] text-white/30 mt-1">{formatMM(f.meta)}</div>
              {isCompleted && <div className="text-xs text-copa-yellow mt-1">⚽ {formatCurrency(f.premiacao)}</div>}
            </motion.div>
          );
        })}
      </div>

      <div className="mt-4 text-center">
        <span className="text-white/40 text-sm">VGV Atual: </span>
        <span className="font-score text-2xl text-copa-green">{formatCurrency(vgvAtual)}</span>
      </div>
    </div>
  );
}

function RankingTable({ data, type, onCorretorClick }: { data: Artilheiro[] | Selecao[]; type: 'artilheiros' | 'selecoes'; onCorretorClick?: (cpf: string) => void }) {
  return (
    <div className="space-y-1">
      {(data as any[]).map((item: any, i: number) => {
        const pos = i + 1;
        const podiumClass = pos === 1 ? 'podium-1' : pos === 2 ? 'podium-2' : pos === 3 ? 'podium-3' : '';
        return (
          <motion.div
            key={i}
            className={`ranking-row flex items-center gap-4 px-4 py-3 rounded-lg ${podiumClass} ${pos > 3 ? 'bg-white/[0.02]' : ''} ${type === 'artilheiros' ? 'cursor-pointer' : ''}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05, duration: 0.3 }}
            onClick={() => type === 'artilheiros' && onCorretorClick && onCorretorClick((item as Artilheiro).cpf)}
          >
            <div className="w-10 flex-shrink-0 flex justify-center">
              <MedalIcon pos={pos} />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`font-display text-base truncate ${pos <= 3 ? 'text-white' : 'text-white/70'}`}>
                {type === 'artilheiros' ? (item as Artilheiro).nome : (item as Selecao).gerente}
              </div>
              {type === 'artilheiros' && (
                <div className="text-xs text-white/30 truncate">
                  {(item as Artilheiro).gerente} • {(item as Artilheiro).total_eventos} eventos
                </div>
              )}
              {type === 'selecoes' && (
                <div className="text-xs text-white/30 truncate">
                  {(item as Selecao).total_corretores} corretores • Dir. {(item as Selecao).diretoria}
                </div>
              )}
            </div>
            <div className="flex-shrink-0 text-right">
              <div className={`font-score text-xl ${pos === 1 ? 'text-copa-yellow' : pos <= 3 ? 'text-white' : 'text-white/60'}`}>
                {item.pontos}
              </div>
              <div className="text-[10px] text-white/30 uppercase">pts</div>
            </div>
          </motion.div>
        );
      })}
      {data.length === 0 && (
        <div className="text-center text-white/30 py-12 font-body">
          Nenhuma pontuação registrada ainda.<br />
          <span className="text-copa-yellow/50">O jogo está prestes a começar! ⚽</span>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [praca, setPraca] = useState<'sp' | 'campinas'>('sp');
  const [tab, setTab] = useState<'artilheiros' | 'selecoes'>('artilheiros');
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [corretorDetail, setCorretorDetail] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/rankings?praca=${praca}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [praca]);

  const openCorretorDetail = async (cpf: string) => {
    const res = await fetch(`/api/corretor?cpf=${cpf}`);
    if (res.ok) {
      const detail = await res.json();
      setCorretorDetail(detail);
      setShowDetail(true);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen relative">
      {/* Hero Header */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-copa-blue/30 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-4 pt-8 pb-6">
          {/* Logo area with Tegrito */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
            <motion.div
              className="w-32 h-32 md:w-44 md:h-44 flex-shrink-0"
              initial={{ opacity: 0, x: -40, rotate: -10 }}
              animate={{ opacity: 1, x: 0, rotate: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <img
                src="/images/tegrito.jpg"
                alt="Tegrito - Mascote Copa Tegra 2026"
                className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(255,215,0,0.3)]"
              />
            </motion.div>
            <motion.div
              className="text-center mb-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight">
                <span className="gold-shimmer">COPA TEGRA</span>
              </h1>
              <div className="font-score text-3xl md:text-4xl text-copa-green mt-1">2026</div>
              <p className="font-body text-white/40 text-sm mt-2 tracking-widest uppercase">
                Jogue, Pontue e Conquiste a Taça
              </p>
              <p className="text-xs text-white/20 mt-1">Tegra Vendas</p>
            </motion.div>
          </div>

          {/* City selector */}
          <motion.div
            className="flex justify-center gap-2 mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {(['sp', 'campinas'] as const).map(p => (
              <button
                key={p}
                onClick={() => setPraca(p)}
                className={`px-6 py-2.5 rounded-full font-display text-sm uppercase tracking-wider transition-all ${
                  praca === p
                    ? 'bg-copa-green text-white shadow-lg shadow-copa-green/20'
                    : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60'
                }`}
              >
                {p === 'sp' ? '🏟️ São Paulo' : '🏟️ Campinas'}
              </button>
            ))}
          </motion.div>
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-4 pb-16">
        {/* Phase progress */}
        {data && (
          <motion.section
            className="mb-10 p-6 rounded-2xl bg-white/[0.02] border border-white/5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <PhaseProgress fases={data.fases} vgvAtual={data.vgvAtual} />
          </motion.section>
        )}

        {/* Artilheiro da semana highlight */}
        {data && data.artilheiros.length > 0 && (
          <motion.section
            className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-copa-yellow/10 via-copa-yellow/5 to-transparent border border-copa-yellow/20"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 flex-shrink-0">
                <img src="/images/tegrito.jpg" alt="Tegrito" className="w-full h-full object-contain" />
                <div className="absolute -top-1 -right-1 text-lg">🏆</div>
              </div>
              <div>
                <div className="text-xs text-copa-yellow/60 font-display uppercase tracking-wider">Artilheiro Líder</div>
                <div className="font-display text-xl text-copa-yellow">{data.artilheiros[0].nome}</div>
                <div className="text-xs text-white/30">
                  Seleção {data.artilheiros[0].gerente} • {data.artilheiros[0].pontos} pts
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-white/[0.02] rounded-xl p-1">
          {(['artilheiros', 'selecoes'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 rounded-lg font-display text-sm uppercase tracking-wider transition-all ${
                tab === t
                  ? 'bg-copa-green/20 text-copa-green border border-copa-green/30'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              {t === 'artilheiros' ? '⚽ Artilheiros' : '🏴 Seleções'}
            </button>
          ))}
        </div>

        {/* Rankings */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="w-16 h-16 mx-auto ball-bounce mb-4">
                <img src="/images/tegrito.jpg" alt="Tegrito" className="w-full h-full object-contain" />
              </div>
              <p className="text-white/30 font-body">Carregando rankings...</p>
            </motion.div>
          ) : data ? (
            <motion.div
              key={`${praca}-${tab}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <RankingTable
                data={tab === 'artilheiros' ? data.artilheiros : data.selecoes}
                type={tab}
                onCorretorClick={openCorretorDetail}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* Premiação info */}
        {data && (
          <motion.section
            className="mt-12 p-6 rounded-2xl bg-white/[0.02] border border-white/5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <h3 className="font-display text-lg text-copa-yellow mb-4 uppercase tracking-wider">💰 Premiação</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-4 rounded-lg bg-copa-green/5 border border-copa-green/10">
                <div className="text-copa-green font-score text-2xl">68%</div>
                <div className="text-white/40 mt-1">Corretores</div>
              </div>
              <div className="p-4 rounded-lg bg-copa-blue/10 border border-copa-blue/20">
                <div className="text-blue-400 font-score text-2xl">32%</div>
                <div className="text-white/40 mt-1">Gerentes</div>
              </div>
            </div>
            <div className="mt-4 text-center text-white/20 text-xs">
              Premiação não cumulativa • Divisão por fase atingida
            </div>
          </motion.section>
        )}

        {/* Pontuação reference */}
        <motion.section
          className="mt-8 p-6 rounded-2xl bg-white/[0.02] border border-white/5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <h3 className="font-display text-lg text-white/60 mb-4 uppercase tracking-wider">📋 Como Pontuar</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            {[
              { acao: 'Roleta', pts: '5', icon: '🎯' },
              { acao: 'Escala ON', pts: '5', icon: '📅' },
              { acao: 'Treinamento', pts: '10', icon: '📚' },
              { acao: 'Indicação', pts: '20', icon: '🤝' },
              { acao: 'Retorno', pts: '20', icon: '📞' },
              { acao: 'Venda', pts: '50', icon: '💰' },
              { acao: 'Bola de Ouro', pts: '2x', icon: '🟡' },
              { acao: 'Golaço', pts: '250', icon: '⚽' },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-white/[0.02]">
                <div className="text-xl mb-1">{item.icon}</div>
                <div className="font-score text-lg text-copa-yellow">{item.pts}</div>
                <div className="text-[10px] text-white/40 uppercase">{item.acao}</div>
              </div>
            ))}
          </div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="relative text-center py-8 border-t border-white/5">
        <div className="flex justify-center mb-3">
          <img src="/images/tegrito.jpg" alt="Tegrito" className="w-12 h-12 object-contain opacity-40" />
        </div>
        <div className="text-white/20 text-xs">
          Copa Tegra 2026 • Tegra Vendas • Abril — Maio 2026
        </div>
        <div className="text-white/10 text-[10px] mt-1">Tegrito está torcendo por você! ⚽</div>
      </footer>

      {/* Corretor Detail Modal */}
      <AnimatePresence>
        {showDetail && corretorDetail && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDetail(false)} />
            <motion.div
              className="relative w-full sm:max-w-lg max-h-[85vh] overflow-y-auto bg-copa-dark border border-white/10 rounded-t-2xl sm:rounded-2xl p-6"
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
            >
              <button onClick={() => setShowDetail(false)} className="absolute top-4 right-4 text-white/40 hover:text-white text-xl">✕</button>

              <div className="flex items-center gap-4 mb-6">
                <img src="/images/tegrito.jpg" alt="Tegrito" className="w-14 h-14 object-contain" />
                <div>
                  <h2 className="font-display text-xl text-copa-yellow">
                    {corretorDetail.corretor.nome_comercial || corretorDetail.corretor.nome}
                  </h2>
                  <p className="text-xs text-white/40">
                    {corretorDetail.corretor.equipe} • Dir. {corretorDetail.corretor.diretoria} • {corretorDetail.corretor.praca === 'sp' ? 'São Paulo' : 'Campinas'}
                  </p>
                </div>
              </div>

              <div className="text-center mb-6 p-4 rounded-xl bg-copa-yellow/10 border border-copa-yellow/20">
                <div className="font-score text-4xl text-copa-yellow">{corretorDetail.totalPontos}</div>
                <div className="text-xs text-white/40 uppercase font-display tracking-wider">Pontos Totais</div>
              </div>

              {/* Resumo por tipo */}
              <h3 className="font-display text-sm text-white/50 uppercase tracking-wider mb-3">Resumo por Ação</h3>
              <div className="grid grid-cols-2 gap-2 mb-6">
                {corretorDetail.resumo.map((r: any, i: number) => {
                  const icons: Record<string, string> = {
                    roleta: '🎯', venda: '💰', indicação: '🤝', indicacao: '🤝',
                    retorno: '📞', oferta: '📋', treinamento: '📚', escala_on: '📅',
                  };
                  return (
                    <div key={i} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{icons[r.tipo] || '⚽'}</span>
                        <span className="text-xs text-white/50 capitalize">{r.tipo}</span>
                      </div>
                      <div className="font-score text-lg text-copa-green">{r.total} <span className="text-xs text-white/30">pts</span></div>
                      <div className="text-[10px] text-white/20">{r.quantidade}x</div>
                    </div>
                  );
                })}
              </div>

              {/* Eventos list */}
              <h3 className="font-display text-sm text-white/50 uppercase tracking-wider mb-3">Últimos Eventos</h3>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {corretorDetail.eventos.slice(0, 50).map((e: any, i: number) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] text-sm">
                    <div>
                      <span className="text-white/60 capitalize">{e.tipo}</span>
                      {e.empreendimento && <span className="text-white/30 text-xs ml-2">{e.empreendimento}</span>}
                    </div>
                    <span className="font-score text-copa-yellow">{e.pontos}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
