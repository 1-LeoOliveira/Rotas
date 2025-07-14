// utils/googleSheetsRoutes.ts - Versão Compatível v2.5
'use client';

import { useState, useEffect, useCallback } from 'react';

// ===== TIPOS TYPESCRIPT =====
export interface RouteData {
  id: number;
  sequencia: string;
  rota: number;
  hrFinalizar: string;
  hrConferencia: string;
  status: 'completed' | 'active' | 'delayed' | 'pending' | 'scheduled';
}

export interface SyncResult {
  sucessos: number;
  falhas: number;
  detalhes: Array<{
    id: number;
    status: 'sucesso' | 'falha' | 'erro';
    erro?: string;
  }>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
  version?: string;
}

export interface RouteStats {
  total: number;
  completed: number;
  active: number;
  delayed: number;
  pending: number;
  scheduled: number;
  taxaConclusao: number;
  taxaAtraso: number;
  taxaAtivos: number;
  ultimaAtualizacao: Date;
  porSequencia: Record<string, any>;
}

export interface ConnectionTest {
  success: boolean;
  details: {
    response?: any;
    apiStatus?: string;
    error?: string;
    stack?: string;
  };
}

// ===== CONFIGURAÇÃO =====
const CONFIG = {
  GOOGLE_SCRIPT_URL: process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || '',
  SPREADSHEET_ID: process.env.NEXT_PUBLIC_GOOGLE_SHEETS_ID || '',
  REQUEST_TIMEOUT: 20000, // Aumentado para 20s
  RETRY_ATTEMPTS: 2, // Reduzido para evitar muitas tentativas
  RETRY_DELAY: 1500, // Delay menor entre tentativas
  AUTO_SYNC_INTERVAL: 10 * 60 * 1000, // Aumentado para 10 minutos
  SYNC_BATCH_SIZE: 5, // Máximo de mudanças por lote
} as const;

// ===== CHAVES PARA LOCALSTORAGE =====
const STORAGE_KEYS = {
  ROUTES: 'rotas_cd_pa_v25',
  PENDING_CHANGES: 'rotas_cd_pa_pending_v25',
  LAST_SYNC: 'rotas_cd_pa_last_sync_v25',
  API_STATUS: 'rotas_cd_pa_api_status_v25',
  OFFLINE_MODE: 'rotas_cd_pa_offline_mode_v25'
} as const;

// ===== DADOS BASE (FALLBACK) =====
const DEFAULT_ROUTES: RouteData[] = [
  { id: 1, sequencia: '1ª ROTA', rota: 665, hrFinalizar: '16:00', hrConferencia: '17:00', status: 'completed' },
  { id: 2, sequencia: '2ª ROTA', rota: 664, hrFinalizar: '19:30', hrConferencia: '20:30', status: 'completed' },
  { id: 3, sequencia: '3ª ROTA', rota: 661, hrFinalizar: '19:30', hrConferencia: '21:30', status: 'delayed' },
  { id: 4, sequencia: '3ª ROTA', rota: 610, hrFinalizar: '19:30', hrConferencia: '21:30', status: 'delayed' },
  { id: 5, sequencia: '3ª ROTA', rota: 612, hrFinalizar: '19:30', hrConferencia: '21:30', status: 'delayed' },
  { id: 6, sequencia: '4ª ROTA', rota: 662, hrFinalizar: '00:00', hrConferencia: '01:00', status: 'pending' },
  { id: 7, sequencia: '4ª ROTA', rota: 670, hrFinalizar: '00:00', hrConferencia: '01:00', status: 'pending' },
  { id: 8, sequencia: '4ª ROTA', rota: 611, hrFinalizar: '00:00', hrConferencia: '01:00', status: 'pending' },
  { id: 9, sequencia: '5ª ROTA', rota: 613, hrFinalizar: '06:00', hrConferencia: '07:00', status: 'active' },
  { id: 10, sequencia: '6ª ROTA', rota: 668, hrFinalizar: '06:00', hrConferencia: '07:00', status: 'active' },
  { id: 11, sequencia: '6ª ROTA', rota: 669, hrFinalizar: '06:00', hrConferencia: '07:00', status: 'active' },
  { id: 12, sequencia: '6ª ROTA', rota: 676, hrFinalizar: '06:00', hrConferencia: '07:00', status: 'active' },
  { id: 13, sequencia: '6ª ROTA', rota: 675, hrFinalizar: '06:00', hrConferencia: '07:00', status: 'active' },
  { id: 14, sequencia: '5ª ROTA', rota: 660, hrFinalizar: '03:00', hrConferencia: '04:00', status: 'active' },
  { id: 15, sequencia: '7ª ROTA', rota: 677, hrFinalizar: '07:00', hrConferencia: '08:00', status: 'scheduled' },
  { id: 16, sequencia: '7ª ROTA', rota: 645, hrFinalizar: '07:00', hrConferencia: '08:00', status: 'scheduled' },
  { id: 17, sequencia: '7ª ROTA', rota: 663, hrFinalizar: '07:00', hrConferencia: '08:00', status: 'scheduled' }
];

// ===== UTILITÁRIOS =====
const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const isValidRoute = (route: any): route is RouteData => {
  return (
    route &&
    typeof route.id === 'number' &&
    typeof route.sequencia === 'string' &&
    typeof route.rota === 'number' &&
    typeof route.hrFinalizar === 'string' &&
    typeof route.hrConferencia === 'string' &&
    ['completed', 'active', 'delayed', 'pending', 'scheduled'].includes(route.status)
  );
};

const sanitizeRoute = (route: Partial<RouteData>): RouteData => {
  return {
    id: Number(route.id) || 0,
    sequencia: String(route.sequencia || '').trim(),
    rota: Number(route.rota) || 0,
    hrFinalizar: String(route.hrFinalizar || '').trim(),
    hrConferencia: String(route.hrConferencia || '').trim(),
    status: ['completed', 'active', 'delayed', 'pending', 'scheduled'].includes(route.status as any) 
      ? route.status as RouteData['status'] 
      : 'scheduled'
  };
};

const logApiCall = (action: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[API-${action}]`, data ? JSON.stringify(data, null, 2) : 'sem dados');
  }
};

// ===== CLASSE PARA GERENCIAR ESTADO =====
class RouteStateManager {
  private static instance: RouteStateManager;
  private routes: RouteData[] = [];
  private pendingChanges: Record<number, Partial<RouteData> & { action?: 'update' | 'delete' | 'create', timestamp?: number }> = {};
  private listeners: Array<() => void> = [];
  private isClient = false;
  private apiStatus: 'online' | 'offline' | 'error' = 'offline';
  private isOfflineMode = false;

  static getInstance(): RouteStateManager {
    if (!RouteStateManager.instance) {
      RouteStateManager.instance = new RouteStateManager();
    }
    return RouteStateManager.instance;
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.isClient = true;
      this.loadFromStorage();
      this.startPeriodicCleanup();
    } else {
      this.routes = [...DEFAULT_ROUTES];
    }
  }

  private startPeriodicCleanup(): void {
    // Limpar mudanças pendentes antigas (mais de 24 horas)
    setInterval(() => {
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      
      Object.keys(this.pendingChanges).forEach(id => {
        const change = this.pendingChanges[parseInt(id)];
        if (change.timestamp && change.timestamp < oneDayAgo) {
          delete this.pendingChanges[parseInt(id)];
          console.log(`[Cleanup] Removendo mudança antiga para rota ${id}`);
        }
      });
      
      this.saveToStorage();
    }, 60 * 60 * 1000); // Verificar a cada hora
  }

  private loadFromStorage(): void {
    if (!this.isClient) return;

    try {
      // Carregar rotas
      const savedRoutes = localStorage.getItem(STORAGE_KEYS.ROUTES);
      if (savedRoutes) {
        const parsedRoutes = JSON.parse(savedRoutes);
        this.routes = parsedRoutes.filter(isValidRoute).map(sanitizeRoute);
        logApiCall('LOAD_ROUTES', `${this.routes.length} rotas carregadas`);
      } else {
        this.routes = [...DEFAULT_ROUTES];
        this.saveToStorage();
      }

      // Carregar mudanças pendentes
      const savedPending = localStorage.getItem(STORAGE_KEYS.PENDING_CHANGES);
      if (savedPending) {
        this.pendingChanges = JSON.parse(savedPending);
        logApiCall('LOAD_PENDING', `${Object.keys(this.pendingChanges).length} mudanças pendentes`);
      }

      // Carregar status da API
      const savedApiStatus = localStorage.getItem(STORAGE_KEYS.API_STATUS);
      if (savedApiStatus) {
        this.apiStatus = savedApiStatus as typeof this.apiStatus;
      }

      // Carregar modo offline
      const savedOfflineMode = localStorage.getItem(STORAGE_KEYS.OFFLINE_MODE);
      this.isOfflineMode = savedOfflineMode === 'true';

    } catch (error) {
      console.error('[StateManager] Erro ao carregar:', error);
      this.routes = [...DEFAULT_ROUTES];
      this.saveToStorage();
    }
  }

  private saveToStorage(): void {
    if (!this.isClient) return;

    try {
      localStorage.setItem(STORAGE_KEYS.ROUTES, JSON.stringify(this.routes));
      localStorage.setItem(STORAGE_KEYS.PENDING_CHANGES, JSON.stringify(this.pendingChanges));
      localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString());
      localStorage.setItem(STORAGE_KEYS.API_STATUS, this.apiStatus);
      localStorage.setItem(STORAGE_KEYS.OFFLINE_MODE, String(this.isOfflineMode));
    } catch (error) {
      console.error('[StateManager] Erro ao salvar:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('[StateManager] Erro no listener:', error);
      }
    });
  }

  // ===== MÉTODOS PÚBLICOS =====
  addListener(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getRoutes(): RouteData[] {
    return [...this.routes];
  }

  getRoute(id: number): RouteData | undefined {
    return this.routes.find(route => route.id === id);
  }

  addRoute(route: Omit<RouteData, 'id'>): number {
    const newId = Math.max(...this.routes.map(r => r.id), 0) + 1;
    const newRoute: RouteData = sanitizeRoute({ ...route, id: newId });
    
    this.routes.push(newRoute);
    this.pendingChanges[newId] = { 
      ...newRoute, 
      action: 'create',
      timestamp: Date.now()
    };
    
    this.saveToStorage();
    this.notifyListeners();
    
    logApiCall('ADD_ROUTE', `Nova rota ${newId} criada`);
    return newId;
  }

  updateRoute(id: number, updates: Partial<RouteData>): boolean {
    const index = this.routes.findIndex(r => r.id === id);
    if (index === -1) return false;

    const updatedRoute = sanitizeRoute({ ...this.routes[index], ...updates, id });
    this.routes[index] = updatedRoute;
    
    // Manter action existente se for 'create', senão usar 'update'
    const existingAction = this.pendingChanges[id]?.action;
    this.pendingChanges[id] = { 
      ...this.pendingChanges[id],
      ...updates, 
      action: existingAction === 'create' ? 'create' : 'update',
      timestamp: Date.now()
    };
    
    this.saveToStorage();
    this.notifyListeners();
    
    logApiCall('UPDATE_ROUTE', `Rota ${id} atualizada`);
    return true;
  }

  deleteRoute(id: number): boolean {
    const index = this.routes.findIndex(r => r.id === id);
    if (index === -1) return false;

    this.routes.splice(index, 1);
    
    // Se era uma rota nova (create), apenas remover das pendentes
    if (this.pendingChanges[id]?.action === 'create') {
      delete this.pendingChanges[id];
    } else {
      this.pendingChanges[id] = { 
        action: 'delete',
        timestamp: Date.now()
      };
    }
    
    this.saveToStorage();
    this.notifyListeners();
    
    logApiCall('DELETE_ROUTE', `Rota ${id} deletada`);
    return true;
  }

  getPendingChanges(): Record<number, Partial<RouteData> & { action?: string; timestamp?: number }> {
    return { ...this.pendingChanges };
  }

  markAsSynced(id: number): void {
    delete this.pendingChanges[id];
    this.saveToStorage();
    logApiCall('MARK_SYNCED', `Rota ${id} marcada como sincronizada`);
  }

  clearAllPendingChanges(): void {
    this.pendingChanges = {};
    this.saveToStorage();
    logApiCall('CLEAR_PENDING', 'Todas as mudanças pendentes foram limpas');
  }

  replaceAllRoutes(routes: RouteData[]): void {
    this.routes = routes.filter(isValidRoute).map(sanitizeRoute);
    this.saveToStorage();
    this.notifyListeners();
    logApiCall('REPLACE_ROUTES', `${routes.length} rotas substituídas`);
  }

  getLastSyncTime(): Date | null {
    if (!this.isClient) return null;
    
    const lastSync = localStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return lastSync ? new Date(lastSync) : null;
  }

  setApiStatus(status: typeof this.apiStatus): void {
    if (this.apiStatus !== status) {
      this.apiStatus = status;
      this.saveToStorage();
      logApiCall('API_STATUS_CHANGE', status);
    }
  }

  getApiStatus(): typeof this.apiStatus {
    return this.apiStatus;
  }

  setOfflineMode(offline: boolean): void {
    this.isOfflineMode = offline;
    this.saveToStorage();
    logApiCall('OFFLINE_MODE', offline ? 'ativado' : 'desativado');
  }

  isInOfflineMode(): boolean {
    return this.isOfflineMode;
  }

  getStatistics(): RouteStats {
    const total = this.routes.length;
    const completed = this.routes.filter(r => r.status === 'completed').length;
    const active = this.routes.filter(r => r.status === 'active').length;
    const delayed = this.routes.filter(r => r.status === 'delayed').length;
    const pending = this.routes.filter(r => r.status === 'pending').length;
    const scheduled = this.routes.filter(r => r.status === 'scheduled').length;

    const porSequencia: Record<string, any> = {};
    const sequences = ['1ª ROTA', '2ª ROTA', '3ª ROTA', '4ª ROTA', '5ª ROTA', '6ª ROTA', '7ª ROTA'];
    
    sequences.forEach(seq => {
      const routesSeq = this.routes.filter(r => r.sequencia === seq);
      porSequencia[seq] = {
        total: routesSeq.length,
        completed: routesSeq.filter(r => r.status === 'completed').length,
        active: routesSeq.filter(r => r.status === 'active').length,
        delayed: routesSeq.filter(r => r.status === 'delayed').length,
        pending: routesSeq.filter(r => r.status === 'pending').length,
        scheduled: routesSeq.filter(r => r.status === 'scheduled').length
      };
    });

    return {
      total,
      completed,
      active,
      delayed,
      pending,
      scheduled,
      taxaConclusao: total > 0 ? Math.round((completed / total) * 100) : 0,
      taxaAtraso: total > 0 ? Math.round((delayed / total) * 100) : 0,
      taxaAtivos: total > 0 ? Math.round((active / total) * 100) : 0,
      ultimaAtualizacao: new Date(),
      porSequencia
    };
  }

  // Método para diagnóstico
  getDiagnostics() {
    return {
      routes: this.routes.length,
      pendingChanges: Object.keys(this.pendingChanges).length,
      apiStatus: this.apiStatus,
      offlineMode: this.isOfflineMode,
      lastSync: this.getLastSyncTime(),
      isClient: this.isClient,
      config: CONFIG
    };
  }
}

// ===== INSTÂNCIA GLOBAL =====
const stateManager = RouteStateManager.getInstance();

// ===== FUNÇÕES DA API COM MELHOR TRATAMENTO DE ERROS =====
async function makeApiRequest<T>(
  url: string, 
  payload: any,
  retryCount = 0
): Promise<ApiResponse<T>> {
  
  logApiCall('REQUEST_START', { url, payload, attempt: retryCount + 1 });
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    const requestOptions: RequestInit = {
      method: 'POST',
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload)
    };

    const response = await fetch(url, requestOptions);
    clearTimeout(timeoutId);

    logApiCall('RESPONSE_RECEIVED', { status: response.status, statusText: response.statusText });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      logApiCall('RESPONSE_NOT_JSON', text.substring(0, 200));
      throw new Error('Resposta não é JSON válido');
    }

    const result = await response.json();
    logApiCall('RESPONSE_PARSED', result);
    
    stateManager.setApiStatus('online');
    return result;
    
  } catch (error) {
    logApiCall('REQUEST_ERROR', { error: error instanceof Error ? error.message : 'Unknown error', attempt: retryCount + 1 });
    
    if (retryCount < CONFIG.RETRY_ATTEMPTS - 1) {
      const delayTime = CONFIG.RETRY_DELAY * (retryCount + 1);
      logApiCall('RETRY_DELAY', `Aguardando ${delayTime}ms antes da próxima tentativa`);
      await delay(delayTime);
      return makeApiRequest(url, payload, retryCount + 1);
    }
    
    stateManager.setApiStatus('error');
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Erro de conectividade. Verifique sua conexão com a internet.');
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Timeout da requisição. O servidor pode estar lento.');
    }
    
    throw error;
  }
}

// ===== FUNÇÕES PÚBLICAS DA API =====
export async function fetchRoutesFromSheet(): Promise<RouteData[]> {
  if (!CONFIG.GOOGLE_SCRIPT_URL) {
    throw new Error('URL do Google Script não configurada');
  }

  logApiCall('FETCH_ROUTES', 'Iniciando busca de rotas');
  
  const result = await makeApiRequest<RouteData[]>(CONFIG.GOOGLE_SCRIPT_URL, {
    action: 'getAllRoutes'
  });
  
  if (result.success && result.data) {
    const validRoutes = result.data.filter(isValidRoute).map(sanitizeRoute);
    logApiCall('FETCH_ROUTES_SUCCESS', `${validRoutes.length} rotas carregadas`);
    return validRoutes;
  } else {
    throw new Error(result.error || 'Erro desconhecido ao buscar rotas');
  }
}

export async function syncRouteToSheet(route: RouteData): Promise<boolean> {
  if (!CONFIG.GOOGLE_SCRIPT_URL) {
    throw new Error('URL do Google Script não configurada');
  }

  logApiCall('SYNC_ROUTE', `Sincronizando rota ${route.id}`);
  
  const result = await makeApiRequest(CONFIG.GOOGLE_SCRIPT_URL, {
    action: 'updateRoute',
    routeData: sanitizeRoute(route)
  });
  
  if (result.success) {
    logApiCall('SYNC_ROUTE_SUCCESS', `Rota ${route.id} sincronizada`);
    stateManager.markAsSynced(route.id);
    return true;
  } else {
    logApiCall('SYNC_ROUTE_ERROR', result.error || 'Erro desconhecido');
    return false;
  }
}

export async function deleteRouteFromSheet(id: number): Promise<boolean> {
  if (!CONFIG.GOOGLE_SCRIPT_URL) {
    throw new Error('URL do Google Script não configurada');
  }

  logApiCall('DELETE_ROUTE', `Deletando rota ${id}`);
  
  const result = await makeApiRequest(CONFIG.GOOGLE_SCRIPT_URL, {
    action: 'deleteRoute',
    routeId: id
  });
  
  if (result.success) {
    logApiCall('DELETE_ROUTE_SUCCESS', `Rota ${id} deletada`);
    stateManager.markAsSynced(id);
    return true;
  } else {
    logApiCall('DELETE_ROUTE_ERROR', result.error || 'Erro desconhecido');
    return false;
  }
}

export async function syncAllPendingChanges(): Promise<SyncResult> {
  const pendingChanges = stateManager.getPendingChanges();
  const changeIds = Object.keys(pendingChanges).map(id => parseInt(id, 10));
  
  if (changeIds.length === 0) {
    logApiCall('SYNC_ALL', 'Nenhuma mudança pendente');
    return { sucessos: 0, falhas: 0, detalhes: [] };
  }

  logApiCall('SYNC_ALL', `Sincronizando ${changeIds.length} mudanças`);
  
  let sucessos = 0;
  let falhas = 0;
  const detalhes: SyncResult['detalhes'] = [];
  const routes = stateManager.getRoutes();

  // Processar em lotes para evitar sobrecarga
  const batchSize = CONFIG.SYNC_BATCH_SIZE;
  for (let i = 0; i < changeIds.length; i += batchSize) {
    const batch = changeIds.slice(i, i + batchSize);
    
    for (const id of batch) {
      const change = pendingChanges[id];
      
      try {
        let success = false;
        
        if (change.action === 'delete') {
          success = await deleteRouteFromSheet(id);
        } else if (change.action === 'create' || change.action === 'update') {
          const route = routes.find(r => r.id === id);
          if (route) {
            success = await syncRouteToSheet(route);
          }
        }
        
        if (success) {
          sucessos++;
          detalhes.push({ id, status: 'sucesso' });
        } else {
          falhas++;
          detalhes.push({ id, status: 'falha', erro: 'Falha na sincronização' });
        }
      } catch (error) {
        falhas++;
        detalhes.push({
          id,
          status: 'erro',
          erro: error instanceof Error ? error.message : 'Erro desconhecido'
        });
      }
      
      // Pequeno delay entre requisições
      await delay(300);
    }
    
    // Delay maior entre lotes
    if (i + batchSize < changeIds.length) {
      await delay(1000);
    }
  }

  logApiCall('SYNC_ALL_COMPLETE', `${sucessos} sucessos, ${falhas} falhas`);
  
  if (sucessos > 0 && falhas === 0) {
    stateManager.clearAllPendingChanges();
  }

  return { sucessos, falhas, detalhes };
}

export async function testGoogleAppsScript(): Promise<ConnectionTest> {
  logApiCall('TEST_CONNECTION', 'Iniciando teste de conexão');
  
  if (!CONFIG.GOOGLE_SCRIPT_URL) {
    return {
      success: false,
      details: { error: 'URL do Google Script não configurada' }
    };
  }

  try {
    const result = await makeApiRequest(CONFIG.GOOGLE_SCRIPT_URL, {
      action: 'test'
    });
    
    logApiCall('TEST_CONNECTION_SUCCESS', result);
    
    return {
      success: true,
      details: {
        response: result,
        apiStatus: 'funcionando'
      }
    };
    
  } catch (error) {
    logApiCall('TEST_CONNECTION_ERROR', error);
    return {
      success: false,
      details: {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      }
    };
  }
}

// ===== HOOK PRINCIPAL =====
export function useGoogleSheetsRoutes() {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isClient, setIsClient] = useState<boolean>(false);

  // Detectar se está no cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Monitorar status online/offline
  useEffect(() => {
    if (!isClient) return;

    const handleOnline = () => {
      setIsOnline(true);
      stateManager.setOfflineMode(false);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      stateManager.setOfflineMode(true);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    setIsOnline(navigator.onLine);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isClient]);

  // Sincronizar estado com o StateManager
  useEffect(() => {
    if (!isClient) return;

    const updateState = () => {
      const currentRoutes = stateManager.getRoutes();
      setRoutes(currentRoutes);
      setLastUpdate(stateManager.getLastSyncTime());
    };

    updateState();
    const removeListener = stateManager.addListener(updateState);
    return removeListener;
  }, [isClient]);

  // Auto-sincronização periódica
  useEffect(() => {
    if (!isOnline || !isClient || !CONFIG.GOOGLE_SCRIPT_URL || stateManager.isInOfflineMode()) return;

    const interval = setInterval(async () => {
      try {
        const pendingChanges = stateManager.getPendingChanges();
        const pendingCount = Object.keys(pendingChanges).length;
        
        if (pendingCount > 0) {
          logApiCall('AUTO_SYNC', `Executando auto-sincronização para ${pendingCount} mudanças`);
          await syncAllPendingChanges();
        }
      } catch (error) {
        console.warn('[Auto-sync] Falha na sincronização automática:', error);
      }
    }, CONFIG.AUTO_SYNC_INTERVAL);

    return () => clearInterval(interval);
  }, [isOnline, isClient]);

  // Callbacks do hook
  const addRoute = useCallback((route: Omit<RouteData, 'id'>): number => {
    return stateManager.addRoute(route);
  }, []);

  const updateRoute = useCallback((id: number, updates: Partial<RouteData>): boolean => {
    return stateManager.updateRoute(id, updates);
  }, []);

  const deleteRoute = useCallback((id: number): boolean => {
    return stateManager.deleteRoute(id);
  }, []);

  const syncWithSheet = useCallback(async (): Promise<SyncResult> => {
    if (stateManager.isInOfflineMode()) {
      throw new Error('Sistema em modo offline. Aguarde a conexão retornar.');
    }

    setLoading(true);
    setError(null);
    
    try {
      logApiCall('SYNC_WITH_SHEET', 'Iniciando sincronização completa');
      
      const syncResult = await syncAllPendingChanges();
      
      // Se todas as mudanças foram sincronizadas com sucesso, recarregar da planilha
      if (syncResult.falhas === 0 && syncResult.sucessos > 0) {
        try {
          const updatedRoutes = await fetchRoutesFromSheet();
          stateManager.replaceAllRoutes(updatedRoutes);
          logApiCall('SYNC_WITH_SHEET_SUCCESS', 'Dados recarregados da planilha');
        } catch (fetchError) {
          console.warn('[Sync] Sincronização ok, mas falha ao recarregar:', fetchError);
        }
      }
      
      setLastUpdate(new Date());
      return syncResult;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro na sincronização';
      logApiCall('SYNC_WITH_SHEET_ERROR', errorMessage);
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const reloadFromSheet = useCallback(async (): Promise<void> => {
    if (stateManager.isInOfflineMode()) {
      throw new Error('Sistema em modo offline. Aguarde a conexão retornar.');
    }

    setLoading(true);
    setError(null);
    
    try {
      logApiCall('RELOAD_FROM_SHEET', 'Recarregando dados da planilha');
      const routesFromSheet = await fetchRoutesFromSheet();
      stateManager.replaceAllRoutes(routesFromSheet);
      setLastUpdate(new Date());
      logApiCall('RELOAD_FROM_SHEET_SUCCESS', `${routesFromSheet.length} rotas recarregadas`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao recarregar';
      logApiCall('RELOAD_FROM_SHEET_ERROR', errorMessage);
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const getStatistics = useCallback((): RouteStats => {
    return stateManager.getStatistics();
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const testConnection = useCallback(async (): Promise<ConnectionTest> => {
    setLoading(true);
    try {
      const result = await testGoogleAppsScript();
      if (result.success) {
        setError(null);
      } else {
        setError(result.details.error || 'Erro no teste de conexão');
      }
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  // Estados calculados
  const pendingChanges = Object.keys(stateManager.getPendingChanges()).length;
  const hasPendingChanges = pendingChanges > 0;
  const apiStatus = stateManager.getApiStatus();
  const isOfflineMode = stateManager.isInOfflineMode();

  const connectionStatus = isOfflineMode 
    ? 'offline' as const
    : isOnline 
      ? (apiStatus === 'online' ? 'connected' as const : 'disconnected' as const)
      : 'offline' as const;

  return {
    // Estados
    routes,
    error,
    lastUpdate,
    isOnline,
    isClient,
    loading,
    pendingChanges,
    hasPendingChanges,
    apiStatus,
    connectionStatus,
    isOfflineMode,
    
    // Ações
    addRoute,
    updateRoute,
    deleteRoute,
    syncWithSheet,
    reloadFromSheet,
    getStatistics,
    clearError,
    testConnection,
    
    // Utilitários
    setOfflineMode: (offline: boolean) => stateManager.setOfflineMode(offline),
    getDiagnostics: () => stateManager.getDiagnostics(),
    forceReload: () => window.location.reload()
  };
}

// ===== CONSTANTES E UTILITÁRIOS PARA EXPORTAÇÃO =====
export const ROUTE_SEQUENCES = [
  '1ª ROTA', '2ª ROTA', '3ª ROTA', '4ª ROTA', 
  '5ª ROTA', '6ª ROTA', '7ª ROTA'
] as const;

export const ROUTE_STATUSES = [
  'completed', 'active', 'delayed', 'pending', 'scheduled'
] as const;

export const STATUS_LABELS: Record<RouteData['status'], string> = {
  completed: 'Concluída',
  active: 'Em Andamento',
  delayed: 'Atrasada',
  pending: 'Pendente',
  scheduled: 'Agendada'
};

export const STATUS_COLORS: Record<RouteData['status'], string> = {
  completed: '#10B981',
  active: '#3B82F6',
  delayed: '#EF4444',
  pending: '#F59E0B',
  scheduled: '#8B5CF6'
};

export const SEQUENCE_COLORS: Record<string, string> = {
  '1ª ROTA': '#3B82F6',
  '2ª ROTA': '#6366F1',
  '3ª ROTA': '#EF4444',
  '4ª ROTA': '#F59E0B',
  '5ª ROTA': '#10B981',
  '6ª ROTA': '#06B6D4',
  '7ª ROTA': '#F97316'
};

export const RouteUtils = {
  isValidRoute,
  sanitizeRoute,
  
  exportToJSON: (): string => {
    const routes = stateManager.getRoutes();
    const stats = stateManager.getStatistics();
    const diagnostics = stateManager.getDiagnostics();
    
    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '2.5',
      summary: { 
        totalRoutes: routes.length, 
        ...stats 
      },
      diagnostics,
      routes,
      pendingChanges: stateManager.getPendingChanges()
    };
    return JSON.stringify(exportData, null, 2);
  },
  
  importFromJSON: (jsonData: string): { success: boolean; imported: number; errors: string[] } => {
    try {
      const data = JSON.parse(jsonData);
      if (!data.routes || !Array.isArray(data.routes)) {
        return { success: false, imported: 0, errors: ['Formato JSON inválido'] };
      }
      
      const errors: string[] = [];
      let imported = 0;
      
      data.routes.forEach((route: any, index: number) => {
        try {
          if (isValidRoute(route)) {
            stateManager.addRoute(route);
            imported++;
          } else {
            errors.push(`Rota ${index + 1}: dados inválidos`);
          }
        } catch (err) {
          errors.push(`Rota ${index + 1}: ${err instanceof Error ? err.message : 'erro desconhecido'}`);
        }
      });
      
      return { success: imported > 0, imported, errors };
    } catch (err) {
      return { 
        success: false, 
        imported: 0, 
        errors: [`Erro ao fazer parse do JSON: ${err instanceof Error ? err.message : 'erro desconhecido'}`] 
      };
    }
  },

  // Utilitário para backup e restore
  createBackup: (): string => {
    const backup = {
      timestamp: new Date().toISOString(),
      routes: stateManager.getRoutes(),
      pendingChanges: stateManager.getPendingChanges(),
      statistics: stateManager.getStatistics()
    };
    return JSON.stringify(backup, null, 2);
  },

  restoreFromBackup: (backupData: string): { success: boolean; error?: string } => {
    try {
      const backup = JSON.parse(backupData);
      if (backup.routes && Array.isArray(backup.routes)) {
        stateManager.replaceAllRoutes(backup.routes);
        return { success: true };
      } else {
        return { success: false, error: 'Backup inválido' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  },

  // Validações úteis
  validateRoute: (route: Partial<RouteData>): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (!route.sequencia || !route.sequencia.trim()) {
      errors.push('Sequência é obrigatória');
    }
    
    if (!route.rota || route.rota <= 0) {
      errors.push('Número da rota deve ser maior que zero');
    }
    
    if (!route.hrFinalizar || !route.hrFinalizar.match(/^\d{2}:\d{2}$/)) {
      errors.push('Hora de finalizar deve estar no formato HH:MM');
    }
    
    if (!route.hrConferencia || !route.hrConferencia.match(/^\d{2}:\d{2}$/)) {
      errors.push('Hora de conferência deve estar no formato HH:MM');
    }
    
    if (route.status && !ROUTE_STATUSES.includes(route.status as any)) {
      errors.push('Status inválido');
    }
    
    return { valid: errors.length === 0, errors };
  },

  // Utilitários de formatação
  formatTime: (time: string): string => {
    if (!time || !time.includes(':')) return time;
    const [hours, minutes] = time.split(':');
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
  },

  getStatusBadgeClass: (status: RouteData['status']): string => {
    const classes = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      active: 'bg-blue-100 text-blue-800 border-blue-200',
      delayed: 'bg-red-100 text-red-800 border-red-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      scheduled: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return classes[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// ===== FUNÇÕES DE DEBUG MELHORADAS =====
if (typeof window !== 'undefined') {
  (window as any).debugRoutes = {
    // Testes e diagnósticos
    testScript: testGoogleAppsScript,
    diagnose: () => stateManager.getDiagnostics(),
    
    // Manipulação de dados
    getRoutes: () => stateManager.getRoutes(),
    getPendingChanges: () => stateManager.getPendingChanges(),
    getStatistics: () => stateManager.getStatistics(),
    
    // Sincronização
    syncChanges: syncAllPendingChanges,
    fetchFromSheet: fetchRoutesFromSheet,
    
    // Utilitários
    clearPending: () => stateManager.clearAllPendingChanges(),
    resetToDefault: () => stateManager.replaceAllRoutes([...DEFAULT_ROUTES]),
    
    // Import/Export
    exportJSON: RouteUtils.exportToJSON,
    createBackup: RouteUtils.createBackup,
    
    // Configuração
    getConfig: () => CONFIG,
    toggleOfflineMode: () => {
      const current = stateManager.isInOfflineMode();
      stateManager.setOfflineMode(!current);
      console.log(`Modo offline ${!current ? 'ATIVADO' : 'DESATIVADO'}`);
    },
    
    // Storage
    clearStorage: () => {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('🗑️ Storage limpo - Recarregue a página');
    },
    
    // Logs
    enableDebugLogs: () => {
      localStorage.setItem('debug_routes', 'true');
      console.log('🔍 Debug logs ativados');
    },
    
    disableDebugLogs: () => {
      localStorage.removeItem('debug_routes');
      console.log('🔇 Debug logs desativados');
    },

    // Simular cenários de teste
    simulateNetworkError: () => {
      stateManager.setApiStatus('error');
      console.log('🚫 Simulando erro de rede');
    },

    simulateOffline: () => {
      stateManager.setOfflineMode(true);
      console.log('📶 Simulando modo offline');
    },

    // Helpers para desenvolvimento
    addSampleRoute: () => {
      const sampleRoute = {
        sequencia: '1ª ROTA',
        rota: Math.floor(Math.random() * 1000) + 100,
        hrFinalizar: '08:00',
        hrConferencia: '09:00',
        status: 'scheduled' as const
      };
      const id = stateManager.addRoute(sampleRoute);
      console.log(`✅ Rota de exemplo ${id} adicionada`);
      return id;
    },

    // Status do sistema
    systemStatus: () => {
      const diagnostics = stateManager.getDiagnostics();
      console.table(diagnostics);
      return diagnostics;
    }
  };
  
  console.log('🔧 Debug Routes API v2.5 disponível em window.debugRoutes');
  console.log('📋 Comandos disponíveis:');
  console.log('  - debugRoutes.diagnose() - Diagnóstico completo');
  console.log('  - debugRoutes.testScript() - Testar conexão');
  console.log('  - debugRoutes.systemStatus() - Status do sistema');
  console.log('  - debugRoutes.exportJSON() - Exportar dados');
  console.log('  - debugRoutes.toggleOfflineMode() - Alternar modo offline');
}

// ===== EXPORTAR INSTÂNCIA DO STATE MANAGER =====
export { stateManager as routeStateManager };

// ===== LOG DE INICIALIZAÇÃO =====
console.log('🚀 Google Sheets Routes API v2.5 carregado');
console.log(`🔧 Configuração: Script URL ${CONFIG.GOOGLE_SCRIPT_URL ? '✅ configurado' : '❌ não configurado'}`);
console.log(`📊 Dados base: ${DEFAULT_ROUTES.length} rotas de exemplo`);
console.log(`⚙️ Timeouts: Request ${CONFIG.REQUEST_TIMEOUT}ms, Retry ${CONFIG.RETRY_ATTEMPTS}x`);
console.log('✅ API pronta para uso!');

// Verificar configuração inicial
if (typeof window !== 'undefined') {
  if (!CONFIG.GOOGLE_SCRIPT_URL) {
    console.warn('⚠️ AVISO: NEXT_PUBLIC_GOOGLE_SCRIPT_URL não configurada');
    console.log('📋 Configure no arquivo .env.local para habilitar sincronização');
  }
}