import React, { useState, useEffect } from 'react';
import { Send, CheckCircle, XCircle, Bell, BellOff, Wifi, WifiOff, AlertTriangle, BarChart2, Loader2 } from 'lucide-react';
import { ConfigStorage, OltStorage, LogStorage } from '../services/storage';
import { testTelegram, sendTelegramAlert } from '../services/api';
import { AppConfig, OLT } from '../types';

const AlertCard = ({ icon: Icon, title, desc, color, onClick, loading }: any) => (
  <button onClick={onClick} disabled={loading}
    className={`w-full text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${color} flex items-start gap-4`}>
    <div className="p-2 rounded-lg bg-white/50 shrink-0">
      {loading ? <Loader2 size={20} className="animate-spin" /> : <Icon size={20} />}
    </div>
    <div>
      <p className="font-semibold text-sm">{title}</p>
      <p className="text-xs opacity-70 mt-0.5">{desc}</p>
    </div>
  </button>
);

export const TelegramPage: React.FC = () => {
  const [config, setConfig]     = useState<AppConfig>(ConfigStorage.get());
  const [olts, setOlts]         = useState<OLT[]>([]);
  const [testing, setTesting]   = useState(false);
  const [sending, setSending]   = useState<string | null>(null);
  const [result, setResult]     = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    setOlts(OltStorage.getAll());
  }, []);

  const showResult = (ok: boolean, msg: string) => {
    setResult({ ok, msg });
    setTimeout(() => setResult(null), 5000);
  };

  const handleTest = async () => {
    if (!config.telegramToken || !config.telegramChatId) {
      showResult(false, 'Configure o Token e o ID do Chat primeiro em Configurações.');
      return;
    }
    setTesting(true);
    try {
      const res = await testTelegram(config.telegramToken, config.telegramChatId);
      showResult(res.ok, res.message);
      LogStorage.add(res.ok ? 'success' : 'error', `Teste Telegram: ${res.message}`);
    } catch {
      showResult(false, 'Erro ao conectar com a API. Verifique o token.');
    }
    setTesting(false);
  };

  const handleSendAlert = async (type: 'onu_offline' | 'sinal_critico' | 'olt_offline' | 'resumo') => {
    if (!config.telegramToken || !config.telegramChatId) {
      showResult(false, 'Configure o Token e o ID do Chat primeiro em Configurações.');
      return;
    }
    setSending(type);

    const offlineOlts   = olts.filter(o => o.status === 'offline');
    const totalOnus     = olts.reduce((a, o) => a + (o.totalOnus || 0), 0);
    const onlineOnus    = olts.reduce((a, o) => a + (o.onlineOnus || 0), 0);

    const data: Record<string, any> = {
      olts_total:   olts.length,
      olts_online:  olts.filter(o => o.status === 'online').length,
      olts_offline: offlineOlts.length,
      onus_total:   totalOnus,
      onus_online:  onlineOnus,
      offline_list: offlineOlts.map(o => `${o.name} (${o.ip})`),
      timestamp:    new Date().toLocaleString('pt-BR'),
    };

    try {
      const res = await sendTelegramAlert({
        token:  config.telegramToken,
        chatId: config.telegramChatId,
        type,
        data,
      });
      showResult(res.ok, res.message);
      LogStorage.add(res.ok ? 'success' : 'error', `Alerta Telegram [${type}]: ${res.message}`);
    } catch {
      showResult(false, 'Erro ao enviar alerta.');
    }
    setSending(null);
  };

  const isConfigured = config.telegramToken && config.telegramToken !== '00000000:XXXXXxXXXXXXXXXXXXXX'
    && config.telegramChatId && config.telegramChatId !== '-000000000';

  const offlineOlts  = olts.filter(o => o.status === 'offline');
  const totalOnus    = olts.reduce((a, o) => a + (o.totalOnus || 0), 0);
  const onlineOnus   = olts.reduce((a, o) => a + (o.onlineOnus || 0), 0);
  const uptime       = totalOnus > 0 ? ((onlineOnus / totalOnus) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6 max-w-4xl">

      {/* Status da configuração */}
      <div className={`rounded-xl p-4 flex items-center gap-3 ${isConfigured ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
        {isConfigured
          ? <CheckCircle size={20} className="text-green-600 shrink-0" />
          : <AlertTriangle size={20} className="text-yellow-600 shrink-0" />}
        <div>
          <p className={`font-semibold text-sm ${isConfigured ? 'text-green-800' : 'text-yellow-800'}`}>
            {isConfigured ? 'Telegram configurado' : 'Telegram não configurado'}
          </p>
          <p className={`text-xs ${isConfigured ? 'text-green-600' : 'text-yellow-600'}`}>
            {isConfigured
              ? `Token: ${config.telegramToken.substring(0, 10)}... | Chat: ${config.telegramChatId}`
              : 'Vá em Configurações → Operação & IA e preencha Token e ID do Chat.'}
          </p>
        </div>
      </div>

      {/* Resultado do envio */}
      {result && (
        <div className={`rounded-xl p-4 flex items-center gap-3 ${result.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {result.ok
            ? <CheckCircle size={18} className="text-green-600" />
            : <XCircle size={18} className="text-red-600" />}
          <p className={`text-sm font-medium ${result.ok ? 'text-green-700' : 'text-red-700'}`}>{result.msg}</p>
        </div>
      )}

      {/* Teste de conexão */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-1">Testar Conexão</h3>
        <p className="text-sm text-slate-500 mb-4">Envia uma mensagem de teste para confirmar que o bot está funcionando.</p>
        <button onClick={handleTest} disabled={testing}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
          {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {testing ? 'Enviando...' : 'Enviar Mensagem de Teste'}
        </button>
      </div>

      {/* Resumo atual da rede */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Status Atual da Rede</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {[
            { label: 'OLTs Online',  value: `${olts.filter(o=>o.status==='online').length}/${olts.length}`,  color: 'text-green-600' },
            { label: 'OLTs Offline', value: offlineOlts.length, color: offlineOlts.length > 0 ? 'text-red-600' : 'text-slate-500' },
            { label: 'ONUs Total',   value: totalOnus,          color: 'text-slate-700' },
            { label: 'Uptime',       value: `${uptime}%`,       color: parseFloat(uptime) > 95 ? 'text-green-600' : 'text-yellow-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="text-center p-3 bg-slate-50 rounded-lg">
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {offlineOlts.length > 0 && (
          <div className="bg-red-50 border border-red-100 rounded-lg p-3">
            <p className="text-xs font-semibold text-red-700 mb-1">OLTs Offline:</p>
            {offlineOlts.map(o => (
              <p key={o.id} className="text-xs text-red-600">• {o.name} ({o.ip})</p>
            ))}
          </div>
        )}
      </div>

      {/* Alertas manuais */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-1">Enviar Alertas Manualmente</h3>
        <p className="text-sm text-slate-500 mb-4">Dispara alertas imediatos com os dados atuais da rede.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <AlertCard
            icon={WifiOff}
            title="Alerta: ONU Offline / LOS"
            desc={`${offlineOlts.length} OLT(s) offline detectada(s)`}
            color="border-red-200 bg-red-50 text-red-700"
            loading={sending === 'onu_offline'}
            onClick={() => handleSendAlert('onu_offline')}
          />
          <AlertCard
            icon={AlertTriangle}
            title="Alerta: Sinal Crítico"
            desc="Notifica sobre ONUs com sinal abaixo do limite"
            color="border-yellow-200 bg-yellow-50 text-yellow-700"
            loading={sending === 'sinal_critico'}
            onClick={() => handleSendAlert('sinal_critico')}
          />
          <AlertCard
            icon={Bell}
            title="Alerta: OLT Offline"
            desc={`${offlineOlts.length} OLT(s) sem resposta`}
            color="border-orange-200 bg-orange-50 text-orange-700"
            loading={sending === 'olt_offline'}
            onClick={() => handleSendAlert('olt_offline')}
          />
          <AlertCard
            icon={BarChart2}
            title="Resumo Diário"
            desc={`${olts.length} OLTs | ${totalOnus} ONUs | ${uptime}% uptime`}
            color="border-blue-200 bg-blue-50 text-blue-700"
            loading={sending === 'resumo'}
            onClick={() => handleSendAlert('resumo')}
          />
        </div>
      </div>

      {/* Alertas automáticos */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-1">Alertas Automáticos</h3>
        <p className="text-sm text-slate-500 mb-4">Configure alertas automáticos em <strong>Configurações → Operação & IA</strong>.</p>
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
          {config.telegramAlerta === 'Ativado'
            ? <Bell size={16} className="text-green-600" />
            : <BellOff size={16} className="text-slate-400" />}
          <span className="text-sm text-slate-600">
            Alerta automático: <strong className={config.telegramAlerta === 'Ativado' ? 'text-green-600' : 'text-slate-500'}>{config.telegramAlerta}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
