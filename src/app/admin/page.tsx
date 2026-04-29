'use client';

import { useState, useEffect, useCallback } from 'react';

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [vgvSp, setVgvSp] = useState(0);
  const [vgvCampinas, setVgvCampinas] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [uploadLog, setUploadLog] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAuthenticated(sessionStorage.getItem('copa-admin') === 'true');
    }
  }, []);

  const loadData = useCallback(async () => {
    const res = await fetch('/api/vgv');
    const data = await res.json();
    for (const v of data) {
      if (v.praca === 'sp') setVgvSp(v.valor_atual);
      if (v.praca === 'campinas') setVgvCampinas(v.valor_atual);
    }
    const spData = await fetch('/api/rankings?praca=sp').then(r => r.json());
    const campData = await fetch('/api/rankings?praca=campinas').then(r => r.json());
    setStats({
      sp: { artilheiros: spData.artilheiros.length, selecoes: spData.selecoes.length, corretores: spData.stats?.totalCorretores || 0, eventos: spData.stats?.totalEventos || 0 },
      campinas: { artilheiros: campData.artilheiros.length, selecoes: campData.selecoes.length, corretores: campData.stats?.totalCorretores || 0, eventos: campData.stats?.totalEventos || 0 },
    });
  }, []);

  useEffect(() => {
    if (authenticated) loadData();
  }, [authenticated, loadData]);

  const handleLogin = async () => {
    setError('');
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      sessionStorage.setItem('copa-admin', 'true');
      setAuthenticated(true);
    } else {
      setError('Senha incorreta');
    }
  };

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setUploading(true);
    const form = e.currentTarget;
    const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
    if (!fileInput.files?.length) { setUploading(false); return; }

    const results: string[] = [];
    for (let i = 0; i < fileInput.files.length; i++) {
      const file = fileInput.files[i];
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        results.push(`✅ ${file.name}: ${data.message} (tipo: ${data.tipo})`);
      } else {
        results.push(`❌ ${file.name}: ${data.error}`);
      }
    }

    setUploadLog(results);
    setMessage(results.every(r => r.startsWith('✅')) ? '✅ Todos os arquivos importados!' : '⚠️ Alguns arquivos tiveram erro');
    setUploading(false);
    loadData();
    fileInput.value = '';
  };

  const handleVgvUpdate = async (p: string, valor: number) => {
    await fetch('/api/vgv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ praca: p, valor }),
    });
    setMessage(`✅ VGV ${p.toUpperCase()} atualizado!`);
  };

  // Login screen
  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <img src="/images/tegrito.jpg" alt="Tegrito" className="w-20 h-20 object-contain mx-auto mb-3" />
            <h1 className="font-display text-3xl gold-shimmer">COPA TEGRA</h1>
            <p className="text-white/30 text-sm mt-2">Painel Administrativo</p>
          </div>
          <div className="admin-card rounded-2xl p-6">
            <label className="block text-sm text-white/40 mb-2 font-display uppercase tracking-wider">Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-copa-green transition"
              placeholder="Digite a senha de admin"
            />
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
            <button
              onClick={handleLogin}
              className="w-full mt-4 py-3 rounded-lg bg-copa-green text-white font-display uppercase tracking-wider hover:bg-copa-green/80 transition"
            >
              Entrar
            </button>
            <p className="text-center text-white/20 text-xs mt-4">Senha padrão: admin123</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-white/5 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/images/tegrito.jpg" alt="Tegrito" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="font-display text-xl text-copa-yellow">COPA TEGRA 2026</h1>
              <p className="text-white/30 text-xs">Painel Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a href="/" className="text-sm text-white/40 hover:text-white/60 transition">← Ver Ranking</a>
            <button
              onClick={() => { sessionStorage.removeItem('copa-admin'); setAuthenticated(false); }}
              className="text-sm text-red-400/60 hover:text-red-400 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Status message */}
        {message && (
          <div className={`p-4 rounded-lg border text-sm ${message.includes('✅') ? 'bg-copa-green/10 border-copa-green/20 text-copa-green' : 'bg-orange-500/10 border-orange-500/20 text-orange-400'}`}>
            {message}
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="admin-card rounded-xl p-4">
              <div className="text-xs text-white/30 uppercase font-display">Corretores SP</div>
              <div className="font-score text-3xl text-copa-yellow mt-1">{stats.sp.corretores}</div>
              <div className="text-[10px] text-white/20">{stats.sp.eventos} eventos</div>
            </div>
            <div className="admin-card rounded-xl p-4">
              <div className="text-xs text-white/30 uppercase font-display">Seleções SP</div>
              <div className="font-score text-3xl text-blue-400 mt-1">{stats.sp.selecoes}</div>
            </div>
            <div className="admin-card rounded-xl p-4">
              <div className="text-xs text-white/30 uppercase font-display">Corretores CPS</div>
              <div className="font-score text-3xl text-copa-yellow mt-1">{stats.campinas.corretores}</div>
              <div className="text-[10px] text-white/20">{stats.campinas.eventos} eventos</div>
            </div>
            <div className="admin-card rounded-xl p-4">
              <div className="text-xs text-white/30 uppercase font-display">Seleções CPS</div>
              <div className="font-score text-3xl text-blue-400 mt-1">{stats.campinas.selecoes}</div>
            </div>
          </div>
        )}

        {/* Upload section */}
        <section className="admin-card rounded-2xl p-6">
          <h2 className="font-display text-lg text-white/80 uppercase tracking-wider mb-4">📤 Upload de Planilhas</h2>
          <p className="text-sm text-white/30 mb-4">O sistema detecta automaticamente o tipo de planilha. Você pode enviar várias de uma vez.</p>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs text-white/40 mb-1 uppercase">Arquivos (.xlsx)</label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                multiple
                className="w-full text-sm text-white/60 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-copa-green/20 file:text-copa-green file:cursor-pointer hover:file:bg-copa-green/30"
              />
            </div>

            <div className="text-xs text-white/20 p-4 rounded-lg bg-white/[0.02] space-y-2">
              <div className="text-white/40 font-display uppercase text-xs mb-2">Planilhas aceitas:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-copa-green">●</span>
                  <span><strong className="text-white/40">Base de Corretores</strong> — Unidade, Nome, Equipe, Diretoria, CPF</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-copa-yellow">●</span>
                  <span><strong className="text-white/40">Vendas</strong> — Corretor, Empreendimento, Multip, Pontuação</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">●</span>
                  <span><strong className="text-white/40">Roleta</strong> — Corretor, Período, Pontuação, Semana</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">●</span>
                  <span><strong className="text-white/40">Visitas</strong> — Corretor, Tipo Visita, Produto</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-orange-400">●</span>
                  <span><strong className="text-white/40">Oferta</strong> — Corretor, Produto, Pontuação</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2.5 rounded-lg bg-copa-green text-white font-display uppercase tracking-wider hover:bg-copa-green/80 transition disabled:opacity-50"
            >
              {uploading ? 'Importando...' : 'Importar Planilhas'}
            </button>
          </form>

          {/* Upload log */}
          {uploadLog.length > 0 && (
            <div className="mt-4 space-y-1">
              {uploadLog.map((log, i) => (
                <div key={i} className={`text-xs px-3 py-2 rounded-lg ${log.startsWith('✅') ? 'bg-copa-green/5 text-copa-green' : 'bg-red-500/5 text-red-400'}`}>
                  {log}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* VGV Update */}
        <section className="admin-card rounded-2xl p-6">
          <h2 className="font-display text-lg text-white/80 uppercase tracking-wider mb-4">📊 Atualizar VGV</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs text-white/40 mb-1 uppercase">VGV São Paulo (R$)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={vgvSp}
                  onChange={e => setVgvSp(Number(e.target.value))}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-copa-green"
                />
                <button
                  onClick={() => handleVgvUpdate('sp', vgvSp)}
                  className="px-4 py-2.5 rounded-lg bg-copa-blue text-white text-sm hover:bg-copa-blue/80 transition"
                >
                  Salvar
                </button>
              </div>
              <p className="text-[10px] text-white/20 mt-1">Meta final: R$ 140.000.000</p>
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1 uppercase">VGV Campinas (R$)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={vgvCampinas}
                  onChange={e => setVgvCampinas(Number(e.target.value))}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-copa-green"
                />
                <button
                  onClick={() => handleVgvUpdate('campinas', vgvCampinas)}
                  className="px-4 py-2.5 rounded-lg bg-copa-blue text-white text-sm hover:bg-copa-blue/80 transition"
                >
                  Salvar
                </button>
              </div>
              <p className="text-[10px] text-white/20 mt-1">Meta final: R$ 18.000.000</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
