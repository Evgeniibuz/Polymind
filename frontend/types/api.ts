// ====================================================================
// API types — must match backend pydantic schemas (app/schemas/*)
// ====================================================================

export type UUID = string;
export type Decimal = string; // pydantic Decimal → JSON string
export type ISODateTime = string;

// ───────────── auth ─────────────
export interface UserPublic {
  id: UUID;
  email: string | null;
  display_name: string | null;
  wallet_address: string | null;
  google_id: string | null;
  is_active: boolean;
  is_pro: boolean;
  created_at: ISODateTime;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer';
  expires_in: number;
  user: UserPublic;
}

export interface NonceResponse {
  nonce: string;
  message: string;
  expires_at: ISODateTime;
}

// ───────────── markets ─────────────
export type MarketStatus = 'open' | 'closed' | 'resolved' | 'paused';
export type Venue = 'polymarket' | 'kalshi';

export interface MarketSummary {
  id: UUID;
  external_id: string;
  venue: Venue;
  slug: string;
  question: string;
  category: string | null;
  yes_price: Decimal;
  no_price: Decimal;
  volume_24h: Decimal;
  liquidity: Decimal;
  ends_at: ISODateTime | null;
  status: MarketStatus;
}

export interface MarketDetail extends MarketSummary {
  description: string | null;
  outcomes: { label: string; price: Decimal }[];
  open_interest: Decimal;
  total_volume: Decimal;
  resolution_source: string | null;
  created_at: ISODateTime;
}

export interface MarketSnapshotPoint {
  t: ISODateTime;
  yes_price: number;
  no_price: number;
  volume: number;
}

// ───────────── signals ─────────────
export type SignalDirection = 'buy_yes' | 'buy_no' | 'hold';
export type SignalSource = 'twitter' | 'telegram' | 'reddit' | 'news' | 'onchain' | 'youtube' | 'composite';

export interface SignalWithMarket {
  id: UUID;
  market_id: UUID;
  direction: SignalDirection;
  source: SignalSource;
  confidence: number; // 0..1
  edge: number;       // computed edge (e.g. 0.18 = 18%)
  reasoning: string;
  evidence: { url: string; title: string; source: string }[];
  market: MarketSummary;
  created_at: ISODateTime;
}

// ───────────── bots ─────────────
export type BotStatus = 'idle' | 'running' | 'paused' | 'error';
export type BotKind = 'event_scanner' | 'whale_follower' | 'mispricing' | 'news_arb' | 'custom';

export interface BotConfig {
  kind: BotKind;
  budget_usd: number;
  min_confidence: number;     // 0..1
  min_edge: number;           // 0..1
  categories: string[];
  venues: Venue[];
  max_position_usd: number;
  auto_execute: boolean;
}

export interface BotResponse {
  id: UUID;
  user_id: UUID;
  name: string;
  status: BotStatus;
  config: BotConfig;
  pnl_total: Decimal;
  pnl_24h: Decimal;
  trades_total: number;
  win_rate: number; // 0..1
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

export interface BotCreate {
  name: string;
  config: BotConfig;
}

export interface BotUpdate {
  name?: string;
  status?: BotStatus;
  config?: Partial<BotConfig>;
}

// ───────────── positions ─────────────
export type PositionSide = 'yes' | 'no';
export type PositionStatus = 'open' | 'closed';

export interface PositionResponse {
  id: UUID;
  user_id: UUID;
  market_id: UUID;
  bot_id: UUID | null;
  side: PositionSide;
  shares: Decimal;
  entry_price: Decimal;
  current_price: Decimal;
  exit_price: Decimal | null;
  pnl: Decimal;
  status: PositionStatus;
  opened_at: ISODateTime;
  closed_at: ISODateTime | null;
}

export interface PositionWithMarket extends PositionResponse {
  market: MarketSummary;
}

export interface PositionOpen {
  market_id: UUID;
  side: PositionSide;
  shares: number;
  limit_price?: number;
}

// ───────────── whales ─────────────
export interface WhaleSummary {
  address: string;
  display: string | null;
  total_volume_usd: Decimal;
  open_value_usd: Decimal;
  realized_pnl_usd: Decimal;
  win_rate: number;
  positions_count: number;
  last_seen: ISODateTime;
}

export interface WhalePositionView {
  whale: WhaleSummary;
  market: MarketSummary;
  side: PositionSide;
  shares: Decimal;
  entry_price: Decimal;
  notional_usd: Decimal;
  opened_at: ISODateTime;
}

// ───────────── analytics ─────────────
export interface ArbitrageOpportunity {
  id: string;
  market_a: MarketSummary;
  market_b: MarketSummary;
  edge_pct: number;
  required_capital_usd: number;
  expires_at: ISODateTime | null;
}

export interface DashboardStats {
  markets_tracked: number;
  signals_24h: number;
  active_bots: number;
  whales_tracked: number;
  total_volume_24h_usd: number;
}

export interface PortfolioStats {
  equity_usd: number;
  pnl_24h_usd: number;
  pnl_total_usd: number;
  open_positions: number;
  win_rate: number;
  best_trade_usd: number;
  worst_trade_usd: number;
}

// ───────────── common ─────────────
export interface ApiError {
  detail: string | { msg: string; loc?: string[]; type: string }[];
  status?: number;
}
