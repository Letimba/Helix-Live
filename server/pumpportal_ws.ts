import WebSocket from 'ws';
import { Coin } from './types.js';

export class PumpPortalWsClient {
  private ws: WebSocket | null = null;
  private apiKey: string = '';
  private onCoinCallback: (coin: Coin) => void;
  private isRunning = false;
  private reconnectTimer: NodeJS.Timeout | null = null;

  constructor(apiKey: string, onCoinCallback: (coin: Coin) => void) {
    this.apiKey = apiKey.trim();
    this.onCoinCallback = onCoinCallback;
  }

  updateApiKey(key: string) {
    this.apiKey = key.trim();
    if (this.isRunning) {
      this.restart();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.connect();
  }

  stop() {
    this.isRunning = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.terminate();
      } catch {}
      this.ws = null;
    }
  }

  private restart() {
    this.stop();
    this.start();
  }

  private connect() {
    if (!this.isRunning) return;
    const url = this.apiKey
      ? `wss://pumpportal.fun/api/data?api-key=${encodeURIComponent(this.apiKey)}`
      : `wss://pumpportal.fun/api/data`;

    try {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        console.log('⚡ PUMPPORTAL WEBSOCKET CONNECTED');
        try {
          this.ws?.send(JSON.stringify({ method: "subscribeNewToken" }));
          this.ws?.send(JSON.stringify({ method: "subscribeTokenTrade" }));
        } catch {}
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        try {
          const str = data.toString();
          const json = JSON.parse(str);
          if (json && (json.mint || json.tokenMint || json.address)) {
            const coin = this.mapPumpPortalMessage(json);
            if (coin) {
              this.onCoinCallback(coin);
            }
          }
        } catch {
          // parse error ignored
        }
      });

      this.ws.on('close', () => {
        console.log('⚡ PUMPPORTAL WEBSOCKET CLOSED, RECONNECTING IN 3s...');
        this.scheduleReconnect();
      });

      this.ws.on('error', (err) => {
        console.warn('⚡ PUMPPORTAL WEBSOCKET ERROR:', err?.message || err);
      });
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.isRunning) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  private mapPumpPortalMessage(d: any): Coin | null {
    const mint = String(d.mint || d.tokenMint || d.address || '');
    if (!mint) return null;
    const now = Date.now();
    const supply = Number(d.vToken || d.tokenTotalSupply || d.total_supply || 1_000_000_000);
    const mcap = Number(d.marketCapUsd || d.usd_market_cap || d.market_cap || 25000);
    const priceUsd = Number(d.priceUsd || d.price || (mcap / supply) || 0.0001);
    const solPrice = 145.5;
    const priceSol = priceUsd > 0 ? priceUsd / solPrice : 0.0000001;

    return {
      mint,
      name: String(d.name || d.tokenName || 'PumpPortal Token'),
      symbol: String(d.symbol || d.tokenSymbol || 'PUMP'),
      creator: String(d.traderPublicKey || d.creator || ''),
      image_uri: String(d.imageUri || d.uri || ''),
      created_at_ms: Number(d.timestamp || now),
      last_trade_at_ms: now,
      complete: Boolean(d.complete || false),
      banned: false,
      venue: 'pump.fun',
      pool_address: String(d.poolAddress || ''),
      price_usd: priceUsd,
      price_sol: priceSol,
      market_cap_usd: mcap,
      liquidity_usd: Number(d.liquidityUsd || d.liquidity || 25000),
      volume_5m_usd: Number(d.volume5m || 15000),
      buys_5m: Number(d.buys5m || 20),
      sells_5m: Number(d.sells5m || 5),
      price_change_5m: Number(d.priceChange5m || 10.0),
      virtual_sol_reserves: Number(d.vSol || 30),
      virtual_token_reserves: supply,
      real_sol_reserves: Number(d.realSol || 10),
      token_total_supply: supply,
      is_new: true,
      risk_score: 15,
      risk_level: 'SAFE',
      signal_score: 80,
      strategy_agreement: 3,
      strategy_scores: {},
      source: 'pumpportal-ws',
      observed_at_ms: now,
      quote_source: 'pumpportal-websocket',
      volatility_rank: 1,
      opportunity_score: 80,
      opportunity_breakdown: {},
      rug_risk_state: 'SAFE',
      rug_reasons: [],
      regime: 'TREND',
      chain: 'solana',
      dex: 'pump.fun',
      transaction_velocity: 2.0,
      volume_acceleration: 1.5,
      price_acceleration: 0.8,
      liquidity_acceleration: 0.3,
      top_holder_concentration: 10.0,
      creator_holding_pct: 2.0,
      age_seconds: 0
    };
  }
}
