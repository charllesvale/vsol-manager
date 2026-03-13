import React, { useState } from 'react';
import { Brain, AlertTriangle, AlertCircle, Info, CheckCircle, Loader2, RefreshCw, Wifi, WifiOff, BarChart3, Zap, Wrench } from 'lucide-react';
import { getAiAnalise } from '../services/api';

interface Insight {
  severidade: 'critico' | 'alerta' | 'aviso' | 'ok';
  tipo: string;
  titulo: string;
  descricao: string;
  acao: string;
  dados: Record<string, any>;
}

interface AIResult {
  ok: boolean;
  insights: Insight[];
  resumo: { total: number; online: number; uptime: number };
  gerado_em: string;
  message?: string;
}

const severidadeConfig = {
  critico: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    title: 'text-red-800',
    badge: 'bg-red-100 text-red-700 border-red-200',
    icon: AlertCircle,
    iconColor: 'text-red-500',
    label: 'CRÍTICO',
    acaoBg: 'bg-red-100 text-red-700',
  },
  alerta: {
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    title: 'text-orange-800',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    icon: AlertTriangle,
    iconColor: 'text-orange-500',
    label: 'ALERTA',
    acaoBg: 'bg-orange-100 text-orange-700',
  },
  aviso: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    title: 'text-yellow-800',
    badge: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: Info,
    iconColor: 'text-yellow-500',
    label: 'AVISO',
    acaoBg: 'bg-yellow-100 text-yellow-700',
  },
  ok: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    title: 'text-green-800',
    badge: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle,
    iconColor: 'text-green-500',
    label: 'OK',
    acaoBg: 'bg-green-100 text-green-700',
  },
};

const tipoLabel: Record<string, string> = {
  fibra_ou_splitter: 'Fibra / Splitter',
  splitter_parcial: 'Splitter Parcial',
  sinal_degradado: 'Sinal Degradado',
  sinal_instavel: 'Sinal Instável',
  cto_lotada: 'CTO Lotada',
  rede_saudavel: 'Rede Saudável',
};

export const AIPage: React.FC = () => {
  const [result, setResult] = useState<AIResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await getAiAnalise();
      if (r.ok) {
        setResult(r);
      } else {
        setError(r.message || 'Erro ao executar análise.');
      }
    } catch {
      setError('Erro de conexão com o servidor.');
    }
    setLoading(false);
  };

  const countBySeveridade = (sev: string) =>
    result?.insights.filter(i => i.severidade === sev).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-blue-500/20 p-3 rounded-xl border border-blue-400/30">
              <Brain size={28} className="text-blue-300" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Análise Inteligente de Rede</h1>
              <p className="text-slate-400 text-sm mt-0.5">
                Detecção automática de anomalias e análise de causa raiz — sem IA externa, 100% local.
              </p>
            </div>
          </div>
          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-95 shrink-0"
          >
            {loading ? (
              <><Loader2 size={18} className="animate-spin" /> Analisando...</>
            ) : (
              <><Zap size={18} /> Analisar Agora</>
            )}
          </button>
        </div>

        {/* Summary stats */}
        {result?.resumo && (
          <div className="mt-5 grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
              <BarChart3 size={20} className="text-blue-300 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Total ONUs</p>
                <p className="text-xl font-bold">{result.resumo.total}</p>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
              <Wifi size={20} className="text-green-300 shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Online</p>
                <p className="text-xl font-bold text-green-300">{result.resumo.online}</p>
              </div>
            </div>
            <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${result.resumo.uptime >= 95 ? 'bg-green-500/20' : result.resumo.uptime >= 80 ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}>
              {result.resumo.uptime >= 95 ? (
                <CheckCircle size={20} className="text-green-300 shrink-0" />
              ) : (
                <WifiOff size={20} className="text-red-300 shrink-0" />
              )}
              <div>
                <p className="text-xs text-slate-400">Uptime</p>
                <p className={`text-xl font-bold ${result.resumo.uptime >= 95 ? 'text-green-300' : result.resumo.uptime >= 80 ? 'text-yellow-300' : 'text-red-300'}`}>
                  {result.resumo.uptime}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle size={18} className="shrink-0" /> {error}
        </div>
      )}

      {/* Before first analysis */}
      {!result && !loading && !error && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Brain size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-600 mb-2">Pronto para analisar</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Clique em <strong>Analisar Agora</strong> para detectar anomalias, problemas de fibra, splitters com falha e ONUs com sinal instável.
          </p>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-xl mx-auto text-left">
            {[
              { icon: AlertCircle, color: 'text-red-400', label: 'Corte de fibra', desc: 'PONs com >80% offline' },
              { icon: AlertTriangle, color: 'text-orange-400', label: 'Splitter parcial', desc: 'Falhas em 30-80% da PON' },
              { icon: Info, color: 'text-yellow-400', label: 'Sinal degradado', desc: 'RX abaixo de -28 dBm' },
              { icon: RefreshCw, color: 'text-blue-400', label: 'Sinal instável', desc: 'Histórico 7 dias' },
            ].map(({ icon: Icon, color, label, desc }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3">
                <Icon size={20} className={`${color} mb-2`} />
                <p className="text-xs font-semibold text-slate-700">{label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <RefreshCw size={14} />
              <span>Gerado em {result.gerado_em}</span>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              {(['critico', 'alerta', 'aviso', 'ok'] as const).map(sev => {
                const cfg = severidadeConfig[sev];
                const count = countBySeveridade(sev);
                if (!count) return null;
                return (
                  <span key={sev} className={`flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${cfg.badge}`}>
                    {count} {cfg.label}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Insight cards */}
          <div className="space-y-4">
            {result.insights.map((insight, idx) => {
              const cfg = severidadeConfig[insight.severidade] ?? severidadeConfig.ok;
              const Icon = cfg.icon;
              return (
                <div key={idx} className={`rounded-2xl border-2 ${cfg.bg} ${cfg.border} overflow-hidden shadow-sm`}>
                  <div className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="shrink-0 mt-0.5">
                        <Icon size={22} className={cfg.iconColor} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                          <span className="text-[10px] text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                            {tipoLabel[insight.tipo] ?? insight.tipo}
                          </span>
                        </div>
                        <h3 className={`font-bold text-base leading-tight ${cfg.title}`}>{insight.titulo}</h3>
                        <p className="text-sm text-slate-600 mt-2 leading-relaxed">{insight.descricao}</p>

                        {/* Action box */}
                        <div className={`mt-3 rounded-xl px-4 py-3 flex items-start gap-2 ${cfg.acaoBg}`}>
                          <Wrench size={15} className="shrink-0 mt-0.5" />
                          <p className="text-sm font-medium">{insight.acao}</p>
                        </div>

                        {/* Technical data */}
                        {insight.dados && Object.keys(insight.dados).length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {Object.entries(insight.dados).map(([k, v]) => (
                              <span key={k} className="text-[11px] bg-white/70 border border-slate-200 px-2 py-1 rounded-lg text-slate-600">
                                <span className="font-semibold text-slate-500">{k}: </span>{String(v)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Re-analyze button */}
          <div className="flex justify-center pt-2">
            <button
              onClick={handleAnalyze}
              disabled={loading}
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-300 px-5 py-2.5 rounded-xl transition-all disabled:opacity-60"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
              Reanalisar
            </button>
          </div>
        </>
      )}
    </div>
  );
};
