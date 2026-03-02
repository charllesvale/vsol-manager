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

export async function testTelegram(token: string, chatId: string): Promise<TelegramResult> {
  return apiFetch<TelegramResult>('test_telegram', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, chatId }),
  });
}

export async function sendTelegramAlert(): Promise<TelegramResult> {
  return apiFetch<TelegramResult>('send_telegram');
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
