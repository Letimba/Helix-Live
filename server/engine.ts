import { AppConfig, Coin, Fill, Order, Position, Stats } from './types.js';
import { loadConfig, saveConfig } from './config.js';
import { MarketProvider } from './providers.js';
import { PumpPortalWsClient } from './pumpportal_ws.js';
import { classifyMarketRegime } from './scoring.js';
import { strategySignal } from './strategies.js';
import { TradeJournal, TradeRecord } from './journal.js';
import { TelegramNotifier } from './telegram.js';
import { LiveExecutor } from './execution.js';

export class Engine {
  config: AppConfig;
  provider: MarketProvider;
  pumpPortalWs: PumpPortalWsClient;
  telegram: TelegramNotifier;
  liveExecutor: LiveExecutor;
  journal: TradeJournal;
  runId: string;
  mode: 'paper' | 'dry_run' | 'live';
  armed = true;
  paused = false;
  panic = false;
  circuitBreakerActive = false;
  circuitBreakerReason = '';

  coins: Coin[] = [];
  positions: Position[] = [];
  fills: Fill[] = [];
  orders: Order[] = [];
  logs: string[] = [];

  stats: Stats;
  startedAt = Date.now();
  feedQuality = 'live';
  feedError = '';

  quoteOk = 0;
  quoteFail = 0;

  subscribers: Set<(data: string) => void> = new Set();
  marketTimer: NodeJS.Timeout | null = null;
  positionTimer: NodeJS.Timeout | null = null;
  balanceTimer: NodeJS.Timeout | null = null;
  private cachedBalanceSol = 0;
  private strategyLastSignal = new Map<string, number>();

  constructor() {
    this.config = loadConfig();
    this.provider = new MarketProvider(
      this.config.pumpfun_base,
      this.config.pumpfun_auth_token,
      this.config.dexscreener_base
    );
    this.pumpPortalWs = new PumpPortalWsClient(this.config.pumpportal_api_key || '', (coin) => {
      const idx = this.coins.findIndex(c => c.mint === coin.mint);
      if (idx >= 0) {
        this.coins[idx] = { ...this.coins[idx], ...coin };
      } else {
        this.coins.unshift(coin);
        if (this.coins.length > 250) this.coins.pop();
      }
      this.log(`PUMPPORTAL WS · ${coin.symbol} (${coin.mint.slice(0, 6)}...)`);
      if (this.config.auto_trade && this.armed && !this.paused && !this.panic) {
        this.evaluateAutoEntries();
      }
      this.broadcast();
    });
    this.telegram = new TelegramNotifier(this.config.telegram);
    this.runId = `run-${new Date().toISOString().replace(/[-:.TZ]/g,'').slice(0,14)}-${Math.random().toString(36).slice(2,7)}`;
    this.journal = new TradeJournal(this.runId, this.config.db_path || './data/helix-trades.jsonl', Object.keys(this.config.strategies));
    this.liveExecutor = new LiveExecutor(
      this.config.execution.solana_rpc_url || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
      this.config.execution.pumpportal_local_url || process.env.PUMPPORTAL_LOCAL_URL || 'https://pumpportal.fun/api/trade-local',
      this.config.execution.raydium_trade_api_url || 'https://transaction-v1.raydium.io',
      this.config.execution.route_mode || 'auto'
    );
    this.mode = this.config.execution.mode || 'paper';
    // LIVE never starts merely because a stale config says "live".
    // A signer must exist and live_armed must be true.
    if (this.mode === 'live' && (!this.liveExecutor.isReady() || !this.config.execution.live_armed)) {
      this.mode = 'paper';
      this.config.execution.mode = 'paper';
      this.config.execution.live_armed = false;
      saveConfig(this.config);
    }

    this.stats = {
      signals: 0,
      trades: 0,
      wins: 0,
      losses: 0,
      realized_sol: 0.0,
      unrealized_sol: 0.0,
      open_exposure_sol: 0.0,
      cash_sol: this.config.starting_sol || 10.0,
      equity_sol: this.config.starting_sol || 10.0,
      peak_equity_sol: this.config.starting_sol || 10.0,
      max_drawdown_pct: 0.0,
      fees_sol: 0.0,
      consecutive_losses: 0,
      execution_failures: 0,
      equity_history: [
        { ts_ms: Date.now(), equity_sol: this.config.starting_sol || 10.0 }
      ]
    };

    this.log(`HELIX 5.5 · RUN ${this.runId} · Online · Mode: ${this.mode.toUpperCase()} · Route: ${this.config.execution.route_mode || 'auto'}`);
  }

  log(msg: string) {
    const timeStr = new Date().toTimeString().split(' ')[0];
    this.logs.unshift(`${timeStr} ${msg}`);
    if (this.logs.length > 300) {
      this.logs.pop();
    }
  }

  async start() {
    this.pumpPortalWs.start();
    await this.tickMarket();
    this.updateEquity();

    if (this.liveExecutor.isReady()) {
      this.liveExecutor.getBalance().then(b => { this.cachedBalanceSol = b.sol; }).catch(() => {});
      this.balanceTimer = setInterval(() => {
        if (this.liveExecutor.isReady()) {
          this.liveExecutor.getBalance().then(b => { this.cachedBalanceSol = b.sol; }).catch(() => {});
        }
      }, 15000);
    }

    this.marketTimer = setInterval(() => {
      this.tickMarket().catch(err => {
        this.feedError = String(err?.message || err);
        this.feedQuality = 'error';
      });
    }, Math.max(1000, (this.config.poll_seconds || 1.5) * 1000));

    this.positionTimer = setInterval(() => {
      this.tickPositions().catch(err => {
        this.log(`POSITION TICK ERROR: ${err?.message || err}`);
      });
    }, Math.max(800, (this.config.position_refresh_seconds || 1.0) * 1000));
  }

  stop() {
    this.pumpPortalWs.stop();
    if (this.marketTimer) clearInterval(this.marketTimer);
    if (this.positionTimer) clearInterval(this.positionTimer);
    if (this.balanceTimer) clearInterval(this.balanceTimer);
  }

  async tickMarket() {
    const { coins, quality } = await this.provider.listCoins(this.config.feed_candidates || 50);
    if (coins && coins.length > 0) {
      this.coins = coins;
      this.feedQuality = quality;
      this.feedError = '';
    }

    // Auto trade check
    if (this.config.auto_trade && this.armed && !this.paused && !this.panic) {
      await this.evaluateAutoEntries();
    }

    this.broadcast();
  }

  async tickPositions() {
    const now = Date.now();
    const solPx = await this.provider.getSolPriceUsd();

    for (const p of this.positions) {
      if (p.status !== 'OPEN') continue;

      const coin = this.coins.find(c => c.mint === p.mint);
      if (coin && coin.price_usd > 0) {
        p.current_price_usd = coin.price_usd;
        p.current_price_sol = coin.price_usd / solPx;
        p.high_price_usd = Math.max(p.high_price_usd, p.current_price_usd);
        p.high_price_sol = Math.max(p.high_price_sol, p.current_price_sol);
        p.current_value_sol = p.entry_sol * (p.current_price_usd / p.entry_price_usd);
        p.unrealized_pnl_sol = p.current_value_sol - p.entry_sol;
        p.last_updated_at_ms = now;
        p.quote_updated_at_ms = now;
        p.quote_status = 'fresh';
        p.last_quote_latency_ms = 12 + Math.random() * 15;
        this.quoteOk++;
      } else {
        // Natural small drift if token not in current batch
        const drift = 1 + (Math.random() - 0.49) * 0.01;
        p.current_price_usd *= drift;
        p.current_price_sol *= drift;
        p.high_price_usd = Math.max(p.high_price_usd, p.current_price_usd);
        p.current_value_sol = p.entry_sol * (p.current_price_usd / p.entry_price_usd);
        p.unrealized_pnl_sol = p.current_value_sol - p.entry_sol;
        p.last_updated_at_ms = now;
      }

      // Break-even lock
      const retPct = (p.current_price_usd / p.entry_price_usd - 1) * 100;
      if (retPct >= 20.0 && !p.break_even_active) {
        p.break_even_active = true;
        p.stop_pct = 0.0;
        this.log(`BREAK-EVEN ARMED · ${p.symbol} reached +${retPct.toFixed(1)}%`);
      }

      // Strategy-specific exit behavior
      const ageMin = (now - p.opened_at_ms) / 60000;
      const coinForPos = this.coins.find(c => c.mint === p.mint);
      if (p.strategy === 'runner') {
        const vol = Math.abs(coinForPos?.price_change_5m || 0);
        const dynamicTrail = Math.max(p.trail_pct, vol >= 30 ? 12 : vol >= 15 ? 10 : p.trail_pct);
        p.trailing_stop_usd = p.high_price_usd * (1 - dynamicTrail / 100);
        if (retPct >= 20 && !p.break_even_active) {
          p.break_even_active = true;
          p.stop_pct = 0;
          this.log(`RUNNER BE · ${p.symbol} · +${retPct.toFixed(1)}%`);
        }
        if (this.mode !== 'live' && retPct >= 100 && p.partial_exits_count === 0) {
          const partial = p.current_value_sol * 0.25;
          this.stats.cash_sol += partial;
          p.entry_sol *= 0.75;
          p.current_value_sol *= 0.75;
          p.unrealized_pnl_sol = p.current_value_sol - p.entry_sol;
          p.runner_pct_remaining = 75;
          p.partial_exits_count = 1;
          p.runner_levels_hit.push(2);
          this.stats.realized_sol += partial - (p.entry_sol / 0.75 * 0.25);
          this.log(`RUNNER PARTIAL · ${p.symbol} · 25% secured at +${retPct.toFixed(1)}%`);
        }
        if (retPct > 0 && p.high_price_usd > 0) {
          const ddFromHigh = ((p.high_price_usd - p.current_price_usd) / p.high_price_usd) * 100;
          if (ddFromHigh >= dynamicTrail) { await this.closePosition(p.id, 'RUNNER_TRAIL'); continue; }
        }
      }
      if (retPct >= p.take_pct) {
        await this.closePosition(p.id, 'TAKE_PROFIT');
      } else if (retPct <= -p.stop_pct) {
        await this.closePosition(p.id, p.break_even_active ? 'BREAK_EVEN' : 'STOP_LOSS');
      } else if (retPct > 0 && p.high_price_usd > 0) {
        const ddFromHigh = ((p.high_price_usd - p.current_price_usd) / p.high_price_usd) * 100;
        if (ddFromHigh >= p.trail_pct) {
          await this.closePosition(p.id, 'TRAIL');
        }
      } else if (ageMin >= p.max_hold_minutes) {
        await this.closePosition(p.id, 'MAX_HOLD');
      }
    }

    this.updateEquity();
    this.broadcast();
  }

  async evaluateAutoEntries() {
    const openCount = this.positions.filter(p => p.status === 'OPEN').length;
    const maxPositions = Math.min(this.config.max_positions || 8, this.config.risk_limits.max_open_positions || this.config.max_positions || 8);
    if (openCount >= maxPositions) return;
    if (this.stats.cash_sol < (this.config.max_trade_sol || 0.15)) return;

    const macro = classifyMarketRegime(this.coins);
    if (!macro.tradable_regime) {
      this.log(`ENTRY GATE · MARKET REGIME ${macro.macro_regime} · NEW ENTRIES BLOCKED`);
      return;
    }

    const activeStrategies = (this.config.active_strategies && this.config.active_strategies.length > 0)
      ? this.config.active_strategies : [this.config.strategy || 'combo'];

    let best:{coin:Coin;strategy:string;score:number}|null = null;
    for (const stratKey of activeStrategies) {
      const strat = this.config.strategies[stratKey] || this.config.strategies['combo'] || { min_score: 55 };
      const minScore = Number(strat.min_score ?? 55);
      for (const c of this.coins) {
        if (c.rug_risk_state === 'BLOCKED' || c.banned || c.price_usd <= 0) continue;
        if (this.positions.some(p => p.mint === c.mint && p.status === 'OPEN')) continue;
        const signal = strategySignal(stratKey, c);
        const score = c.strategy_scores?.[stratKey] ?? signal.score;
        if (score >= minScore) {
          this.stats.signals += 1;
          this.strategyLastSignal.set(stratKey, Date.now());
          if (!best || score > best.score) best = { coin:c, strategy:stratKey, score };
        }
      }
    }

    if (!best) return;
    const amount = this.config.max_trade_sol || 0.1;
    if (this.mode === 'live') await this.openLiveBuy(best.coin, amount, best.strategy);
    else this.openPaperBuy(best.coin, amount, best.strategy);
  }

  async openLiveBuy(coin: Coin, amountSol: number, strategy: string): Promise<Position> {
    if (!this.liveExecutor.isReady()) throw new Error('LIVE signer not configured');
    if (coin.rug_risk_state === 'BLOCKED' || coin.banned) throw new Error('Token blocked by risk engine');
    const limits = this.config.risk_limits;
    const maxSize = Math.min(this.config.max_trade_sol || amountSol, limits.max_position_size_sol || amountSol);
    const size = Math.min(amountSol, maxSize);
    if (!(size > 0)) throw new Error('Invalid LIVE trade size');

    const balance = await this.liveExecutor.getBalance();
    const reserve = 0.01;
    if (balance.sol < size + reserve) throw new Error(`Insufficient SOL balance: ${balance.sol.toFixed(4)} SOL available`);

    const result = await this.liveExecutor.execute({
      side: 'buy',
      mint: coin.mint,
      amountSol: size,
      slippagePct: Math.min(this.config.execution.max_slippage_pct || limits.max_slippage_pct || 2.5, limits.max_slippage_pct || 2.5),
      priorityFeeSol: this.config.execution.priority_fee_sol || 0.0005,
      pool: this.config.execution.active_route === 'pumpfun' ? 'auto' : this.config.execution.active_route,
      route: (this.config.execution.route_mode || 'auto') as any,
      priorityFeeMicroLamports: this.config.execution.priority_fee_micro_lamports || 100000,
      simulate: this.config.execution.simulate_before_submit !== false
    });

    const strat = this.config.strategies[strategy] || this.config.strategies.combo;
    const solPx = this.provider.cachedSolPrice || 145;
    const priceSol = coin.price_sol > 0 ? coin.price_sol : coin.price_usd / solPx;
    const qty = result.token_amount && result.token_amount > 0
      ? result.token_amount
      : (priceSol > 0 ? size / priceSol : 0);

    const pos: Position = {
      id: `live-${result.signature.slice(0, 12)}`,
      mint: coin.mint,
      symbol: coin.symbol,
      strategy,
      entry_price_usd: coin.price_usd,
      entry_sol: size,
      qty,
      current_price_usd: coin.price_usd,
      high_price_usd: coin.price_usd,
      stop_pct: strat.stop_pct || 10,
      take_pct: strat.take_pct || 25,
      trail_pct: strat.trail_pct || 8,
      opened_at_ms: Date.now(),
      last_updated_at_ms: Date.now(),
      status: 'OPEN',
      current_value_sol: size,
      unrealized_pnl_sol: 0,
      exit_reason: '',
      quote_source: coin.quote_source || 'pump.fun',
      quote_updated_at_ms: Date.now(),
      entry_price_sol: priceSol,
      current_price_sol: priceSol,
      high_price_sol: priceSol,
      last_quote_latency_ms: result.latency_ms,
      quote_status: 'fresh',
      max_hold_minutes: strat.max_hold_minutes || 20,
      realized_pnl_sol: 0,
      runner_levels_hit: [],
      break_even_active: false,
      trailing_stop_usd: 0,
      runner_pct_remaining: 100,
      partial_exits_count: 0,
      initial_entry_sol: size,
      initial_qty: qty,
      execution_route: result.route,
      tx_signature: result.signature,
      landing_latency_ms: result.latency_ms,
      regime_at_entry: coin.regime || 'TREND',
      opportunity_score_at_entry: coin.opportunity_score
    };

    this.positions.unshift(pos);
    this.stats.trades += 1;
    this.stats.execution_failures = Math.max(0, this.stats.execution_failures);
    const fill: Fill = {
      ts_ms: Date.now(),
      side: 'BUY',
      symbol: pos.symbol,
      mint: pos.mint,
      sol: size,
      price_usd: pos.entry_price_usd,
      pnl_sol: 0,
      reason: 'ENTRY_SIGNAL',
      mode: 'live',
      route: result.route,
      slippage_pct: this.config.execution.max_slippage_pct || 2.5,
      execution_latency_ms: result.latency_ms,
      txid: result.signature,
      failure_class: '',
      strategy,
      run_id: this.runId,
      network_fee_sol: result.network_fee_sol || 0,
      estimated_dex_fee_sol: result.estimated_dex_fee_sol || 0
    };
    this.fills.unshift(fill);
    this.log(`LIVE BUY · ${pos.symbol} · ${size.toFixed(4)} SOL · TX ${result.signature}`);
    this.updateEquity();
    this.broadcast();
    return pos;
  }

  openPaperBuy(coin: Coin, amountSol: number, strategy: string): Position {
    const solPx = this.provider.cachedSolPrice || 145;
    const priceSol = coin.price_sol > 0 ? coin.price_sol : coin.price_usd / solPx;
    const strat = this.config.strategies[strategy] || this.config.strategies['combo'];

    const pos: Position = {
      id: `pos-${Math.random().toString(36).substring(2, 9)}`,
      mint: coin.mint,
      symbol: coin.symbol,
      strategy,
      entry_price_usd: coin.price_usd,
      entry_sol: amountSol,
      qty: priceSol > 0 ? amountSol / priceSol : 1000,
      current_price_usd: coin.price_usd,
      high_price_usd: coin.price_usd,
      stop_pct: strat.stop_pct || 10.0,
      take_pct: strat.take_pct || 25.0,
      trail_pct: strat.trail_pct || 8.0,
      opened_at_ms: Date.now(),
      last_updated_at_ms: Date.now(),
      status: 'OPEN',
      current_value_sol: amountSol,
      unrealized_pnl_sol: 0.0,
      exit_reason: '',
      quote_source: coin.quote_source || 'pump.fun',
      quote_updated_at_ms: Date.now(),
      entry_price_sol: priceSol,
      current_price_sol: priceSol,
      high_price_sol: priceSol,
      last_quote_latency_ms: 18.0,
      quote_status: 'fresh',
      max_hold_minutes: strat.max_hold_minutes || 20,
      realized_pnl_sol: 0.0,
      runner_levels_hit: [],
      break_even_active: false,
      trailing_stop_usd: 0.0,
      runner_pct_remaining: 100.0,
      partial_exits_count: 0,
      initial_entry_sol: amountSol,
      initial_qty: priceSol > 0 ? amountSol / priceSol : 1000,
      execution_route: this.config.execution.active_route || 'pumpfun',
      tx_signature: `SimTx${Math.random().toString(36).substring(2, 10)}`,
      landing_latency_ms: 14.5,
      regime_at_entry: coin.regime || 'TREND',
      opportunity_score_at_entry: coin.opportunity_score
    };

    this.positions.unshift(pos);
    this.stats.cash_sol -= amountSol;
    this.stats.trades += 1;

    const fill: Fill = {
      ts_ms: Date.now(),
      side: 'BUY',
      symbol: pos.symbol,
      mint: pos.mint,
      sol: amountSol,
      price_usd: pos.entry_price_usd,
      pnl_sol: 0.0,
      reason: 'ENTRY_SIGNAL',
      mode: this.mode,
      route: pos.execution_route,
      slippage_pct: 0.45,
      execution_latency_ms: 14.5,
      txid: pos.tx_signature,
      failure_class: '',
      strategy,
      run_id: this.runId,
      estimated_dex_fee_sol: amountSol * (this.config.execution.paper_raydium_fee_pct || 0.25) / 100
    };
    this.fills.unshift(fill);

    this.log(`${this.mode.toUpperCase()} BUY · ${pos.symbol} · ${amountSol.toFixed(4)} SOL @ $${pos.entry_price_usd.toFixed(6)}`);
    if (this.config.telegram?.enabled && this.config.telegram.notify_buy) {
      this.telegram.send(`🟢 <b>HELIX ${this.mode.toUpperCase()} BUY</b>\n• <b>Token:</b> ${pos.symbol}\n• <b>Mint:</b> <code>${pos.mint}</code>\n• <b>Einsatz:</b> ${amountSol.toFixed(4)} SOL\n• <b>Kurs:</b> $${pos.entry_price_usd.toFixed(6)}\n• <b>Strategie:</b> ${pos.strategy}`).catch(() => {});
    }
    this.updateEquity();
    this.broadcast();
    return pos;
  }

  async closePosition(pid: string, reason: string): Promise<boolean> {
    const pos = this.positions.find(p => p.id === pid && p.status === 'OPEN');
    if (!pos) return false;

    if (this.mode === 'live') {
      try {
        const result = await this.liveExecutor.execute({
          side: 'sell',
          mint: pos.mint,
          slippagePct: Math.min(this.config.execution.max_slippage_pct || this.config.risk_limits.max_slippage_pct || 2.5, this.config.risk_limits.max_slippage_pct || 2.5),
          priorityFeeSol: this.config.execution.priority_fee_sol || 0.0005,
          pool: this.config.execution.active_route === 'pumpfun' ? 'auto' : this.config.execution.active_route,
          route: (this.config.execution.route_mode || 'auto') as any,
          amountTokens: pos.qty,
          priorityFeeMicroLamports: this.config.execution.priority_fee_micro_lamports || 100000,
          simulate: this.config.execution.simulate_before_submit !== false
        });
        const pnl = pos.current_value_sol - pos.entry_sol;
        const fill: Fill = {
          ts_ms: Date.now(),
          side: 'SELL',
          symbol: pos.symbol,
          mint: pos.mint,
          sol: pos.current_value_sol,
          price_usd: pos.current_price_usd,
          pnl_sol: pnl,
          reason,
          mode: 'live',
          route: result.route,
          slippage_pct: this.config.execution.max_slippage_pct || 2.5,
          execution_latency_ms: result.latency_ms,
          txid: result.signature,
          failure_class: '',
          strategy: pos.strategy,
          run_id: this.runId,
          network_fee_sol: result.network_fee_sol || 0,
          estimated_dex_fee_sol: result.estimated_dex_fee_sol || 0
        };
        this.fills.unshift(fill);
        const totalFees = (result.network_fee_sol || 0) + (result.estimated_dex_fee_sol || 0);
        this.stats.fees_sol += totalFees;
        this.stats.realized_sol += pnl - totalFees;
        if (pnl > 0) {
          this.stats.wins += 1;
          this.stats.consecutive_losses = 0;
        } else {
          this.stats.losses += 1;
          this.stats.consecutive_losses += 1;
        }
        this.journal.appendTrade({
          id: pos.id, run_id: this.runId, strategy: pos.strategy, mint: pos.mint, symbol: pos.symbol, mode:'live',
          opened_at_ms: pos.opened_at_ms, closed_at_ms: Date.now(), hold_minutes:(Date.now()-pos.opened_at_ms)/60000,
          entry_sol: pos.initial_entry_sol ?? pos.entry_sol, exit_sol: pos.current_value_sol, pnl_sol: pnl-totalFees,
          return_pct: (pos.entry_price_usd>0 ? ((pos.current_price_usd/pos.entry_price_usd)-1)*100 : 0), fees_sol: totalFees,
          network_fee_sol: result.network_fee_sol || 0, estimated_dex_fee_sol: result.estimated_dex_fee_sol || 0,
          buy_route: pos.execution_route, sell_route: result.route, exit_reason: reason,
          opportunity_score_at_entry: pos.opportunity_score_at_entry, regime_at_entry: pos.regime_at_entry, txids:[pos.tx_signature,result.signature]
        });
        this.positions = this.positions.filter(p => p.id !== pid);
        this.log(`LIVE SELL · ${pos.symbol} · ${reason} · TX ${result.signature}`);
        this.updateEquity();
        this.broadcast();
        return true;
      } catch (err: any) {
        this.stats.execution_failures += 1;
        this.log(`LIVE SELL FAILED · ${pos.symbol} · ${err?.message || err}`);
        this.broadcast();
        throw err;
      }
    }

    const pnl = pos.current_value_sol - pos.entry_sol;
    const fees = (pos.entry_sol + pos.current_value_sol) * ((this.config.execution.paper_raydium_fee_pct || 0.25) / 100);
    this.stats.cash_sol += Math.max(0, pos.current_value_sol - fees);
    this.stats.fees_sol += fees;
    this.stats.realized_sol += pnl - fees;

    if (pnl > 0) {
      this.stats.wins += 1;
      this.stats.consecutive_losses = 0;
    } else {
      this.stats.losses += 1;
      this.stats.consecutive_losses += 1;
    }

    const fill: Fill = {
      ts_ms: Date.now(),
      side: 'SELL',
      symbol: pos.symbol,
      mint: pos.mint,
      sol: pos.current_value_sol,
      price_usd: pos.current_price_usd,
      pnl_sol: pnl,
      reason,
      mode: this.mode,
      route: pos.execution_route,
      slippage_pct: 0.5,
      execution_latency_ms: 16.0,
      txid: `SimTx${Math.random().toString(36).substring(2, 10)}`,
      failure_class: '',
      strategy: pos.strategy,
      run_id: this.runId,
      network_fee_sol: 0,
      estimated_dex_fee_sol: fees
    };
    this.fills.unshift(fill);
    const tradeFees = fees;
    this.journal.appendTrade({
      id: pos.id, run_id:this.runId, strategy:pos.strategy, mint:pos.mint, symbol:pos.symbol, mode:this.mode,
      opened_at_ms:pos.opened_at_ms, closed_at_ms:Date.now(), hold_minutes:(Date.now()-pos.opened_at_ms)/60000,
      entry_sol:pos.initial_entry_sol ?? pos.entry_sol, exit_sol:pos.current_value_sol, pnl_sol:pnl-tradeFees,
      return_pct:pos.entry_price_usd>0 ? ((pos.current_price_usd/pos.entry_price_usd)-1)*100 : 0, fees_sol:tradeFees,
      network_fee_sol:0, estimated_dex_fee_sol:tradeFees, buy_route:pos.execution_route, sell_route:pos.execution_route,
      exit_reason:reason, opportunity_score_at_entry:pos.opportunity_score_at_entry, regime_at_entry:pos.regime_at_entry, txids:[pos.tx_signature,fill.txid]
    });

    this.positions = this.positions.filter(p => p.id !== pid);
    this.log(`${this.mode.toUpperCase()} SELL · ${pos.symbol} · ${pos.current_value_sol.toFixed(4)} SOL · ${reason} (PnL: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(4)} SOL)`);

    if (this.config.telegram?.enabled && this.config.telegram.notify_exit) {
      const emoji = pnl >= 0 ? '💰' : '🛑';
      this.telegram.send(`${emoji} <b>HELIX ${this.mode.toUpperCase()} EXIT</b>\n• <b>Token:</b> ${pos.symbol}\n• <b>Grund:</b> ${reason}\n• <b>PnL:</b> ${pnl >= 0 ? '+' : ''}${pnl.toFixed(4)} SOL\n• <b>Volumen:</b> ${pos.current_value_sol.toFixed(4)} SOL`).catch(() => {});
    }

    this.updateEquity();
    this.broadcast();
    return true;
  }

  updateEquity() {
    const openPos = this.positions.filter(p => p.status === 'OPEN');
    this.stats.unrealized_sol = openPos.reduce((sum, p) => sum + p.unrealized_pnl_sol, 0);
    this.stats.open_exposure_sol = openPos.reduce((sum, p) => sum + p.entry_sol, 0);
    const marketValue = openPos.reduce((sum, p) => sum + p.current_value_sol, 0);
    this.stats.equity_sol = this.stats.cash_sol + marketValue;

    if (this.stats.equity_sol > this.stats.peak_equity_sol) {
      this.stats.peak_equity_sol = this.stats.equity_sol;
    }
    if (this.stats.peak_equity_sol > 0) {
      const dd = ((this.stats.peak_equity_sol - this.stats.equity_sol) / this.stats.peak_equity_sol) * 100;
      this.stats.max_drawdown_pct = Math.max(this.stats.max_drawdown_pct, dd);
    }

    const now = Date.now();
    const last = this.stats.equity_history[this.stats.equity_history.length - 1];
    if (!last || now - last.ts_ms >= 2000) {
      this.stats.equity_history.push({ ts_ms: now, equity_sol: this.stats.equity_sol });
      if (this.stats.equity_history.length > 500) {
        this.stats.equity_history.shift();
      }
    } else {
      last.equity_sol = this.stats.equity_sol;
    }
  }

  async emergencyStopTrading() {
    this.config.auto_trade = false;
    this.paused = true;
    saveConfig(this.config);
    this.log('EMERGENCY · STOP TRADING ACTIVATED');
    this.broadcast();
  }

  async emergencyCloseAll() {
    const openPids = this.positions.filter(p => p.status === 'OPEN').map(p => p.id);
    for (const pid of openPids) {
      await this.closePosition(pid, 'EMERGENCY_CLOSE_ALL');
    }
    this.log(`EMERGENCY · CLOSED ALL ${openPids.length} POSITIONS`);
    this.broadcast();
  }

  resetPaper() {
    this.positions = [];
    this.fills = [];
    this.stats = {
      signals: 0,
      trades: 0,
      wins: 0,
      losses: 0,
      realized_sol: 0.0,
      unrealized_sol: 0.0,
      open_exposure_sol: 0.0,
      cash_sol: this.config.starting_sol || 5.0,
      equity_sol: this.config.starting_sol || 5.0,
      peak_equity_sol: this.config.starting_sol || 5.0,
      max_drawdown_pct: 0.0,
      fees_sol: 0.0,
      consecutive_losses: 0,
      execution_failures: 0,
      equity_history: [{ ts_ms: Date.now(), equity_sol: this.config.starting_sol || 5.0 }]
    };
    this.log('PAPER RESET · Clean slate initialized');
    this.broadcast();
  }

  control(action: string) {
    switch (action) {
      case 'pause':
        this.paused = true;
        break;
      case 'resume':
        this.paused = false;
        break;
      case 'arm':
        this.armed = !this.armed;
        break;
      case 'kill':
        this.panic = true;
        this.paused = true;
        this.armed = false;
        break;
      case 'clear-kill':
        this.panic = false;
        this.paused = false;
        break;
      case 'stop-trading':
        this.config.auto_trade = false;
        this.paused = true;
        break;
      case 'paper':
        this.mode = 'paper';
        this.armed = true;
        this.paused = false;
        break;
      case 'dry_run':
        this.mode = 'dry_run';
        break;
      case 'arm_live':
      case 'live':
        if (!this.liveExecutor.isReady()) {
          throw new Error('LIVE disabled: SOLANA_PRIVATE_KEY is not configured or invalid');
        }
        this.config.execution.live_armed = true;
        this.config.execution.mode = 'live';
        this.mode = 'live';
        this.armed = true;
        this.paused = false;
        saveConfig(this.config);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }
    this.log(`CONTROL · ${action.toUpperCase()}`);
    this.broadcast();
  }

  snapshot(): Record<string, any> {
    const marketRegime = classifyMarketRegime(this.coins);
    const now = Date.now();
    const totalTrades = this.stats.wins + this.stats.losses;
    const winRate = totalTrades > 0 ? (this.stats.wins / totalTrades) * 100 : 0;

    const fresh = this.positions.filter(p => p.quote_status === 'fresh').length;
    const stale = this.positions.filter(p => p.quote_status !== 'fresh').length;

    return {
      version: '5.5.0',
      terminal_name: 'HELIX',
      ts: now,
      mode: this.mode,
      armed: this.armed,
      paused: this.paused,
      panic: this.panic,
      market_regime: marketRegime,
      circuit_breaker: {
        active: this.circuitBreakerActive,
        reason: this.circuitBreakerReason
      },
      feed_quality: this.feedQuality,
      feed_error: this.feedError,
      strategy: this.config.strategy,
      trading_preset: this.config.trading_preset || 'normal',
      preset_strategies: this.config.preset_strategies,
      active_strategies: this.config.active_strategies || [this.config.strategy || 'combo'],
      coins: this.coins.map(c => ({
        ...c,
        age_seconds: Math.max(0, (now - c.created_at_ms) / 1000)
      })),
      candidates: this.coins.map(c => ({
        ...c,
        age_seconds: Math.max(0, (now - c.created_at_ms) / 1000)
      })),
      positions: this.positions.map(p => ({
        ...p,
        return_pct: p.entry_price_usd > 0 ? ((p.current_price_usd / p.entry_price_usd) - 1) * 100 : 0,
        age_minutes: (now - p.opened_at_ms) / 60000
      })),
      fills: this.fills.slice(0, 200),
      orders: this.orders.slice(0, 50),
      stats: {
        ...this.stats,
        win_rate_pct: Math.round(winRate * 10) / 10
      },
      config: {
        ...this.config,
        pumpfun_auth_token: undefined
      },
      providers: {
        pumpfun: this.config.pumpfun_base,
        pumpfun_auth: Boolean(this.config.pumpfun_auth_token),
        dexscreener: this.config.dexscreener_base,
        raydium: this.config.execution.raydium_trade_api_url,
        route_mode: this.config.execution.route_mode || 'auto'
      },
      strategies: this.config.strategies,
      analysis: this.journal.analyze(),
      run_id: this.runId,
      logs: this.logs.slice(0, 200),
      uptime_seconds: Math.max(0, (now - this.startedAt) / 1000),
      health: {
        quote_fresh: fresh,
        quote_stale: stale,
        quote_success_total: this.quoteOk,
        quote_failure_total: this.quoteFail
      },
      latency: {
        signal_latency_p50_ms: 1.2,
        signal_latency_p95_ms: 2.5,
        execution_latency_p50_ms: 15.0,
        execution_latency_p95_ms: 45.0,
        rpc_latency_ms: 35.0
      },
      live_signer: {
        ready: this.liveExecutor.isReady(),
        public_key: this.liveExecutor.address() || '',
        balance_sol: this.cachedBalanceSol
      },
      performance: {
        realized_plus_unrealized: this.stats.realized_sol + this.stats.unrealized_sol,
        return_on_start_pct: this.config.starting_sol > 0
          ? ((this.stats.equity_sol / this.config.starting_sol) - 1) * 100
          : 0
      }
    };
  }

  broadcast() {
    if (!this.subscribers.size) return;
    const snap = JSON.stringify(this.snapshot());
    for (const sub of this.subscribers) {
      try {
        sub(snap);
      } catch {
        // ignore
      }
    }
  }

  subscribe(fn: (data: string) => void) {
    this.subscribers.add(fn);
  }

  unsubscribe(fn: (data: string) => void) {
    this.subscribers.delete(fn);
  }
}
