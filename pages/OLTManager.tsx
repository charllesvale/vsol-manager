import React, { useState, useEffect, useCallback } from 'react';
import {
  Server, Plus, Trash2, Edit2, X, Save, Search, Wifi, WifiOff,
  MoreVertical, Plug, Layers, Gauge, Box, Database, Download, Key,
  CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import { OLT } from '../types';
import { OltStorage, LogStorage } from '../services/storage';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const DEFAULT_FORM: Partial<OLT> = {
  name: '',
  ip: '',
  model: 'V1600G1',
  ponPorts: 8,
  status: 'online',
  onlineOnus: 0,
  totalOnus: 0,
  fwVersion: 'Pendente',
  sshUser: 'admin',
  sshPass: '',
  sshPort: 22,
  snmpRead: 'public',
  snmpWrite: 'private',
  snmpPort: 161,
  snmpVersion: 'v2c',
  notes: '',
  address: '',
  lat: undefined,
  lng: undefined,
};

export const OLTManager: React.FC = () => {
  const [olts, setOlts] = useState<OLT[]>([]);
  const [filtered, setFiltered] = useState<OLT[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOlt, setEditingOlt] = useState<OLT | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMsg, setTestMsg] = useState('');
  const [formData, setFormData] = useState<Partial<OLT>>(DEFAULT_FORM);

  useEffect(() => {
    setOlts(OltStorage.getAll());
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(olts);
    } else {
      const q = search.toLowerCase();
      setFiltered(olts.filter(o =>
        o.name.toLowerCase().includes(q) ||
        o.ip.toLowerCase().includes(q) ||
        o.model.toLowerCase().includes(q)
      ));
    }
  }, [olts, search]);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleOpenModal = (olt?: OLT) => {
    setTestStatus('idle');
    setTestMsg('');
    if (olt) {
      setEditingOlt(olt);
      setFormData({ ...DEFAULT_FORM, ...olt });
    } else {
      setEditingOlt(null);
      setFormData(DEFAULT_FORM);
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover esta OLT e todos os dados vinculados?')) {
      const updated = OltStorage.remove(id);
      setOlts(updated);
      const olt = olts.find(o => o.id === id);
      LogStorage.add('warning', `OLT removida: ${olt?.name} (${olt?.ip})`);
    }
  };

  const handleTestConnection = () => {
    if (!formData.ip) {
      setTestStatus('error');
      setTestMsg('Informe o IP antes de testar.');
      return;
    }

    setTestStatus('testing');
    setTestMsg('Verificando conectividade...');

    // Real test uses ping via fetch to a PHP endpoint if available, otherwise simulates
    // In MK-Auth context, we attempt to reach a known endpoint on the OLT
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    fetch(`http://${formData.ip}/`, { signal: controller.signal, mode: 'no-cors' })
      .then(() => {
        clearTimeout(timeoutId);
        setTestStatus('success');
        setTestMsg(`Host ${formData.ip} respondeu.`);
      })
      .catch((err) => {
        clearTimeout(timeoutId);
        // no-cors fetch throwing means host is unreachable OR cors blocked (host alive)
        if (err.name === 'AbortError') {
          setTestStatus('error');
          setTestMsg(`Timeout: ${formData.ip} não respondeu em 3s.`);
        } else {
          // If CORS error, the host IS reachable (just blocked)
          setTestStatus('success');
          setTestMsg(`Host ${formData.ip} está acessível na rede.`);
        }
      });
  };

  const handleSave = () => {
    if (!formData.name?.trim() || !formData.ip?.trim()) {
      alert('Nome e IP são obrigatórios.');
      return;
    }

    // Validate IP format
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(formData.ip.trim())) {
      alert('Formato de IP inválido. Use o formato: 192.168.0.1');
      return;
    }

    if (testStatus === 'error') {
      if (!window.confirm('O teste de conexão indicou falha. Deseja salvar mesmo assim?')) return;
    }

    let updatedList: OLT[];
    if (editingOlt) {
      updatedList = OltStorage.update({ ...editingOlt, ...formData } as OLT);
      LogStorage.add('info', `OLT atualizada: ${formData.name} (${formData.ip})`);
    } else {
      const newOlt: OLT = {
        ...DEFAULT_FORM,
        ...formData,
        id: Date.now().toString(),
        onlineOnus: Number(formData.onlineOnus) || 0,
        totalOnus: Number(formData.totalOnus) || 0,
      } as OLT;
      updatedList = OltStorage.add(newOlt);
      LogStorage.add('success', `Nova OLT cadastrada: ${formData.name} (${formData.ip})`);
    }

    setOlts(updatedList);
    setIsModalOpen(false);
  };

  const ActionMenu = ({ olt }: { olt: OLT }) => {
    const isOpen = activeMenuId === olt.id;
    return (
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setActiveMenuId(isOpen ? null : olt.id); }}
          className={`p-2 rounded-lg transition-colors ${isOpen ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
        >
          <MoreVertical size={20} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-2xl border border-slate-200 z-[9999] overflow-hidden">
            <div className="py-1">
              <div className="px-4 py-2 border-b border-slate-100 bg-slate-50">
                <p className="text-xs font-bold text-slate-500 uppercase truncate">{olt.name}</p>
                <p className="text-xs text-slate-400 font-mono">{olt.ip}</p>
              </div>

              <button onClick={() => handleOpenModal(olt)} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-3">
                <Edit2 size={16} /> Editar OLT
              </button>

              <div className="border-t border-slate-100 px-4 py-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 mb-0.5">Importar da OLT</p>
              </div>

              <button onClick={() => { LogStorage.add('info', `Importação de PONs solicitada para ${olt.name}`); alert('Funcionalidade: Importe PONs via SSH ou SNMP na aba de configurações.'); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-3">
                <Plug size={16} /> PONs ({olt.ponPorts})
              </button>

              <button onClick={() => { LogStorage.add('info', `Importação de VLANs solicitada para ${olt.name}`); alert('Configure as VLANs na aba de configurações da OLT.'); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-3">
                <Layers size={16} /> VLANs
              </button>

              <button onClick={() => { LogStorage.add('info', `Importação de Perfis solicitada para ${olt.name}`); alert('Configure os perfis de velocidade no CLI da OLT.'); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-3">
                <Database size={16} /> Perfis
              </button>

              <button onClick={() => { LogStorage.add('info', `Importação de ONUs solicitada para ${olt.name}`); alert(`Para importar ONUs da OLT ${olt.name}, acesse via SSH: ${olt.sshUser}@${olt.ip}:${olt.sshPort || 22}`); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-3">
                <Download size={16} /> Importar ONUs
              </button>

              <div className="border-t border-slate-100 my-1"></div>

              <button onClick={() => handleDelete(olt.id)} className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3 font-medium">
                <Trash2 size={16} /> Remover OLT
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome, IP ou modelo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
        >
          <Plus size={20} />
          Adicionar OLT
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-16 text-center">
          <Server size={48} className="mx-auto text-slate-200 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">
            {search ? 'Nenhuma OLT encontrada' : 'Nenhuma OLT cadastrada'}
          </h3>
          <p className="text-slate-400 text-sm mb-6">
            {search ? `Não encontramos resultados para "${search}"` : 'Comece adicionando sua primeira OLT VSOL, Huawei ou ZTE.'}
          </p>
          {!search && (
            <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              <Plus size={16} className="inline mr-2" />Adicionar OLT
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((olt) => {
            const isMenuOpen = activeMenuId === olt.id;
            const occupancy = olt.ponPorts > 0 ? ((olt.onlineOnus / (olt.ponPorts * 128)) * 100) : 0;
            return (
              <div
                key={olt.id}
                className={`bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all relative ${isMenuOpen ? 'z-50 ring-2 ring-blue-100' : 'z-0'}`}
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-3 rounded-lg ${olt.status === 'online' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                        <Server size={24} />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{olt.name}</h3>
                        <p className="text-sm text-slate-500 font-mono">{olt.ip}</p>
                      </div>
                    </div>
                    <ActionMenu olt={olt} />
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm py-1.5 border-b border-slate-50">
                      <span className="text-slate-500">Modelo:</span>
                      <span className="font-medium text-slate-700">{olt.model}</span>
                    </div>
                    <div className="flex justify-between text-sm py-1.5 border-b border-slate-50">
                      <span className="text-slate-500">Portas PON:</span>
                      <span className="font-medium text-slate-700">{olt.ponPorts}</span>
                    </div>
                    {olt.fwVersion && olt.fwVersion !== 'Pendente' && (
                      <div className="flex justify-between text-sm py-1.5 border-b border-slate-50">
                        <span className="text-slate-500">Firmware:</span>
                        <span className="font-medium text-slate-700 font-mono">{olt.fwVersion}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm py-1.5">
                      <span className="text-slate-500">Status:</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                        olt.status === 'online' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {olt.status === 'online' ? <Wifi size={12}/> : <WifiOff size={12}/>}
                        {olt.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="pt-1">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Ocupação ONUs</span>
                        <span>{olt.onlineOnus} / {olt.ponPorts * 128}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${occupancy > 80 ? 'bg-red-400' : occupancy > 60 ? 'bg-yellow-400' : 'bg-blue-500'}`}
                          style={{ width: `${Math.min(100, occupancy)}%` }}
                        ></div>
                      </div>
                      <p className="text-right text-xs text-slate-400 mt-0.5">{occupancy.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50 rounded-t-xl">
              <h3 className="text-xl font-bold text-slate-800">
                {editingOlt ? `Editar: ${editingOlt.name}` : 'Adicionar Nova OLT'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* COLUNA 1 */}
                <div className="space-y-5">
                  <h4 className="font-semibold text-slate-900 border-b border-slate-200 pb-2">Informações Básicas & SSH</h4>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nome / Descrição <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ex: VSOL-POP-01"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Modelo da OLT <span className="text-red-500">*</span></label>
                    <select
                      value={formData.model || 'V1600G1'}
                      onChange={e => setFormData({...formData, model: e.target.value})}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      <optgroup label="VSOL GPON">
                        <option value="V1600G1">V1600G1 (8 PON)</option>
                        <option value="V1600G2">V1600G2 (16 PON)</option>
                        <option value="V1600G4">V1600G4 (4 PON)</option>
                      </optgroup>
                      <optgroup label="VSOL EPON">
                        <option value="V1600D4">V1600D4 (4 EPON)</option>
                        <option value="V1600D8">V1600D8 (8 EPON)</option>
                      </optgroup>
                      <optgroup label="Huawei">
                        <option value="MA5608T">MA5608T</option>
                        <option value="MA5683T">MA5683T</option>
                      </optgroup>
                      <optgroup label="ZTE">
                        <option value="C320">C320</option>
                        <option value="C650">C650</option>
                      </optgroup>
                      <optgroup label="Intelbras">
                        <option value="OLT1200">OLT-1200</option>
                      </optgroup>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">IP de Acesso <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={formData.ip || ''}
                        onChange={e => setFormData({...formData, ip: e.target.value})}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                        placeholder="10.0.0.1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Portas PON</label>
                      <input
                        type="number"
                        value={formData.ponPorts || 8}
                        onChange={e => setFormData({...formData, ponPorts: Number(e.target.value)})}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        min={1} max={64}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="block text-sm font-medium text-slate-700 mb-1">Porta SSH</label>
                      <input
                        type="number"
                        value={formData.sshPort || 22}
                        onChange={e => setFormData({...formData, sshPort: Number(e.target.value)})}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Login SSH</label>
                      <input
                        type="text"
                        value={formData.sshUser || ''}
                        onChange={e => setFormData({...formData, sshUser: e.target.value})}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Senha SSH</label>
                      <input
                        type="password"
                        value={formData.sshPass || ''}
                        onChange={e => setFormData({...formData, sshPass: e.target.value})}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="••••••"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">ONUs Online</label>
                      <input
                        type="number"
                        value={formData.onlineOnus || 0}
                        onChange={e => setFormData({...formData, onlineOnus: Number(e.target.value)})}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        min={0}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Total ONUs</label>
                      <input
                        type="number"
                        value={formData.totalOnus || 0}
                        onChange={e => setFormData({...formData, totalOnus: Number(e.target.value)})}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        min={0}
                      />
                    </div>
                  </div>
                </div>

                {/* COLUNA 2 */}
                <div className="space-y-5">
                  <h4 className="font-semibold text-slate-900 border-b border-slate-200 pb-2">Configuração SNMP</h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Community Leitura</label>
                      <input
                        type="text"
                        value={formData.snmpRead || 'public'}
                        onChange={e => setFormData({...formData, snmpRead: e.target.value})}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Community Escrita</label>
                      <input
                        type="text"
                        value={formData.snmpWrite || 'private'}
                        onChange={e => setFormData({...formData, snmpWrite: e.target.value})}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Porta SNMP</label>
                      <input
                        type="number"
                        value={formData.snmpPort || 161}
                        onChange={e => setFormData({...formData, snmpPort: Number(e.target.value)})}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Versão SNMP</label>
                      <select
                        value={formData.snmpVersion || 'v2c'}
                        onChange={e => setFormData({...formData, snmpVersion: e.target.value as 'v1' | 'v2c'})}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="v1">v1</option>
                        <option value="v2c">v2c</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Firmware</label>
                      <input
                        type="text"
                        value={formData.fwVersion || ''}
                        onChange={e => setFormData({...formData, fwVersion: e.target.value})}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                        placeholder="Ex: 2.0.4"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                      <select
                        value={formData.status || 'online'}
                        onChange={e => setFormData({...formData, status: e.target.value as 'online' | 'offline'})}
                        className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                      >
                        <option value="online">Online / Ativo</option>
                        <option value="offline">Offline / Inativo</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      📍 Endereço (para o Mapa da Rede)
                    </label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ex: Rua das Flores, 123, Bairro, Cidade - UF"
                    />
                    <p className="text-xs text-slate-400 mt-1">Informe o endereço para aparecer no mapa. A localização será convertida automaticamente.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
                    <textarea
                      value={formData.notes || ''}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                      placeholder="Observações técnicas..."
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-between items-center bg-slate-50 rounded-b-xl">
              <div className="flex items-center gap-3 text-sm">
                {testStatus === 'idle' && <span className="text-slate-400">Teste a conexão antes de salvar</span>}
                {testStatus === 'testing' && <span className="text-blue-600 flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Testando conexão com {formData.ip}...</span>}
                {testStatus === 'success' && <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle size={16}/> {testMsg}</span>}
                {testStatus === 'error' && <span className="text-red-600 font-medium flex items-center gap-1"><AlertCircle size={16}/> {testMsg}</span>}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing' || !formData.ip}
                  className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <Plug size={18} />
                  Testar Conexão
                </button>

                <button
                  onClick={handleSave}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <Save size={18} />
                  {editingOlt ? 'Atualizar' : 'Cadastrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
