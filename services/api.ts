/**
 * Serviço de comunicação com a API PHP do backend.
 * Todos os endpoints ficam em /addons/vsol-optimized/api/index.php
 */

const API_BASE = './api/index.php';

async function apiFetch<T = any>(action: string, options?: RequestInit, params?: Record<string, string>): Promise<T> {
  const url = new URL(API_BASE, window.location.href);
  url.searchParams.set('action', action);
  if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    credentials: 'same-origin', // envia cookies de sessão do MK-Auth
    ...options,
  });

  if (res.status === 401) {
    // Sessão expirou — redireciona para login
    window.location.href = '/admin/login.php';
    throw new Error('Sessão expirada. Redirecionando para login...');
  }

  const data = await res.json();
  return data as T;
}

// ── Banco de Dados ────────────────────────────────────────────────────────────

export interface DbTestResult {
  ok: boolean;
  message: string;
  version?: string;
  dbname?: string;
}

export async function testDatabase(config: {
  mkAuthIp: string;
  dbUser: string;
  dbPass: string;
  dbName: string;
}): Promise<DbTestResult> {
  return apiFetch<DbTestResult>('test_db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
}

// ── ONUs ──────────────────────────────────────────────────────────────────────

export interface OnuListResult {
  ok: boolean;
  message?: string;
  onus: any[];
  total: number;
  tables?: string[];
}

export async function listOnus(): Promise<OnuListResult> {
  return apiFetch<OnuListResult>('list_onus');
}

// ── Ping / Teste de Host ──────────────────────────────────────────────────────

export interface PingResult {
  ok: boolean;
  message: string;
  latency?: string;
}

export async function pingHost(ip: string): Promise<PingResult> {
  return apiFetch<PingResult>('ping_host', undefined, { ip });
}

// ── Backup ────────────────────────────────────────────────────────────────────

export function downloadBackup(): void {
  const url = new URL(API_BASE, window.location.href);
  url.searchParams.set('action', 'backup');
  window.open(url.toString(), '_blank');
}
