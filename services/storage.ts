import { OLT, AppConfig, DEFAULT_CONFIG } from "../types";

// Fallback in-memory para ambientes sem localStorage (iframe MK-Auth)
const mem: Record<string, string> = {};
const safe = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return mem[k] ?? null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { mem[k] = v; } },
  del: (k: string) => { try { localStorage.removeItem(k); } catch { delete mem[k]; } },
};

const KEY_OLTS   = 'VSOL_OLTS_V2';
const KEY_CFG    = 'VSOL_CFG_V2';
const KEY_LOGS   = 'VSOL_LOGS_V2';

// ── OLTs ─────────────────────────────────────────────────────────────────────
export const OltStorage = {
  getAll: (): OLT[] => {
    try { return JSON.parse(safe.get(KEY_OLTS) ?? '[]'); } catch { return []; }
  },
  save: (olts: OLT[]) => safe.set(KEY_OLTS, JSON.stringify(olts)),
  add: (olt: OLT): OLT[] => {
    const list = [...OltStorage.getAll(), olt];
    OltStorage.save(list); return list;
  },
  update: (olt: OLT): OLT[] => {
    const list = OltStorage.getAll().map(o => o.id === olt.id ? olt : o);
    OltStorage.save(list); return list;
  },
  remove: (id: string): OLT[] => {
    const list = OltStorage.getAll().filter(o => o.id !== id);
    OltStorage.save(list); return list;
  },
};

// ── Config ────────────────────────────────────────────────────────────────────
export const ConfigStorage = {
  get: (): AppConfig => {
    try { return { ...DEFAULT_CONFIG, ...JSON.parse(safe.get(KEY_CFG) ?? '{}') }; }
    catch { return DEFAULT_CONFIG; }
  },
  save: (cfg: Partial<AppConfig>) => {
    safe.set(KEY_CFG, JSON.stringify({ ...ConfigStorage.get(), ...cfg }));
  },
};

// ── Logs ──────────────────────────────────────────────────────────────────────
export const LogStorage = {
  getAll: (): any[] => {
    try { return JSON.parse(safe.get(KEY_LOGS) ?? '[]'); } catch { return []; }
  },
  add: (level: 'info' | 'warning' | 'error' | 'success', message: string) => {
    const entry = { id: Date.now().toString(), timestamp: new Date().toLocaleString('pt-BR'), level, message };
    const list = [entry, ...LogStorage.getAll()].slice(0, 200);
    safe.set(KEY_LOGS, JSON.stringify(list));
    return list;
  },
  clear: () => safe.set(KEY_LOGS, '[]'),
};
