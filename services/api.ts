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

// Chama API do Telegram DIRETAMENTE do frontend (sem passar pelo PHP)
async function telegramFetch(token: string, method: string, body: object): Promise<TelegramResult> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return {
      ok: data.ok === true,
      message: data.ok ? 'Mensagem enviada com sucesso!' : (data.description || 'Erro desconhecido'),
    };
  } catch (e: any) {
    return { ok: false, message: 'Erro de conexão: ' + e.message };
  }
}

export async function testTelegram(token: string, chatId: string): Promise<TelegramResult> {
  const now = new Date().toLocaleString('pt-BR');
  return telegramFetch(token, 'sendMessage', {
    chat_id: chatId,
    parse_mode: 'HTML',
    text: `✅ <b>VSOL Manager Pro</b>\n━━━━━━━━━━━━━━━━\n🤖 Bot configurado com sucesso!\n🕐 ${now}\n━━━━━━━━━━━━━━━━\nVocê receberá alertas de sua rede GPON/EPON aqui.`,
  });
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
  return telegramFetch(token, 'sendMessage', { chat_id: chatId, parse_mode: 'HTML', text });
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

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  return apiFetch<GeocodeResult>('geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address }),
  });
}

export async function getMapsData(): Promise<MapsOltsResult> {
  return apiFetch<MapsOltsResult>('maps_olts');
}
