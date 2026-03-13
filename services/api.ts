/**
 * VSOL Manager Pro - API Service
 */

const API_BASE = './api/index.php';

async function apiFetch<T = any>(action: string, options?: RequestInit, params?: Record<string, string>): Promise<T> {
  const url = new URL(API_BASE, window.location.href);
  url.searchParams.set('action', action);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { credentials: 'same-origin', ...options });
  if (res.status === 401) { window.location.href = '/admin/login.php'; throw new Error('Sessão expirada.'); }
  return res.json() as Promise<T>;
}

// ── Banco de Dados ────────────────────────────────────────────────────────────
export interface DbTestResult { ok: boolean; message: string; version?: string; dbname?: string; }

export async function testDatabase(config: { mkAuthIp: string; dbUser: string; dbPass: string; dbName: string }): Promise<DbTestResult> {
  return apiFetch<DbTestResult>('test_db', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) });
}

// ── ONUs ──────────────────────────────────────────────────────────────────────
export interface OnuListResult { ok: boolean; message?: string; onus: any[]; total: number; }

export async function listOnus(): Promise<OnuListResult> {
  return apiFetch<OnuListResult>('list_onus');
}

// ── Ping ──────────────────────────────────────────────────────────────────────
export interface PingResult { ok: boolean; message: string; latency?: string; }

export async function pingHost(ip: string): Promise<PingResult> {
  return apiFetch<PingResult>('ping_host', undefined, { ip });
}

// ── Backup ────────────────────────────────────────────────────────────────────
export function downloadBackup(): void {
  const url = new URL(API_BASE, window.location.href);
  url.searchParams.set('action', 'backup');
  window.open(url.toString(), '_blank');
}

// ── Telegram ──────────────────────────────────────────────────────────────────
export interface TelegramResult { ok: boolean; message: string; }

// Usa proxy PHP para enviar mensagens ao Telegram (evita bloqueio CORS/CSP)
async function telegramProxy(token: string, chatId: string, text: string): Promise<TelegramResult> {
  return apiFetch<TelegramResult>('telegram_proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, chatId, text }),
  });
}

export async function testTelegram(token: string, chatId: string): Promise<TelegramResult> {
  const now = new Date().toLocaleString('pt-BR');
  const text = `✅ <b>VSOL Manager Pro</b>\n━━━━━━━━━━━━━━━━\n🤖 Bot configurado com sucesso!\n🕐 ${now}\n━━━━━━━━━━━━━━━━\nVocê receberá alertas de sua rede GPON/EPON aqui.`;
  return telegramProxy(token, chatId, text);
}

export async function sendTelegramAlert(token: string, chatId: string, type: string = 'resumo', data: any = {}): Promise<TelegramResult> {
  const now = new Date().toLocaleString('pt-BR');
  let text = '';
  if (type === 'onu_offline') {
    text = `🔴 <b>ALERTA: ONU/OLT OFFLINE</b>\n━━━━━━━━━━━━━━━━\n📡 OLTs offline: <b>${data.olts_offline || 0}</b>\n🕐 ${now}`;
  } else if (type === 'sinal_critico') {
    text = `⚠️ <b>ALERTA: SINAL CRÍTICO</b>\n━━━━━━━━━━━━━━━━\n📶 ONUs com sinal abaixo do limite\n📡 Total: <b>${data.onus_total || 0}</b>\n🕐 ${now}`;
  } else {
    const status = (data.olts_offline || 0) === 0 ? '🟢 Rede estável' : '🔴 Atenção necessária';
    text = `📊 <b>RESUMO DIÁRIO — VSOL Manager</b>\n━━━━━━━━━━━━━━━━\n${status}\n\n📡 <b>OLTs:</b> ${data.olts_online || 0}/${data.olts_total || 0} online\n📶 <b>ONUs:</b> ${data.onus_online || 0}/${data.onus_total || 0} online\n━━━━━━━━━━━━━━━━\n🕐 ${now}`;
  }
  return telegramProxy(token, chatId, text);
}

// ── Google Maps ───────────────────────────────────────────────────────────────
export interface GeocodeResult { ok: boolean; lat?: number; lng?: number; formatted?: string; message?: string; }
export interface MapsOltsResult { ok: boolean; items: MapsItem[]; mapsKey: string; }
export interface MapsItem {
  type: 'olt' | 'client';
  id: string;
  name: string;
  ip?: string;
  model?: string;
  status?: string;
  address?: string;
  lat: number | null;
  lng: number | null;
}

export async function geocodeAddress(address: string, apiKey?: string): Promise<GeocodeResult> {
  return apiFetch<GeocodeResult>('geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address, apiKey }),
  });
}

export async function getMapsData(): Promise<MapsOltsResult> {
  return apiFetch<MapsOltsResult>('maps_olts');
}

// ── OLT CRUD (banco de dados via API) ─────────────────────────────────────────

export interface OltDbRecord {
  id: number;
  nome: string;
  ip: string;
  usuario: string;
  porta_ssh: number;
  modelo: string;
  ativo: number;
  endereco: string;
  lat: number | null;
  lng: number | null;
  created_at: string;
}

export interface OltListResult { ok: boolean; olts: OltDbRecord[]; message?: string; }
export interface OltSaveResult { ok: boolean; id?: number; message: string; }

export async function listOltsDb(): Promise<OltListResult> {
  return apiFetch<OltListResult>('list_olts');
}

export async function addOltDb(data: {
  nome: string; ip: string; usuario: string; senha: string;
  porta_ssh: number; modelo: string; endereco?: string; lat?: number|null; lng?: number|null;
}): Promise<OltSaveResult> {
  return apiFetch<OltSaveResult>('add_olt', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data),
  });
}

export async function updateOltDb(data: {
  id: number; nome: string; ip: string; usuario: string; senha?: string;
  porta_ssh: number; modelo: string; ativo: number; endereco?: string; lat?: number|null; lng?: number|null;
}): Promise<OltSaveResult> {
  return apiFetch<OltSaveResult>('update_olt', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data),
  });
}

export async function deleteOltDb(id: number): Promise<OltSaveResult> {
  return apiFetch<OltSaveResult>('delete_olt', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id }),
  });
}

// ── SSH Query OLT ─────────────────────────────────────────────────────────────

export interface QueryOltResult {
  ok: boolean; message: string; onus?: any[]; total?: number; online?: number;
}

export async function queryOlt(id: number): Promise<QueryOltResult> {
  return apiFetch<QueryOltResult>('query_olt', {
    method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id }),
  });
}

// ── CTOs ──────────────────────────────────────────────────────────────────────

export async function listCtos() { return apiFetch<any>('list_ctos'); }
export async function addCto(data: any) { return apiFetch<any>('add_cto', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }); }
export async function updateCto(data: any) { return apiFetch<any>('update_cto', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }); }
export async function deleteCto(id: number) { return apiFetch<any>('delete_cto', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id}) }); }
export async function listCtoClients(id_cto: number) { return apiFetch<any>('list_cto_clients', undefined, {id_cto: String(id_cto)}); }
export async function assignClient(data: any) { return apiFetch<any>('assign_client', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }); }
export async function removeClient(data: any) { return apiFetch<any>('remove_client', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) }); }
export async function importKml(file: File) {
  const form = new FormData(); form.append('arquivo', file);
  return apiFetch<any>('import_kml', { method: 'POST', body: form });
}
export async function getAiAnalise() { return apiFetch<any>('ai_analise'); }
export async function getMapsFull() { return apiFetch<any>('maps_full'); }
