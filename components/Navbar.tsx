import React from 'react';
import { LayoutDashboard, Server, Signal, Activity, Settings, Network } from 'lucide-react';

interface NavbarProps {
  currentPage: string;
  setPage: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, setPage }) => {
  const menuItems = [
    { id: 'dashboard',   label: 'Dashboard',          icon: LayoutDashboard },
    { id: 'olts',        label: 'Gerenciar OLTs',     icon: Server },
    { id: 'onus',        label: 'ONUs / ONTs',         icon: Signal },
    { id: 'diagnostics', label: 'Diagnóstico de Sinal', icon: Activity },
    { id: 'settings',    label: 'Configurações',       icon: Settings },
  ];

  return (
    <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-1.5 rounded-lg"><Network className="text-white h-5 w-5" /></div>
            <div>
              <span className="font-bold text-lg tracking-tight">VSOL Manager</span>
              <span className="ml-2 text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700">Pro</span>
            </div>
          </div>

          <div className="hidden md:flex space-x-1">
            {menuItems.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setPage(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  currentPage === id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}>
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-xs font-semibold text-slate-200">Admin ISP</p>
              <div className="flex items-center justify-end gap-1.5">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <p className="text-[10px] text-slate-400">MK-Auth</p>
              </div>
            </div>
            <div className="h-8 w-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-blue-400">MK</div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden border-t border-slate-800 flex justify-around p-2">
        {menuItems.map(({ id, icon: Icon }) => (
          <button key={id} onClick={() => setPage(id)}
            className={`p-2 rounded-lg ${currentPage === id ? 'text-blue-400 bg-slate-800' : 'text-slate-400'}`}>
            <Icon size={20} />
          </button>
        ))}
      </div>
    </nav>
  );
};
