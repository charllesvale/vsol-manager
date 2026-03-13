export enum OnuBrand {
  HUAWEI = 'Huawei',
  ZTE = 'ZTE',
  NOKIA = 'Nokia',
  FIBERHOME = 'Fiberhome',
  VSOL = 'VSOL',
  INTELBRAS = 'Intelbras'
}

export type OnuStatus = 'online' | 'offline' | 'los' | 'nulo' | 'desligada';
export type SignalLevel = 'bom' | 'limite' | 'ruim' | 'los' | 'nulo';

export interface OLT {
  id: string;
  name: string;
  ip: string;
  model: string;
  fwVersion: string;
  ponPorts: number;
  onlineOnus: number;
  totalOnus: number;
  status: 'online' | 'offline';
  sshUser?: string;
  sshPass?: string;
  sshPort?: number;
  snmpRead?: string;
  snmpWrite?: string;
  snmpPort?: number;
  snmpVersion?: 'v1' | 'v2c';
  notes?: string;
  lastSeen?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

export interface ONU {
  id: string;
  serialNumber: string;
  name: string;
  brand: string;
  model?: string;
  oltId: string;
  ponPort: number;
  signalRx: number;
  signalTx: number;
  status: OnuStatus;
  ip?: string;
  vlan: number;
  updatedAt?: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
}

export interface AppConfig {
  // Banco de Dados
  mkAuthIp: string;
  dbUser: string;
  dbPass: string;
  dbName: string;
  // Operação
  registrosPorPagina: number;
  registrosPorCron: number;
  tempoCheckCron: string;
  sshTimeout: number;
  sshKeepalive: number;
  // Sinal
  sinalBom: number;
  sinalAceitavel: number;
  // Integrações
  googleMapsKey: string;
  telegramAlerta: 'Ativado' | 'Desativado';
  telegramToken: string;
  telegramChatId: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  mkAuthIp: '172.31.255.2',
  dbUser: 'root',
  dbPass: 'vertrigo',
  dbName: 'mk_auth',
  registrosPorPagina: 30,
  registrosPorCron: 50,
  tempoCheckCron: 'A cada 12 horas',
  sshTimeout: 10,
  sshKeepalive: 30,
  sinalBom: -27,
  sinalAceitavel: -30,
  googleMapsKey: '',
  telegramAlerta: 'Desativado',
  telegramToken: '00000000:XXXXXxXXXXXXXXXXXXXX',
  telegramChatId: '-000000000',
};

export function getSignalLevel(rx: number): SignalLevel {
  if (rx === 0 || rx < -40) return 'nulo';
  if (rx < -35) return 'los';
  if (rx <= -30) return 'ruim';
  if (rx <= -27) return 'limite';
  return 'bom';
}

export function getSignalLevelFromConfig(rx: number, config: AppConfig): SignalLevel {
  if (rx === 0 || rx < -40) return 'nulo';
  if (rx < -35) return 'los';
  if (rx <= config.sinalAceitavel) return 'ruim';
  if (rx <= config.sinalBom) return 'limite';
  return 'bom';
}
