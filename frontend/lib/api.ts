// ====================================================================
// Polymind API client
// ────────────────────────────────────────────────────────────────────
// Handles: bearer auth, automatic refresh, typed responses, errors.
// No mocks. All endpoints map 1:1 to FastAPI routes in backend/app/api/v1.
// ====================================================================

import type {
  ApiError,
  ArbitrageOpportunity,
  BotCreate,
  BotResponse,
  BotUpdate,
  DashboardStats,
  MarketDetail,
  MarketSnapshotPoint,
  MarketSummary,
  NonceResponse,
  PortfolioStats,
  PositionOpen,
  PositionResponse,
  PositionWithMarket,
  SignalWithMarket,
  TokenResponse,
  UserPublic,
  UUID,
  Venue,
  WhalePositionView,
  WhaleSummary,
} from '@/types/api';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';
const API_PREFIX = '/api/v1';

const TOKEN_KEY = 'polymind.token';
const REFRESH_KEY = 'polymind.refresh';
const USER_KEY = 'polymind.user';

// ───────────── token storage ─────────────
export const tokenStore = {
  get(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  },
  getRefresh(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string, user: UserPublic) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TOKEN_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    window.dispatchEvent(new Event('polymind:auth'));
  },
  getUser(): UserPublic | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as UserPublic; } catch { return null; }
  },
  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event('polymind:auth'));
  },
};

// ───────────── http error ─────────────
export class HttpError extends Error {
  status: number;
  detail: ApiError['detail'];
  constructor(status: number, detail: ApiError['detail'], message?: string) {
    super(message ?? (typeof detail === 'string' ? detail : 'Request failed'));
    this.status = status;
    this.detail = detail;
  }
}

// ───────────── core fetch ─────────────
let refreshing: Promise<string | null> | null = null;

async function refreshTokens(): Promise<string | null> {
  if (refreshing) return refreshing;
  const rt = tokenStore.getRefresh();
  if (!rt) return null;
  refreshing = (async () => {
    try {
      const res = await fetch(`${API_BASE}${API_PREFIX}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) {
        tokenStore.clear();
        return null;
      }
      const data = (await res.json()) as TokenResponse;
      tokenStore.set(data.access_token, data.refresh_token, data.user);
      return data.access_token;
    } catch {
      tokenStore.clear();
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

interface FetchOpts extends RequestInit {
  auth?: boolean;
  retry?: boolean;
}

async function apiFetch<T>(path: string, opts: FetchOpts = {}): Promise<T> {
  const { auth = true, retry = true, headers, ...rest } = opts;
  const h: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((headers as Record<string, string>) || {}),
  };
  if (auth) {
    const tok = tokenStore.get();
    if (tok) h.Authorization = `Bearer ${tok}`;
  }
  const res = await fetch(`${API_BASE}${API_PREFIX}${path}`, { ...rest, headers: h });

  if (res.status === 401 && auth && retry) {
    const newTok = await refreshTokens();
    if (newTok) {
      return apiFetch<T>(path, { ...opts, retry: false });
    }
  }

  if (!res.ok) {
    let detail: ApiError['detail'] = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch { /* noop */ }
    throw new HttpError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ───────────── auth ─────────────
export const auth = {
  async phantomNonce(wallet: string): Promise<NonceResponse> {
    return apiFetch<NonceResponse>('/auth/phantom/nonce', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ wallet_address: wallet }),
    });
  },
  async phantomVerify(wallet: string, signature: string, nonce: string): Promise<TokenResponse> {
    const data = await apiFetch<TokenResponse>('/auth/phantom/verify', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ wallet_address: wallet, signature, nonce }),
    });
    tokenStore.set(data.access_token, data.refresh_token, data.user);
    return data;
  },
  async googleVerify(idToken: string): Promise<TokenResponse> {
    const data = await apiFetch<TokenResponse>('/auth/google/verify', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ id_token: idToken }),
    });
    tokenStore.set(data.access_token, data.refresh_token, data.user);
    return data;
  },
  async me(): Promise<UserPublic> {
    return apiFetch<UserPublic>('/auth/me');
  },
  logout() {
    tokenStore.clear();
  },
};

// ───────────── markets ─────────────
export const markets = {
  list(params: { venue?: Venue; category?: string; q?: string; limit?: number } = {}): Promise<MarketSummary[]> {
    const qs = new URLSearchParams();
    if (params.venue) qs.set('venue', params.venue);
    if (params.category) qs.set('category', params.category);
    if (params.q) qs.set('q', params.q);
    if (params.limit) qs.set('limit', String(params.limit));
    const s = qs.toString();
    return apiFetch<MarketSummary[]>(`/markets${s ? `?${s}` : ''}`, { auth: false });
  },
  get(id: UUID): Promise<MarketDetail> {
    return apiFetch<MarketDetail>(`/markets/${id}`, { auth: false });
  },
  history(id: UUID, range: '24h' | '7d' | '30d' | 'all' = '7d'): Promise<MarketSnapshotPoint[]> {
    return apiFetch<MarketSnapshotPoint[]>(`/markets/${id}/history?range=${range}`, { auth: false });
  },
};

// ───────────── signals ─────────────
export const signals = {
  list(params: { source?: string; min_confidence?: number; limit?: number } = {}): Promise<SignalWithMarket[]> {
    const qs = new URLSearchParams();
    if (params.source) qs.set('source', params.source);
    if (params.min_confidence !== undefined) qs.set('min_confidence', String(params.min_confidence));
    if (params.limit) qs.set('limit', String(params.limit));
    const s = qs.toString();
    return apiFetch<SignalWithMarket[]>(`/signals${s ? `?${s}` : ''}`, { auth: false });
  },
  get(id: UUID): Promise<SignalWithMarket> {
    return apiFetch<SignalWithMarket>(`/signals/${id}`, { auth: false });
  },
};

// ───────────── bots ─────────────
export const bots = {
  list(): Promise<BotResponse[]> { return apiFetch<BotResponse[]>('/bots'); },
  get(id: UUID): Promise<BotResponse> { return apiFetch<BotResponse>(`/bots/${id}`); },
  create(payload: BotCreate): Promise<BotResponse> {
    return apiFetch<BotResponse>('/bots', { method: 'POST', body: JSON.stringify(payload) });
  },
  update(id: UUID, payload: BotUpdate): Promise<BotResponse> {
    return apiFetch<BotResponse>(`/bots/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
  },
  delete(id: UUID): Promise<void> {
    return apiFetch<void>(`/bots/${id}`, { method: 'DELETE' });
  },
};

// ───────────── positions ─────────────
export const positions = {
  list(status?: 'open' | 'closed'): Promise<PositionWithMarket[]> {
    const qs = status ? `?status=${status}` : '';
    return apiFetch<PositionWithMarket[]>(`/positions${qs}`);
  },
  open(payload: PositionOpen): Promise<PositionResponse> {
    return apiFetch<PositionResponse>('/positions', { method: 'POST', body: JSON.stringify(payload) });
  },
  close(id: UUID): Promise<PositionResponse> {
    return apiFetch<PositionResponse>(`/positions/${id}/close`, { method: 'POST' });
  },
};

// ───────────── whales ─────────────
export const whales = {
  list(limit = 50): Promise<WhaleSummary[]> {
    return apiFetch<WhaleSummary[]>(`/whales?limit=${limit}`, { auth: false });
  },
  recent(limit = 50): Promise<WhalePositionView[]> {
    return apiFetch<WhalePositionView[]>(`/whales/recent?limit=${limit}`, { auth: false });
  },
  flow(): Promise<{ inflow_24h_usd: number; outflow_24h_usd: number; top_categories: { category: string; volume_usd: number }[] }> {
    return apiFetch('/whales/flow', { auth: false });
  },
};

// ───────────── analytics ─────────────
export const analytics = {
  arbitrage(): Promise<ArbitrageOpportunity[]> {
    return apiFetch<{ items: ArbitrageOpportunity[] }>('/analytics/arbitrage', { auth: false }).then(r => r.items);
  },
  dashboardStats(): Promise<DashboardStats> {
    return apiFetch<DashboardStats>('/analytics/dashboard/stats', { auth: false });
  },
  portfolio(): Promise<PortfolioStats> {
    return apiFetch<PortfolioStats>('/analytics/dashboard/portfolio');
  },
};

// ───────────── websocket ─────────────
export function signalsStream(onMessage: (s: SignalWithMarket) => void): () => void {
  const wsBase = process.env.NEXT_PUBLIC_WS_BASE_URL || API_BASE.replace(/^http/, 'ws');
  const url = `${wsBase}${API_PREFIX}/signals/stream`;
  let ws: WebSocket | null = null;
  let closed = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    if (closed) return;
    try {
      ws = new WebSocket(url);
      ws.onmessage = (ev) => {
        try { onMessage(JSON.parse(ev.data) as SignalWithMarket); }
        catch { /* skip malformed frame */ }
      };
      ws.onclose = () => {
        if (closed) return;
        reconnectTimer = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws?.close();
    } catch {
      reconnectTimer = setTimeout(connect, 3000);
    }
  }
  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    ws?.close();
  };
}

// ───────────── helpers ─────────────
export const api = { auth, markets, signals, bots, positions, whales, analytics };
export { API_BASE };
