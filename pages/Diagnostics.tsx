import React, { useState } from 'react';
import { Activity, AlertCircle, CheckCircle2, AlertTriangle, TrendingDown, TrendingUp, Minus, Info, RefreshCw } from 'lucide-react';
import { OltStorage, LogStorage } from '../services/storage';

interface DiagnosticResult {
  status: 'excelente' | 'bom' | 'marginal' | 'critico' | 'los';
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  Icon: React.ComponentType<any>;
  rxAnalysis: string;
  txAnalysis: string;
  distanceAnalysis: string;
  possibleCauses: string[];
  recommendations: string[];
  budgetOk: boolean;
}

function analyzeSignal(rx: number, tx: number, distance: number): DiagnosticResult {
  const budget = tx - rx;
  const expectedAttenuation = (distance / 1000) * 0.35;
  const margin = budget - expectedAttenuation;

  let status: DiagnosticResult['status'];
  let label: string;
  let color: string;
  let bgColor: string;
  let borderColor: string;
  let Icon: React.ComponentType<any>;
  let rxAnalysis: string;

  if (rx === 0 || rx < -40) {
    status = 'los'; label = 'LOS — Sem Sinal'; color = 'text-red-700';
    bgColor = 'bg-red-50'; borderColor = 'border-red-300'; Icon = AlertCircle;
    rxAnalysis = 'Nenhum sinal detectado. A ONU está em estado LOS (Loss of Signal). Verifique se a fibra está conectada e se a ONU está energizada.';
  } else if (rx >= -8 && rx <= -18) {
    status = 'excelente'; label = 'Excelente'; color = 'text-green-700';
    bgColor = 'bg-green-50'; borderColor = 'border-green-300'; Icon = TrendingUp;
    rxAnalysis = `RX ${rx} dBm dentro da faixa ideal (-8 a -18 dBm). Sinal ótimo, sem degradação esperada.`;
  } else if (rx > -18 && rx <= -24) {
    status = 'bom'; label = 'Bom'; color = 'text-blue-700';
    bgColor = 'bg-blue-50'; borderColor = 'border-blue-300'; Icon = CheckCircle2;
    rxAnalysis = `RX ${rx} dBm dentro da faixa aceitável (-18 a -24 dBm). Sinal estável para operação normal.`;
  } else if (rx > -24 && rx <= -27) {
    status = 'marginal'; label = 'Marginal'; color = 'text-yellow-700';
    bgColor = 'bg-yellow-50'; borderColor = 'border-yellow-300'; Icon = AlertTriangle;
    rxAnalysis = `RX ${rx} dBm na zona marginal (-24 a -27 dBm). Próximo ao limiar mínimo. Risco de instabilidade em temperatura alta ou oscilações de rede.`;
  } else {
    status = 'critico'; label = 'Crítico'; color = 'text-red-700';
    bgColor = 'bg-red-50'; borderColor = 'border-red-300'; Icon = TrendingDown;
    rxAnalysis = `RX ${rx} dBm abaixo do limiar mínimo aceitável (-27 dBm). A ONU pode desconectar a qualquer momento. Intervenção técnica imediata necessária.`;
  }

  const txAnalysis =
    tx >= 0.5 && tx <= 5
      ? `TX +${tx} dBm dentro do padrão (0.5 a 5 dBm). Laser da ONU operacional.`
      : tx < 0.5
      ? `TX ${tx} dBm abaixo do mínimo. Laser da ONU pode estar degradado ou com falha de alimentação.`
      : `TX +${tx} dBm acima do esperado. Verifique se o atenuador óptico está presente e íntegro.`;

  const distanceAnalysis =
    distance > 20000
      ? `Distância de ${distance}m excede o limite máximo GPON de 20km. Redesenho do projeto necessário.`
      : margin > 6
      ? `Budget ${budget.toFixed(1)} dB com ${distance}m. Atenuação esperada ~${expectedAttenuation.toFixed(1)} dB. Margem de ${margin.toFixed(1)} dB — folga confortável para splitters e emendas.`
      : margin > 2
      ? `Budget ${budget.toFixed(1)} dB com ${distance}m. Margem de ${margin.toFixed(1)} dB — razoável, monitore periodicamente.`
      : `Budget ${budget.toFixed(1)} dB com ${distance}m. Margem de ${margin.toFixed(1)} dB — insuficiente. Risco de instabilidade com variações de temperatura.`;

  const possibleCauses: string[] = [];
  const recommendations: string[] = [];

  if (status === 'los') {
    possibleCauses.push('Patch cord desconectado ou partido');
    possibleCauses.push('ONU desligada ou sem alimentação elétrica');
    possibleCauses.push('Conector SC/APC sujo ou oxidado');
    possibleCauses.push('Porta do splitter com defeito');
    recommendations.push('Verificar conexão física do patch cord na ONU e na caixa de emenda/splitter');
    recommendations.push('Testar continuidade da fibra com caneta óptica (VFL)');
    recommendations.push('Limpar conectores com álcool isopropílico 99% e swab óptico');
  } else if (status === 'critico' || status === 'marginal') {
    possibleCauses.push('Conector SC/APC sujo ou mal encaixado — causa de até 70% dos casos');
    possibleCauses.push('Emenda por fusão com alta perda (> 0.1 dB)');
    possibleCauses.push('Micro-curvatura ou dobramento da fibra (raio mínimo: 3cm)');
    possibleCauses.push('Splitter degradado ou porta de alta perda');
    if (distance > 8000) possibleCauses.push('Distância elevada consumindo o budget óptico disponível');
    possibleCauses.push('Oxidação ou sujeira em adaptadores SC/APC da caixa CTO/CEO');
    recommendations.push('Limpar TODOS os conectores do trecho com kit de limpeza óptica');
    recommendations.push('Medir com OTDR para localizar pontos de alta perda no trecho');
    if (status === 'critico') {
      recommendations.push('Substituir patch cord da ONU — testar com um novo antes de chamar técnico de campo');
      recommendations.push('Verificar e refazer emendas por fusão com perda > 0.1 dB');
    }
    recommendations.push('Checar se há curvas fechadas na passagem da fibra');
    if (distance > 10000) recommendations.push('Considerar substituir splitter por razão menor (ex: 1:16 → 1:8)');
  } else {
    recommendations.push('Nenhuma ação corretiva necessária no momento');
    recommendations.push('Monitore o sinal periodicamente para detectar degradação gradual');
    if (status === 'bom') recommendations.push('Realize limpeza preventiva dos conectores a cada 12 meses');
  }

  return { status, label, color, bgColor, borderColor, Icon, rxAnalysis, txAnalysis, distanceAnalysis, possibleCauses, recommendations, budgetOk: budget >= 28 };
}

const PRESETS = [
  { label: 'ONU Ideal', rx: -16, tx: 2.5, dist: 2000 },
  { label: 'ONU OK', rx: -21, tx: 2.0, dist: 4500 },
  { label: 'ONU Marginal', rx: -25.5, tx: 1.8, dist: 8000 },
  { label: 'ONU Crítica', rx: -28.5, tx: 1.5, dist: 12000 },
  { label: 'ONU LOS', rx: -45, tx: 0, dist: 3000 },
];

export const Diagnostics: React.FC = () => {
  const [rx, setRx] = useState(-22);
  const [tx, setTx] = useState(2.0);
  const [distance, setDistance] = useState(3000);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [clientName, setClientName] = useState('');
  const olts = OltStorage.getAll();

  const handleAnalyze = () => {
    const r = analyzeSignal(rx, tx, distance);
    setResult(r);
    const prefix = clientName ? `[${clientName}] ` : '';
    LogStorage.add(
      r.status === 'critico' || r.status === 'los' ? 'error' : r.status === 'marginal' ? 'warning' : 'success',
      `${prefix}Diagnóstico: ${r.label} — RX: ${rx} dBm | TX: +${tx} dBm | ${distance}m`
    );
  };

  const budget = tx - rx;
  const expectedAtt = ((distance / 1000) * 0.35);
  const ResultIcon = result ? result.Icon : Minus;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Form */}
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-full bg-indigo-100 text-indigo-600 mb-4">
            <Activity size={32} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Diagnóstico de Sinal Óptico</h2>
          <p className="text-slate-500 mt-2 text-sm">
            Análise técnica local baseada nos padrões GPON ITU-T G.984. Funciona 100% offline, sem internet.
          </p>
        </div>

        {/* Presets */}
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Cenários Rápidos</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button key={p.label}
                onClick={() => { setRx(p.rx); setTx(p.tx); setDistance(p.dist); setResult(null); }}
                className="px-3 py-1.5 text-xs rounded-full border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-colors">
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Cliente e OLT */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cliente / Identificação (opcional)</label>
            <input type="text" placeholder="Nome do cliente ou endereço..."
              value={clientName} onChange={e => setClientName(e.target.value)}
              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">OLT de Referência (opcional)</label>
            <select className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
              <option value="">-- Selecionar OLT --</option>
              {olts.map(o => <option key={o.id} value={o.id}>{o.name} — {o.ip}</option>)}
            </select>
          </div>
        </div>

        {/* Valores de sinal */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">RX Power (dBm)</label>
            <input type="number" step="0.1" value={rx}
              onChange={e => { setRx(parseFloat(e.target.value)); setResult(null); }}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-center text-lg font-bold" />
            <p className="text-xs text-slate-400 mt-1 text-center">Sinal recebido na ONU</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">TX Power (dBm)</label>
            <input type="number" step="0.1" value={tx}
              onChange={e => { setTx(parseFloat(e.target.value)); setResult(null); }}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-center text-lg font-bold" />
            <p className="text-xs text-slate-400 mt-1 text-center">Transmissão da ONU</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Distância (metros)</label>
            <input type="number" step="100" min={0} value={distance}
              onChange={e => { setDistance(parseInt(e.target.value) || 0); setResult(null); }}
              className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-center text-lg font-bold" />
            <p className="text-xs text-slate-400 mt-1 text-center">Estimativa da fibra</p>
          </div>
        </div>

        {/* Budget preview */}
        <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 flex flex-wrap items-center gap-6 text-sm mb-6">
          <span className="flex items-center gap-2">
            <Info size={14} className="text-slate-400" />
            <span className="text-slate-500">Link Budget:</span>
            <strong className="font-mono text-slate-800">{budget.toFixed(1)} dB</strong>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-slate-500">Atenuação esperada:</span>
            <span className="font-mono text-slate-700">{expectedAtt.toFixed(2)} dB</span>
          </span>
          <span className="flex items-center gap-2">
            <span className="text-slate-500">Margem:</span>
            <strong className={`font-mono ${(budget - expectedAtt) > 3 ? 'text-green-600' : 'text-red-500'}`}>
              {(budget - expectedAtt).toFixed(2)} dB
            </strong>
          </span>
        </div>

        <button onClick={handleAnalyze}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20">
          <RefreshCw size={18} /> Analisar Sinal
        </button>
      </div>

      {/* Resultado */}
      {result && (
        <div className={`rounded-xl shadow-sm border-2 ${result.borderColor} ${result.bgColor} overflow-hidden`}>
          <div className={`px-8 py-5 flex items-center gap-4 border-b ${result.borderColor}`}>
            <div className="p-3 rounded-full bg-white shadow-sm">
              <ResultIcon size={28} className={result.color} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Resultado do Diagnóstico</p>
              <h3 className={`text-2xl font-bold ${result.color}`}>{result.label}</h3>
              {clientName && <p className="text-sm text-slate-500 mt-0.5">Cliente: {clientName}</p>}
            </div>
            <div className="ml-auto text-right text-sm text-slate-500">
              <p>RX: <strong className="font-mono">{rx} dBm</strong></p>
              <p>TX: <strong className="font-mono">+{tx} dBm</strong></p>
              <p>Distância: <strong className="font-mono">{distance}m</strong></p>
            </div>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { title: 'Análise RX', text: result.rxAnalysis },
                { title: 'Análise TX', text: result.txAnalysis },
                { title: 'Distância / Budget', text: result.distanceAnalysis },
              ].map(({ title, text }) => (
                <div key={title} className="bg-white rounded-lg p-4 border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">{title}</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            {result.possibleCauses.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg p-5 border border-slate-100">
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <AlertTriangle size={16} className="text-yellow-500" /> Possíveis Causas
                  </h4>
                  <ul className="space-y-2">
                    {result.possibleCauses.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="w-5 h-5 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white rounded-lg p-5 border border-slate-100">
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-green-500" /> Recomendações
                  </h4>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className={`flex items-center gap-2 text-sm px-4 py-3 rounded-lg border ${result.budgetOk ? 'bg-green-50 border-green-200 text-green-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
              {result.budgetOk
                ? <><CheckCircle2 size={16} /> Budget de {budget.toFixed(1)} dB adequado para classe B+ GPON (mínimo 28 dB).</>
                : <><AlertTriangle size={16} /> Budget de {budget.toFixed(1)} dB abaixo do mínimo B+ GPON (28 dB). Verifique splitters e qualidade do trecho.</>
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
