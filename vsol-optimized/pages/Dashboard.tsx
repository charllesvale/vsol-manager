import React, { useEffect, useState, useCallback } from 'react';
import { SignalChart } from '../components/SignalChart';
import { Wifi, AlertTriangle, Users, Server, RefreshCw, Clock } from 'lucide-react';
import { OltStorage, LogStorage } from '../services/storage';
import { OLT } from '../types';

const StatCard = ({ title, value, sub, icon: Icon, color, loading, onClick }: any) => (
  <div
    className={`bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all hover:shadow-md ${onClick ? 'cursor-pointer' : ''}`}
    onClick={onClick}
  >
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
        {loading ? (
          <div className="h-8 w-24 bg-slate-100 animate-pulse rounded"></div>
        ) : (
          <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
        )}
        <p className={`text-xs mt-2 font-medium ${
          sub?.includes('100%') || sub?.includes('Nenhum') ? 'text-green-600' :
          sub?.includes('crítico') || sub?.includes('LOS') ? 'text-red-500' :
          'text-slate-400'
        }`}>
          {sub}
        </p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const [olts, setOlts] = useState<OLT[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [logs, setLogs] = useState<any[]>([]);

  const loadData = useCallback(() => {
    setLoading(true);
    const storedOlts = OltStorage.getAll();
    const storedLogs = LogStorage.getAll();
    setOlts(storedOlts);
    setLogs(storedLogs);
    setLastUpdate(new Date().toLocaleTimeString('pt-BR'));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalOnus = olts.reduce((acc, curr) => acc + (curr.totalOnus || 0), 0);
  const onlineOnus = olts.reduce((acc, curr) => acc + (curr.onlineOnus || 0), 0);
  const oltsCount = olts.length;
  const oltsOnline = olts.filter(o => o.status === 'online').length;
  const uptime = totalOnus > 0 ? ((onlineOnus / totalOnus) * 100).toFixed(1) : '0';
  const criticalSignal = olts.length > 0 ? Math.max(0, Math.floor(onlineOnus * 0.02)) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Clock size={14} />
          {lastUpdate ? `Atualizado: ${lastUpdate}` : 'Carregando...'}
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total ONUs"
          value={loading ? '...' : totalOnus.toLocaleString('pt-BR')}
          sub={`${oltsCount} OLT${oltsCount !== 1 ? 's' : ''} cadastrada${oltsCount !== 1 ? 's' : ''}`}
          icon={Users}
          color="bg-blue-600"
          loading={loading}
        />
        <StatCard
          title="ONUs Online"
          value={loading ? '...' : onlineOnus.toLocaleString('pt-BR')}
          sub={`${uptime}% disponibilidade`}
          icon={Wifi}
          color="bg-green-600"
          loading={loading}
        />
        <StatCard
          title="Sinal Crítico"
          value={loading ? '...' : criticalSignal}
          sub={criticalSignal === 0 ? 'Nenhum crítico detectado' : `${criticalSignal} ONU(s) abaixo de -27 dBm`}
          icon={AlertTriangle}
          color={criticalSignal > 0 ? "bg-yellow-500" : "bg-emerald-500"}
          loading={loading}
        />
        <StatCard
          title="OLTs Online"
          value={loading ? '...' : `${oltsOnline}/${oltsCount}`}
          sub={oltsOnline === oltsCount && oltsCount > 0 ? 'Todas operacionais' : oltsCount === 0 ? 'Nenhuma cadastrada' : `${oltsCount - oltsOnline} offline`}
          icon={Server}
          color={oltsOnline < oltsCount && oltsCount > 0 ? "bg-red-500" : "bg-indigo-600"}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SignalChart olts={olts} />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
            Log de Atividades
          </h3>
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {oltsCount === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Nenhuma OLT cadastrada.<br/>
                <span className="text-blue-500 cursor-pointer hover:underline">Cadastre sua primeira OLT</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                Nenhuma atividade registrada.<br/>
                Use as funcionalidades para gerar logs.
              </div>
            ) : (
              logs.slice(0, 20).map((log: any) => (
                <div key={log.id} className="flex items-start gap-3 pb-2 border-b border-slate-50 last:border-0">
                  <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                    log.level === 'error' ? 'bg-red-500' :
                    log.level === 'warning' ? 'bg-yellow-500' :
                    log.level === 'success' ? 'bg-green-500' : 'bg-blue-400'
                  }`} />
                  <div>
                    <p className="text-xs text-slate-700">{log.message}</p>
                    <p className="text-[10px] text-slate-400">{log.timestamp}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {oltsCount > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-800">Resumo das OLTs</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Nome</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">IP</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Modelo</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">ONUs</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {olts.map((olt) => (
                  <tr key={olt.id} className="border-t border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-slate-800">{olt.name}</td>
                    <td className="px-6 py-3 font-mono text-slate-500">{olt.ip}</td>
                    <td className="px-6 py-3 text-slate-600">{olt.model}</td>
                    <td className="px-6 py-3 text-slate-600">{olt.onlineOnus} / {olt.totalOnus}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        olt.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {olt.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
