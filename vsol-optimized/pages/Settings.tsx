import React, { useState, useEffect } from 'react';
import {
  Save, Database, CheckCircle, Info, Copy, FolderOpen,
  Trash2, RotateCcw, Download, Loader2, XCircle, AlertTriangle, Bell
} from 'lucide-react';
import { ConfigStorage, LogStorage, OltStorage } from '../services/storage';
import { testDatabase, downloadBackup } from '../services/api';
import { AppConfig, DEFAULT_CONFIG } from '../types';

type TabId = 'install' | 'mkauth' | 'operacao' | 'logs';

// ── Sub-componente: campo de formulário ───────────────────────────────────────
const Field = ({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 mb-1">
      {label} <span className="text-red-500">*</span>
    </label>
    {children}
    {help && <p className="text-xs text-slate-400 mt-1">{help}</p>}
  </div>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input {...props} className={`w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm ${props.className ?? ''}`} />
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) => (
  <select {...props} className={`w-full p-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white ${props.className ?? ''}`}>
    {props.children}
  </select>
);

// ─────────────────────────────────────────────────────────────────────────────

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('mkauth');
  const [config, setConfig] = useState<AppConfig>(ConfigStorage.get());
  const [logs, setLogs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [dbTest, setDbTest] = useState<{ ok: boolean; msg: string } | null>(null);
  const [dbTesting, setDbTesting] = useState(false);

  useEffect(() => { setLogs(LogStorage.getAll()); }, [activeTab]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const upd = (field: keyof AppConfig, value: any) =>
    setConfig(c => ({ ...c, [field]: value }));

  // ── Salvar configurações gerais ───────────────────────────────────────────
  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      ConfigStorage.save(config);
      LogStorage.add('success', 'Configurações salvas.');
      setLogs(LogStorage.getAll());
      setSaving(false);
      showToast('Configurações salvas com sucesso!');
    }, 500);
  };

  // ── Testar conexão com banco real ─────────────────────────────────────────
  const handleTestDb = async () => {
    setDbTesting(true);
    setDbTest(null);
    try {
      const res = await testDatabase({
        mkAuthIp: config.mkAuthIp,
        dbUser: config.dbUser,
        dbPass: config.dbPass,
        dbName: config.dbName,
      });
      setDbTest({ ok: res.ok, msg: res.message });
      LogStorage.add(res.ok ? 'success' : 'error', `Teste DB: ${res.message}`);
      setLogs(LogStorage.getAll());
    } catch (e: any) {
      setDbTest({ ok: false, msg: 'Erro ao chamar API backend. Execute o addon via MK-Auth.' });
    }
    setDbTesting(false);
  };

  // ── Backup ────────────────────────────────────────────────────────────────
  const handleBackup = () => {
    try {
      downloadBackup(); // via API PHP
    } catch {
      // Fallback: backup local do localStorage
      const data = {
        version: '2.0',
        generated: new Date().toISOString(),
        config: ConfigStorage.get(),
        olts: OltStorage.getAll(),
        logs: LogStorage.getAll(),
        note: 'Backup local (sem conexão com backend PHP).',
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vsol-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    LogStorage.add('info', 'Backup gerado.');
    showToast('Backup gerado com sucesso!');
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = () => {
    if (window.confirm('⚠️ Apaga TODAS as OLTs e configurações. Irreversível. Continuar?')) {
      OltStorage.save([]);
      LogStorage.clear();
      ConfigStorage.save(DEFAULT_CONFIG);
      setConfig(DEFAULT_CONFIG);
      setLogs([]);
      showToast('Sistema resetado.', 'error');
    }
  };

  const copyText = (text: string) => {
    try { navigator.clipboard.writeText(text); } catch {
      const el = document.createElement('textarea'); el.value = text;
      document.body.appendChild(el); el.select(); document.execCommand('copy');
      document.body.removeChild(el);
    }
    showToast('Copiado!');
  };

  const jsSnippet = "// Copiar para: /opt/mk-auth/admin/addons/addon_vsol.js\n$('.navbar-start').append('<div class=\"navbar-item has-dropdown is-hoverable\"><a class=\"navbar-link is-size-7 has-text-weight-bold\">VSOL Manager</a><div class=\"navbar-dropdown\"><a href=\"/admin/addons/vsol-optimized/index.php\" class=\"navbar-item\">Dashboard</a></div></div>');";

  const installCmds = `# 1. Enviar para o servidor via SCP
scp vsol-optimized.zip root@IP_SERVIDOR:/opt/mk-auth/admin/addons/

# 2. No servidor via SSH
cd /opt/mk-auth/admin/addons/
unzip vsol-optimized.zip && cd vsol-optimized

# 3. Instalar dependências e compilar (apenas 1x)
npm install && npm run build

# 4. Preparar para MK-Auth (substitui index.html pelo index.php com auth)
rm -f dist/index.html
cp index.php dist/index.php
mkdir -p dist/api && cp api/index.php dist/api/
cp -r dist/* .

# 5. Permissões e registrar menu
chown -R www-data:www-data .
cp addon_vsol.js /opt/mk-auth/admin/addons/`;

  const tabs: { id: TabId; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'install',  label: 'Instalação',    icon: FolderOpen },
    { id: 'mkauth',   label: 'Banco de Dados', icon: Database },
    { id: 'operacao', label: 'Operação & IA',  icon: Bell },
    { id: 'logs',     label: 'Logs',           icon: RotateCcw },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-12">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-slate-800">Configuração do Sistema</h2>
          <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded font-mono">v2.0</span>
        </div>
        <div className="flex gap-2 items-center">
          {toast && (
            <div className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${toast.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              <CheckCircle size={16} /> {toast.msg}
            </div>
          )}
          <button onClick={handleBackup}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors">
            <Download size={16} /> Gerar Backup
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`px-6 py-4 text-sm font-medium flex items-center gap-2 transition-colors border-b-2 whitespace-nowrap ${
                activeTab === id
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}>
              <Icon size={18} /> {label}
            </button>
          ))}
        </div>

        <div className="p-8">

          {/* ── INSTALAÇÃO ──────────────────────────────────────────────────── */}
          {activeTab === 'install' && (
            <div className="space-y-8 max-w-3xl">
              {[
                { n: 1, title: 'Copiar e Compilar', content: (
                  <>
                    <p className="text-slate-600 text-sm mb-3">No servidor MK-Auth (SSH):</p>
                    <div className="bg-slate-900 text-green-400 p-4 rounded-lg font-mono text-xs border border-slate-700 relative">
                      <pre className="whitespace-pre-wrap">{installCmds}</pre>
                      <button onClick={() => copyText(installCmds)} className="absolute top-2 right-2 p-1 bg-slate-700 text-white rounded hover:bg-slate-600"><Copy size={13} /></button>
                    </div>
                  </>
                )},
                { n: 2, title: 'Registrar no Menu MK-Auth', content: (
                  <>
                    <p className="text-slate-600 text-sm mb-3">Adicione ao arquivo <code className="bg-slate-100 px-1.5 py-0.5 rounded">/opt/mk-auth/admin/addons/addon.js</code>:</p>
                    <div className="bg-slate-900 text-blue-300 p-4 rounded-lg font-mono text-xs border border-slate-700 relative">
                      <pre className="whitespace-pre-wrap">{jsSnippet}</pre>
                      <button onClick={() => copyText(jsSnippet)} className="absolute top-2 right-2 p-1 bg-slate-700 text-white rounded hover:bg-slate-600"><Copy size={13} /></button>
                    </div>
                  </>
                )},
                { n: 3, title: 'Acesso Protegido', content: (
                  <p className="text-slate-600 text-sm">O arquivo <code className="bg-slate-100 px-1 rounded">index.php</code> verifica a sessão do MK-Auth. Acesso sem login redireciona automaticamente para <code className="bg-slate-100 px-1 rounded">/admin/login.php</code>.</p>
                )},
                { n: '✓', title: 'Pronto!', content: (
                  <p className="text-slate-600 text-sm">Pressione <kbd className="bg-slate-100 px-2 py-0.5 rounded text-xs">Ctrl+Shift+R</kbd> no navegador para limpar cache e o menu aparecerá no MK-Auth.</p>
                )},
              ].map(({ n, title, content }) => (
                <div key={String(n)} className="flex gap-4">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full ${n === '✓' ? 'bg-green-600' : 'bg-indigo-600'} text-white flex items-center justify-center font-bold text-sm`}>{n}</div>
                  <div className="w-full">
                    <h4 className="font-semibold text-slate-900 text-lg mb-2">{title}</h4>
                    {content}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── BANCO DE DADOS ───────────────────────────────────────────────── */}
          {activeTab === 'mkauth' && (
            <div className="space-y-6 max-w-2xl">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex gap-3">
                <Info className="text-blue-600 shrink-0 mt-0.5" size={20} />
                <p className="text-sm text-blue-800">
                  Dados de conexão ao banco MySQL do MK-Auth. Utilizados para listar ONUs e integrações com dados de clientes.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="IP do Servidor MK-Auth" help="Geralmente 172.31.255.2 (loopback interno)">
                    <Input type="text" value={config.mkAuthIp} onChange={e => upd('mkAuthIp', e.target.value)} placeholder="172.31.255.2" className="font-mono" />
                  </Field>
                </div>
                <Field label="Banco de Dados" help="Nome do banco (geralmente mk_auth)">
                  <Input type="text" value={config.dbName} onChange={e => upd('dbName', e.target.value)} placeholder="mk_auth" className="font-mono" />
                </Field>
                <div /> {/* spacer */}
                <Field label="Usuário MySQL">
                  <Input type="text" value={config.dbUser} onChange={e => upd('dbUser', e.target.value)} className="font-mono" />
                </Field>
                <Field label="Senha MySQL">
                  <Input type="password" value={config.dbPass} onChange={e => upd('dbPass', e.target.value)} className="font-mono" />
                </Field>
              </div>

              {/* Resultado do teste */}
              {dbTest && (
                <div className={`flex items-center gap-3 p-4 rounded-lg border ${dbTest.ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {dbTest.ok ? <CheckCircle size={20} className="shrink-0 text-green-600" /> : <XCircle size={20} className="shrink-0 text-red-500" />}
                  <p className="text-sm font-medium">{dbTest.msg}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={handleTestDb} disabled={dbTesting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors shadow-sm">
                  {dbTesting ? <Loader2 size={16} className="animate-spin" /> : <Database size={16} />}
                  {dbTesting ? 'Testando...' : 'Testar Conexão'}
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition-colors shadow-sm">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {saving ? 'Salvando...' : 'Salvar Configurações'}
                </button>
              </div>

              {/* Zona de Perigo */}
              <div className="border-t border-slate-200 pt-6 mt-4">
                <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                  <Trash2 size={16} /> Zona de Perigo
                </h4>
                <p className="text-sm text-slate-500 mb-3">Apaga todas as OLTs cadastradas e configurações salvas.</p>
                <button onClick={handleReset}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Resetar Todo o Sistema
                </button>
              </div>
            </div>
          )}

          {/* ── OPERAÇÃO & INTEGRAÇÕES ───────────────────────────────────────── */}
          {activeTab === 'operacao' && (
            <div className="space-y-8 max-w-4xl">

              {/* Bloco 1: Operação */}
              <div>
                <h3 className="text-base font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Operação</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <Field label="Registros por Página" help="Quantidade de registros a exibir por página (paginação).">
                    <Input type="number" value={config.registrosPorPagina} min={5} max={500}
                      onChange={e => upd('registrosPorPagina', parseInt(e.target.value) || 30)} />
                  </Field>
                  <Field label="Registros por Cron" help="Quantidade de registros a processar por vez em cada execução do Cron.">
                    <Input type="number" value={config.registrosPorCron} min={5} max={500}
                      onChange={e => upd('registrosPorCron', parseInt(e.target.value) || 50)} />
                  </Field>
                  <Field label="Tempo Check ONU Cron" help="Tempo de verificação do Sinal e Status da ONU via Cron.">
                    <Select value={config.tempoCheckCron} onChange={e => upd('tempoCheckCron', e.target.value)}>
                      <option>A cada 1 hora</option>
                      <option>A cada 3 horas</option>
                      <option>A cada 6 horas</option>
                      <option>A cada 12 horas</option>
                      <option>A cada 24 horas</option>
                    </Select>
                  </Field>
                  <Field label="SSH Timeout" help="SSH Timeout (Geralmente 10).">
                    <Input type="number" value={config.sshTimeout} min={1} max={60}
                      onChange={e => upd('sshTimeout', parseInt(e.target.value) || 10)} />
                  </Field>
                  <Field label="SSH Keepalive" help="SSH Keepalive (Geralmente 30).">
                    <Input type="number" value={config.sshKeepalive} min={1} max={300}
                      onChange={e => upd('sshKeepalive', parseInt(e.target.value) || 30)} />
                  </Field>
                </div>
              </div>

              {/* Bloco 2: Nível de Sinal */}
              <div>
                <h3 className="text-base font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Nível de Sinal</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <Field label="Sinal Bom &lt;=" help="O nível de sinal bom considerado em sua rede.">
                    <Input type="number" step="0.01" value={config.sinalBom}
                      onChange={e => upd('sinalBom', parseFloat(e.target.value))}
                      className="font-mono" placeholder="-27,00" />
                  </Field>
                  <Field label="Sinal Aceitável &lt;=" help="O nível de sinal aceitável considerado em sua rede.">
                    <Input type="number" step="0.01" value={config.sinalAceitavel}
                      onChange={e => upd('sinalAceitavel', parseFloat(e.target.value))}
                      className="font-mono" placeholder="-30,00" />
                  </Field>
                </div>
              </div>

              {/* Bloco 3: Google Maps */}
              <div>
                <h3 className="text-base font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Google Maps</h3>
                <Field label="Key Google Maps" help={<>Informe sua Key Google Maps de acesso à API, para isso <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">clique aqui</a> e acesse o guia de configuração.</>}>
                  <Input type="text" value={config.googleMapsKey}
                    onChange={e => upd('googleMapsKey', e.target.value)}
                    placeholder="Sua Key Google Maps" />
                </Field>
              </div>

              {/* Bloco 4: Telegram */}
              <div>
                <h3 className="text-base font-semibold text-slate-800 mb-4 pb-2 border-b border-slate-100">Alerta Telegram</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Field label="Alerta Telegram Diário" help="Se deseja ativar o alerta via Telegram (los/offline) diariamente de 1 em 1 hora.">
                    <Select value={config.telegramAlerta} onChange={e => upd('telegramAlerta', e.target.value as any)}>
                      <option>Desativado</option>
                      <option>Ativado</option>
                    </Select>
                  </Field>
                  <Field label="Token Telegram" help={<>Seu token de integração Telegram. <a href="https://core.telegram.org/bots#creating-a-new-bot" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">clique aqui</a> para instruções.</>}>
                    <Input type="text" value={config.telegramToken}
                      onChange={e => upd('telegramToken', e.target.value)}
                      placeholder="00000000:XXXXXxXXXXXXXXXXXXXX"
                      className="font-mono text-xs" />
                  </Field>
                  <Field label="ID Chat Telegram" help={<>Seu ID Chat Telegram que vai receber os alertas. <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">clique aqui</a> para instruções.</>}>
                    <Input type="text" value={config.telegramChatId}
                      onChange={e => upd('telegramChatId', e.target.value)}
                      placeholder="-000000000"
                      className="font-mono" />
                  </Field>
                </div>
              </div>

              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors shadow-lg shadow-blue-500/20">
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          )}

          {/* ── LOGS ────────────────────────────────────────────────────────── */}
          {activeTab === 'logs' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Histórico de Atividades ({logs.length})</h3>
                <button onClick={() => { LogStorage.clear(); setLogs([]); showToast('Logs limpos!'); }}
                  className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1 font-medium">
                  <Trash2 size={14} /> Limpar logs
                </button>
              </div>

              {logs.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-lg border border-slate-100">
                  <RotateCcw size={32} className="mx-auto mb-2 opacity-30" />
                  <p>Nenhuma atividade registrada ainda.</p>
                </div>
              ) : (
                <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                  <div className="max-h-[500px] overflow-y-auto">
                    {logs.map((log: any) => (
                      <div key={log.id} className="flex items-start gap-3 px-4 py-3 border-b border-slate-100 last:border-0 hover:bg-white transition-colors">
                        <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${
                          log.level === 'error' ? 'bg-red-500' :
                          log.level === 'warning' ? 'bg-yellow-500' :
                          log.level === 'success' ? 'bg-green-500' : 'bg-blue-400'}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700">{log.message}</p>
                          <p className="text-xs text-slate-400">{log.timestamp}</p>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                          log.level === 'error'   ? 'bg-red-100 text-red-600' :
                          log.level === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                          log.level === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                          {log.level.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
