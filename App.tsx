import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Diagnostics } from './pages/Diagnostics';
import { Settings } from './pages/Settings';
import { OLTManager } from './pages/OLTManager';
import { MapView } from './pages/MapView';

type PageId = 'dashboard' | 'olts' | 'diagnostics' | 'mapa' | 'settings';

const PAGE_META: Record<PageId, { title: string; sub: string }> = {
  dashboard:   { title: 'Visão Geral',           sub: 'Monitoramento em tempo real da planta óptica.' },
  olts:        { title: 'Gerenciamento de OLTs', sub: 'Cadastre e gerencie seus concentradores VSOL, Huawei, ZTE e Intelbras.' },
  diagnostics: { title: 'Diagnóstico de Sinal',  sub: 'Análise técnica local de sinal óptico GPON/EPON. Funciona 100% offline.' },
  mapa:        { title: 'Mapa da Rede',           sub: 'Visualize a localização de suas OLTs e clientes no mapa.' },
  settings:    { title: 'Sistema & Instalação',  sub: 'Configure o addon, banco de dados e visualize logs de atividade.' },
};

const App: React.FC = () => {
  const [page, setPage] = useState<PageId>('dashboard');
  const { title, sub } = PAGE_META[page];

  const renderPage = () => {
    switch (page) {
      case 'dashboard':   return <Dashboard />;
      case 'olts':        return <OLTManager />;
      case 'diagnostics': return <Diagnostics />;
      case 'mapa':        return <MapView />;
      case 'settings':    return <Settings />;
      default:            return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar currentPage={page} setPage={p => setPage(p as PageId)} />
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">{sub}</p>
        </div>
        {renderPage()}
      </main>
      <footer className="bg-white border-t border-slate-200 py-6 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm text-slate-400">VSOL Manager Pro &copy; 2024 — Addon para MK-Auth</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
