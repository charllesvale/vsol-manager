import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Search, Filter, Wifi, WifiOff, AlertCircle, Signal, Clock, Download } from 'lucide-react';
import { ONU, SignalLevel, getSignalLevelFromConfig } from '../types';
import { ConfigStorage, OltStorage, LogStorage } from '../services/storage';
import { listOnus } from '../services/api';

// ── Configuração visual dos status ────────────────────────────────────────────

const SIGNAL_CARDS = [
  { key: 'nulo',   label: 'Nulo',        bg: 'bg-gray-700',   text: 'text-white', icon: AlertCircle },
  { key: 'los',    label: 'LOS/Offline', bg: 'bg-red-600',    text: 'text-white', icon: WifiOff },
  { key: 'manual', label: 'Desligada',   bg: 'bg-slate-600',  text: 'text-white', icon: Wifi },
  { key: 'bom',    label: 'RX Bom',      bg: 'bg-green-600',  text: 'text-white', icon: Signal },
  { key: 'limite', label: 'RX Limite',   bg: 'bg-yellow-600', text: 'text-white', icon: Signal },
  { key: 'ruim',   label: 'RX Ruim',     bg: 'bg-orange-600', text: 'text-white', icon: Signal },
] as const;

type CardFilter = (typeof SIGNAL_CARDS)[number]['key'] | 'all';

function getRxBadge(rx: number, config: ReturnType<typeof ConfigStorage.get>) {
  const level = getSignalLevelFromConfig(rx, config);
  const map: Record<SignalLevel, { color: string; text: string }> = {
    bom:    { color: 'bg-green-100 text-green-700',   text: `${rx} dBm` },
    limite: { color: 'bg-yellow-100 text-yellow-700', text: `${rx} dBm` },
    ruim:   { color: 'bg-orange-100 text-orange-700', text: `${rx} dBm` },
    los:    { color: 'bg-red-100 text-red-700',        text: 'LOS' },
    nulo:   { color: 'bg-gray-100 text-gray-600',      text: '---' },
  };
  return map[level];
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'online':    return 'bg-green-100 text-green-700';
    case 'offline':   return 'bg-red-100 text-red-600';
    case 'los':       return 'bg-red-100 text-red-700';
    case 'nulo':      return 'bg-gray-100 text-gray-500';
    case 'desligada': return 'bg-slate-100 text-slate-500';
    default:          return 'bg-gray-100 text-gray-500';
  }
}

// ── Dados demo quando banco não configurado ───────────────────────────────────

const DEMO_ONUS: ONU[] = [
  { id: '1', serialNumber: 'HWTC1A2B3C4D', name: 'DEMO - João Silva',   brand: 'Huawei',    oltId: '1', ponPort: 1, signalRx: -19.5, signalTx: 2.1, status: 'online',  ip: '192.168.1.101', vlan: 100 },
  { id: '2', serialNumber: 'ZTEG5E6F7G8H', name: 'DEMO - Maria Santos', brand: 'ZTE',       oltId: '1', ponPort: 1, signalRx: -24.8, signalTx: 2.0, status: 'online',  ip: '192.168.1.102', vlan: 100 },
  { id: '3', serialNumber: 'VSOL9I0J1K2L', name: 'DEMO - Pedro Costa',  brand: 'VSOL',      oltId: '1', ponPort: 2, signalRx: -28.1, signalTx: 1.8, status: 'offline', ip: '',              vlan: 200 },
  { id: '4', serialNumber: 'FHTT3M4N5O6P', name: 'DEMO - Ana Lima',     brand: 'Fiberhome', oltId: '1', ponPort: 2, signalRx: -32.5, signalTx: 1.5, status: 'los',    ip: '',              vlan: 200 },
  { id: '5', serialNumber: 'INTB7Q8R9S0T', name: 'DEMO - Carlos Souza', brand: 'Intelbras', oltId: '1', ponPort: 3, signalRx: 0,     signalTx: 0,   status: 'nulo',   ip: '',              vlan: 300 },
];

// ── Componente ────────────────────────────────────────────────────────────────

export const ONUList: React.FC = () => {
  const [onus, setOnus] = useState<ONU[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [lastUpdate, setLastUpdate] = useState('');
  const [search, setSearch] = useState('');
  const [cardFilter, setCardFilter] = useState<CardFilter>('all');
  const [oltFilter, setOltFilter] = useState('all');
  const [ponFilter, setPonFilter] = useState('all');
  const [page, setPage] = useState(1);

  const config = ConfigStorage.get();
  const olts = OltStorage.getAll();
  const perPage = config.registrosPorPagina ?? 30;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listOnus();
      if (res.ok && res.onus.length > 0) {
        setOnus(res.onus as ONU[]);
        setIsDemo(false);
        LogStorage.add('info', `${res.total} ONUs carregadas do banco de dados.`);
      } else if (!res.ok) {
        setOnus(DEMO_ONUS);
        setIsDemo(true);
        setError(res.message ?? 'Banco não configurado.');
      } else {
        setOnus([]);
        setIsDemo(false);
      }
    } catch (e: any) {
      // API PHP não disponível (dev mode) — usa demo
      setOnus(DEMO_ONUS);
      setIsDemo(true);
      setError('API backend não disponível. Exibindo dados de demonstração.');
    }
    setLastUpdate(new Date().toLocaleTimeString('pt-BR'));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Contadores por categoria
  const counts = useMemo(() => {
    const c = { nulo: 0, los: 0, manual: 0, bom: 0, limite: 0, ruim: 0 };
    onus.forEach(o => {
      const lvl = getSignalLevelFromConfig(o.signalRx, config);
      if (o.status === 'desligada' || o.status === 'offline') c.manual++;
      else if (lvl === 'nulo') c.nulo++;
      else if (lvl === 'los') c.los++;
      else if (lvl === 'bom') c.bom++;
      else if (lvl === 'limite') c.limite++;
      else if (lvl === 'ruim') c.ruim++;
    });
    return c;
  }, [onus, config]);

  // ONUs únicas de PONs disponíveis para filtro
  const ponOptions = useMemo(() => {
    const ports = [...new Set(onus.map(o => o.ponPort))].sort((a, b) => a - b);
    return ports;
  }, [onus]);

  // Filtro + busca
  const filtered = useMemo(() => {
    let list = [...onus];

    if (cardFilter !== 'all') {
      list = list.filter(o => {
        const lvl = getSignalLevelFromConfig(o.signalRx, config);
        if (cardFilter === 'nulo') return lvl === 'nulo';
        if (cardFilter === 'los') return lvl === 'los';
        if (cardFilter === 'manual') return o.status === 'desligada' || o.status === 'offline';
        if (cardFilter === 'bom') return lvl === 'bom';
        if (cardFilter === 'limite') return lvl === 'limite';
        if (cardFilter === 'ruim') return lvl === 'ruim';
        return true;
      });
    }

    if (oltFilter !== 'all') list = list.filter(o => o.oltId === oltFilter);
    if (ponFilter !== 'all') list = list.filter(o => String(o.ponPort) === ponFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        o.serialNumber.toLowerCase().includes(q) ||
        o.name.toLowerCase().includes(q) ||
        (o.ip ?? '').includes(q) ||
        (o.brand ?? '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [onus, cardFilter, oltFilter, ponFilter, search, config]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const resetFilters = () => {
    setCardFilter('all');
    setOltFilter('all');
    setPonFilter('all');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-4">

      {/* Banner demo/erro */}
      {isDemo && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-800 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-yellow-600" />
          <span>{error} Configure em <strong>Configurações → Banco de Dados</strong>.</span>
        </div>
      )}

      {/* Cards de status */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {SIGNAL_CARDS.map(card => {
          const Icon = card.icon;
          const count = counts[card.key as keyof typeof counts] ?? 0;
          const active = cardFilter === card.key;
          return (
            <button key={card.key}
              onClick={() => { setCardFilter(active ? 'all' : card.key as CardFilter); setPage(1); }}
              className={`${card.bg} ${card.text} rounded-xl p-4 text-left transition-all ${active ? 'ring-4 ring-white ring-opacity-50 scale-105 shadow-xl' : 'hover:opacity-90 hover:shadow-md'}`}
            >
              <Icon size={20} className="mb-2 opacity-80" />
              <p className="text-2xl font-bold leading-none">{count}</p>
              <p className="text-xs mt-1 opacity-90">| {card.label}</p>
            </button>
          );
        })}
      </div>

      {/* Barra de ações */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          {/* Busca */}
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input type="text" placeholder="Buscar por SN, nome, IP..."
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>

          {/* Filtros */}
          <div className="flex gap-2 flex-wrap">
            <select value={oltFilter} onChange={e => { setOltFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Todas OLTs</option>
              {olts.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>

            <select value={ponFilter} onChange={e => { setPonFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">Todos PONs</option>
              {ponOptions.map(p => <option key={p} value={String(p)}>PON {p}</option>)}
            </select>

            {(cardFilter !== 'all' || oltFilter !== 'all' || ponFilter !== 'all' || search) && (
              <button onClick={resetFilters}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-1">
                <Filter size={14} /> Limpar
              </button>
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-2 items-center">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock size={12} /> {lastUpdate}
            </span>
            <button onClick={load} disabled={loading}
              className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Atualizar
            </button>
          </div>
        </div>

        {/* Contador */}
        <div className="mt-3 text-xs text-slate-400">
          Exibindo {paginated.length} de {filtered.length} ONUs
          {filtered.length !== onus.length && ` (${onus.length} total)`}
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase w-8">-</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">RX</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">SN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Descrição / Login</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">OLT / PON / VLAN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">IP</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Marca</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-slate-100 animate-pulse rounded" style={{ width: j === 4 ? '140px' : '70px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16 text-slate-400">
                    <Signal size={36} className="mx-auto mb-3 opacity-20" />
                    <p className="font-medium">Nenhum registro cadastrado!</p>
                    {(search || cardFilter !== 'all') && (
                      <button onClick={resetFilters} className="mt-2 text-blue-500 text-sm hover:underline">
                        Limpar filtros
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginated.map((onu, idx) => {
                  const rxBadge = getRxBadge(onu.signalRx, config);
                  const oltName = olts.find(o => o.id === onu.oltId)?.name ?? onu.oltId;
                  return (
                    <tr key={onu.id} className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/30'}`}>
                      <td className="px-4 py-3 text-slate-400 text-xs">{(page - 1) * perPage + idx + 1}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusBadge(onu.status)}`}>
                          {onu.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${rxBadge.color}`}>
                          {rxBadge.text}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{onu.serialNumber}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs truncate">{onu.name || '—'}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        <span className="font-medium text-slate-700">{oltName}</span>
                        <span className="mx-1 text-slate-300">/</span>
                        PON {onu.ponPort}
                        {onu.vlan > 0 && <><span className="mx-1 text-slate-300">/</span>VLAN {onu.vlan}</>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{onu.ip || '—'}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{onu.brand}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500">Página {page} de {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 text-xs rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">«</button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1 text-xs rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">‹ Ant</button>
              {/* Páginas ao redor */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = Math.max(1, Math.min(totalPages - 4, page - 2)) + i;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={`px-3 py-1 text-xs rounded border ${pg === page ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 hover:bg-slate-50'}`}>
                    {pg}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-3 py-1 text-xs rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">Próx ›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-2 py-1 text-xs rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">»</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
