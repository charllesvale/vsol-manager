import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Network, Plus, Pencil, Trash2, Upload, Users, ChevronDown, ChevronUp, X, CheckCircle, AlertCircle, Loader2, FileUp } from 'lucide-react';
import { listCtos, addCto, updateCto, deleteCto, listCtoClients, assignClient, removeClient, importKml, listOltsDb } from '../services/api';

interface CTO {
  id: number;
  nome: string;
  descricao: string;
  capacidade: number;
  tipo: string;
  id_olt: number | null;
  id_pon: number | null;
  endereco: string;
  lat: string | null;
  lng: string | null;
  ativo: number;
  created_at: string;
  olt_nome?: string;
  total_clientes: number;
}

const TIPOS = ['CTO', 'CEO', 'DIO', 'SPLITTER', 'OLT', 'POSTE', 'CABO', 'CLIENTE'];

const emptyForm = {
  nome: '', descricao: '', tipo: 'CTO', capacidade: 16,
  id_olt: '', id_pon: '', endereco: '', lat: '', lng: '',
};

export const CTOPage: React.FC = () => {
  const [ctos, setCtos] = useState<CTO[]>([]);
  const [olts, setOlts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<CTO | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [expandedCto, setExpandedCto] = useState<number | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [assignForm, setAssignForm] = useState({ login: '', porta: '', sn_onu: '' });
  const [assigning, setAssigning] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (type: 'ok' | 'err', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const loadCtos = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listCtos();
      if (r.ok) setCtos(r.ctos || []);
      else showToast('err', r.message || 'Erro ao carregar CTOs.');
    } catch { showToast('err', 'Erro de conexão.'); }
    setLoading(false);
  }, []);

  const loadOlts = useCallback(async () => {
    try {
      const r = await listOltsDb();
      if (r.ok) setOlts(r.olts || []);
    } catch {}
  }, []);

  useEffect(() => { loadCtos(); loadOlts(); }, [loadCtos, loadOlts]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...emptyForm });
    setShowModal(true);
  };

  const openEdit = (cto: CTO) => {
    setEditItem(cto);
    setForm({
      nome: cto.nome, descricao: cto.descricao, tipo: cto.tipo,
      capacidade: cto.capacidade as any, id_olt: cto.id_olt ? String(cto.id_olt) : '',
      id_pon: cto.id_pon ? String(cto.id_pon) : '', endereco: cto.endereco,
      lat: cto.lat ?? '', lng: cto.lng ?? '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { showToast('err', 'Nome é obrigatório.'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        capacidade: Number(form.capacidade),
        id_olt: form.id_olt ? Number(form.id_olt) : null,
        id_pon: form.id_pon ? Number(form.id_pon) : null,
        lat: form.lat !== '' ? Number(form.lat) : null,
        lng: form.lng !== '' ? Number(form.lng) : null,
      };
      const r = editItem
        ? await updateCto({ id: editItem.id, ...payload })
        : await addCto(payload);
      if (r.ok) {
        showToast('ok', r.message || 'Salvo com sucesso.');
        setShowModal(false);
        loadCtos();
      } else {
        showToast('err', r.message || 'Erro ao salvar.');
      }
    } catch { showToast('err', 'Erro de conexão.'); }
    setSaving(false);
  };

  const handleDelete = async (cto: CTO) => {
    if (!confirm(`Remover CTO "${cto.nome}"?`)) return;
    try {
      const r = await deleteCto(cto.id);
      if (r.ok) { showToast('ok', r.message); loadCtos(); }
      else showToast('err', r.message || 'Erro ao remover.');
    } catch { showToast('err', 'Erro de conexão.'); }
  };

  const toggleExpand = async (cto: CTO) => {
    if (expandedCto === cto.id) { setExpandedCto(null); return; }
    setExpandedCto(cto.id);
    setLoadingClients(true);
    try {
      const r = await listCtoClients(cto.id);
      if (r.ok) setClients(r.clientes || []);
    } catch {}
    setLoadingClients(false);
  };

  const handleAssign = async (id_cto: number) => {
    if (!assignForm.login.trim()) { showToast('err', 'Login obrigatório.'); return; }
    setAssigning(true);
    try {
      const r = await assignClient({
        id_cto,
        login: assignForm.login,
        porta: assignForm.porta ? Number(assignForm.porta) : null,
        sn_onu: assignForm.sn_onu,
      });
      if (r.ok) {
        showToast('ok', r.message);
        setAssignForm({ login: '', porta: '', sn_onu: '' });
        const r2 = await listCtoClients(id_cto);
        if (r2.ok) setClients(r2.clientes || []);
        loadCtos();
      } else showToast('err', r.message || 'Erro.');
    } catch { showToast('err', 'Erro de conexão.'); }
    setAssigning(false);
  };

  const handleRemoveClient = async (id_cto: number, login: string) => {
    if (!confirm(`Remover cliente "${login}" da CTO?`)) return;
    try {
      const r = await removeClient({ id_cto, login });
      if (r.ok) {
        showToast('ok', r.message);
        const r2 = await listCtoClients(id_cto);
        if (r2.ok) setClients(r2.clientes || []);
        loadCtos();
      } else showToast('err', r.message || 'Erro.');
    } catch { showToast('err', 'Erro de conexão.'); }
  };

  const handleFileImport = async (file: File) => {
    if (!file) return;
    const name = file.name.toLowerCase();
    if (!name.endsWith('.kml') && !name.endsWith('.kmz')) {
      showToast('err', 'Use arquivo .kml ou .kmz'); return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const r = await importKml(file);
      setImportResult(r);
      if (r.ok) { showToast('ok', r.message); loadCtos(); }
      else showToast('err', r.message || 'Erro na importação.');
    } catch { showToast('err', 'Erro de conexão.'); }
    setImporting(false);
  };

  const tipoColor: Record<string, string> = {
    CTO: 'bg-blue-100 text-blue-700', CEO: 'bg-purple-100 text-purple-700',
    DIO: 'bg-yellow-100 text-yellow-700', SPLITTER: 'bg-green-100 text-green-700',
    OLT: 'bg-red-100 text-red-700', POSTE: 'bg-gray-100 text-gray-700',
    CABO: 'bg-orange-100 text-orange-700', CLIENTE: 'bg-teal-100 text-teal-700',
  };

  const capacidadePct = (cto: CTO) =>
    cto.capacidade > 0 ? Math.round((cto.total_clientes / cto.capacidade) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium transition-all ${toast.type === 'ok' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Import Zone */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
          <Upload size={18} className="text-blue-500" /> Importar KMZ / KML
        </h2>
        <div
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileImport(f); }}
          onClick={() => fileInputRef.current?.click()}
        >
          {importing ? (
            <div className="flex flex-col items-center gap-2 text-blue-600">
              <Loader2 size={32} className="animate-spin" />
              <span className="text-sm font-medium">Importando...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <FileUp size={32} />
              <p className="text-sm font-medium text-slate-600">Arraste o arquivo aqui ou clique para selecionar</p>
              <p className="text-xs">Suporta .kml e .kmz</p>
            </div>
          )}
        </div>
        <input
          ref={fileInputRef} type="file" accept=".kml,.kmz" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileImport(f); e.target.value = ''; }}
        />
        {importResult && (
          <div className={`mt-4 rounded-xl p-4 text-sm ${importResult.ok ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <p className={`font-semibold mb-1 ${importResult.ok ? 'text-green-700' : 'text-red-700'}`}>
              {importResult.message}
            </p>
            {importResult.ok && importResult.detalhes?.length > 0 && (
              <div className="mt-2 space-y-1">
                <p className="text-slate-500 text-xs font-medium">Primeiros elementos importados:</p>
                {importResult.detalhes.slice(0, 10).map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tipoColor[d.tipo] || 'bg-slate-100 text-slate-600'}`}>{d.tipo}</span>
                    <span>{d.nome}</span>
                    {d.lat && <span className="text-slate-400">{Number(d.lat).toFixed(5)}, {Number(d.lng).toFixed(5)}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTO List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-700 flex items-center gap-2">
            <Network size={18} className="text-blue-500" />
            CTOs / Elementos de Rede
            <span className="ml-1 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{ctos.length}</span>
          </h2>
          <button onClick={openAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors">
            <Plus size={16} /> Nova CTO
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 size={28} className="animate-spin mr-2" /> Carregando...
          </div>
        ) : ctos.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Network size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">Nenhuma CTO cadastrada.</p>
            <p className="text-sm mt-1">Adicione manualmente ou importe um KMZ/KML acima.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {ctos.map(cto => {
              const pct = capacidadePct(cto);
              const expanded = expandedCto === cto.id;
              return (
                <div key={cto.id} className="transition-all">
                  <div className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">{cto.nome}</span>
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${tipoColor[cto.tipo] || 'bg-slate-100 text-slate-600'}`}>{cto.tipo}</span>
                        {cto.olt_nome && (
                          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                            OLT: {cto.olt_nome} {cto.id_pon ? `/ PON ${cto.id_pon}` : ''}
                          </span>
                        )}
                      </div>
                      {cto.endereco && <p className="text-xs text-slate-400 mt-0.5 truncate">{cto.endereco}</p>}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{cto.total_clientes}/{cto.capacidade} portas</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => toggleExpand(cto)} title="Clientes"
                        className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${expanded ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                        <Users size={14} /> {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <button onClick={() => openEdit(cto)} title="Editar"
                        className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => handleDelete(cto)} title="Remover"
                        className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Clients panel */}
                  {expanded && (
                    <div className="bg-slate-50 border-t border-slate-100 px-6 py-4">
                      <h3 className="text-xs font-semibold text-slate-600 mb-3 uppercase tracking-wide">
                        Clientes associados a {cto.nome}
                      </h3>
                      {loadingClients ? (
                        <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
                          <Loader2 size={16} className="animate-spin" /> Carregando clientes...
                        </div>
                      ) : (
                        <>
                          {clients.length === 0 ? (
                            <p className="text-sm text-slate-400 mb-3">Nenhum cliente associado.</p>
                          ) : (
                            <div className="rounded-lg overflow-hidden border border-slate-200 mb-4">
                              <table className="w-full text-xs">
                                <thead className="bg-slate-100">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Login</th>
                                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Nome</th>
                                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Porta</th>
                                    <th className="px-3 py-2 text-left font-semibold text-slate-600">SN ONU</th>
                                    <th className="px-3 py-2"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                  {clients.map((c: any) => (
                                    <tr key={c.login} className="hover:bg-slate-50">
                                      <td className="px-3 py-2 font-mono">{c.login}</td>
                                      <td className="px-3 py-2">{c.nome || '—'}</td>
                                      <td className="px-3 py-2">{c.porta || '—'}</td>
                                      <td className="px-3 py-2 font-mono">{c.sn_onu || '—'}</td>
                                      <td className="px-3 py-2 text-right">
                                        <button onClick={() => handleRemoveClient(cto.id, c.login)}
                                          className="text-red-400 hover:text-red-600 transition-colors">
                                          <X size={14} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {/* Assign form */}
                          <div className="flex flex-wrap gap-2 items-end">
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1 uppercase">Login</label>
                              <input value={assignForm.login} onChange={e => setAssignForm(p => ({ ...p, login: e.target.value }))}
                                placeholder="login cliente"
                                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 w-36" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1 uppercase">Porta</label>
                              <input value={assignForm.porta} onChange={e => setAssignForm(p => ({ ...p, porta: e.target.value }))}
                                placeholder="1-16" type="number"
                                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 w-20" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-500 mb-1 uppercase">SN ONU</label>
                              <input value={assignForm.sn_onu} onChange={e => setAssignForm(p => ({ ...p, sn_onu: e.target.value }))}
                                placeholder="VSOL00000001"
                                className="border border-slate-300 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 w-36" />
                            </div>
                            <button onClick={() => handleAssign(cto.id)} disabled={assigning}
                              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-60">
                              {assigning ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Associar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Add/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-800">{editItem ? 'Editar CTO' : 'Nova CTO'}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
                  <input value={form.nome} onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                    placeholder="CTO-01"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Capacidade (portas)</label>
                  <input type="number" min={1} max={128} value={form.capacidade}
                    onChange={e => setForm(p => ({ ...p, capacidade: Number(e.target.value) }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">OLT</label>
                  <select value={form.id_olt} onChange={e => setForm(p => ({ ...p, id_olt: e.target.value }))}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
                    <option value="">— Nenhuma —</option>
                    {olts.map((o: any) => <option key={o.id} value={o.id}>{o.nome} ({o.ip})</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">PON (1-16)</label>
                  <input type="number" min={1} max={16} value={form.id_pon}
                    onChange={e => setForm(p => ({ ...p, id_pon: e.target.value }))}
                    placeholder="ex: 1"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Endereço</label>
                  <input value={form.endereco} onChange={e => setForm(p => ({ ...p, endereco: e.target.value }))}
                    placeholder="Rua, número, bairro"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Latitude</label>
                  <input type="number" step="any" value={form.lat}
                    onChange={e => setForm(p => ({ ...p, lat: e.target.value }))}
                    placeholder="-23.5505"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Longitude</label>
                  <input type="number" step="any" value={form.lng}
                    onChange={e => setForm(p => ({ ...p, lng: e.target.value }))}
                    placeholder="-46.6333"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
                  <textarea value={form.descricao} onChange={e => setForm(p => ({ ...p, descricao: e.target.value }))}
                    rows={2} placeholder="Observações..."
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-60">
                {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                {editItem ? 'Salvar' : 'Criar CTO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
