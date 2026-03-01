import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { OLT } from '../types';

interface SignalChartProps {
  olts: OLT[];
}

const getSignalQuality = (avgOnline: number, total: number) => {
  if (total === 0) return null;
  const ratio = avgOnline / total;
  // Simulate signal based on ratio (higher ratio = better signal)
  return -18 - (1 - ratio) * 9; // range -18 to -27 dBm
};

export const SignalChart: React.FC<SignalChartProps> = ({ olts }) => {
  const data = useMemo(() => {
    const now = new Date();
    const points = [];

    for (let i = 6; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 2 * 60 * 60 * 1000);
      const label = `${t.getHours().toString().padStart(2, '0')}:00`;

      let rx = -18.5;
      if (olts.length > 0) {
        const totalOnline = olts.reduce((a, b) => a + b.onlineOnus, 0);
        const totalAll = olts.reduce((a, b) => a + b.totalOnus, 0);
        const base = getSignalQuality(totalOnline, totalAll);
        if (base !== null) {
          // Add slight variation per time point
          const noise = (Math.sin(i * 1.3) * 0.8);
          rx = parseFloat((base + noise).toFixed(2));
        }
      } else {
        rx = parseFloat((-18.5 + Math.sin(i * 0.9) * 0.5).toFixed(2));
      }

      points.push({ time: label, rx });
    }

    return points;
  }, [olts]);

  const avgRx = data.length > 0 ? (data.reduce((a, b) => a + b.rx, 0) / data.length).toFixed(1) : 'N/A';
  const isWarning = parseFloat(avgRx) < -24;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800">Histórico de Sinal (Média PON)</h3>
        <span className={`text-sm font-bold px-2 py-1 rounded-full ${isWarning ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
          Média: {avgRx} dBm
        </span>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRx" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isWarning ? "#ef4444" : "#3b82f6"} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={isWarning ? "#ef4444" : "#3b82f6"} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
          <YAxis domain={[-30, -10]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
          <ReferenceLine y={-27} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Crítico', position: 'right', fill: '#ef4444', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
            formatter={(value: number) => [`${value} dBm`, 'Sinal RX']}
          />
          <Area type="monotone" dataKey="rx" stroke={isWarning ? "#ef4444" : "#3b82f6"} fillOpacity={1} fill="url(#colorRx)" strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
