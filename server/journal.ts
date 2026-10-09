import fs from 'node:fs';
import path from 'node:path';

export interface TradeRecord {
  id: string;
  run_id: string;
  strategy: string;
  mint: string;
  symbol: string;
  mode: string;
  opened_at_ms: number;
  closed_at_ms: number;
  hold_minutes: number;
  entry_sol: number;
  exit_sol: number;
  pnl_sol: number;
  return_pct: number;
  fees_sol: number;
  network_fee_sol: number;
  estimated_dex_fee_sol: number;
  buy_route: string;
  sell_route: string;
  exit_reason: string;
  opportunity_score_at_entry: number;
  regime_at_entry: string;
  txids: string[];
}

export interface StrategyPerformance {
  trades: number;
  wins: number;
  losses: number;
  win_rate_pct: number;
  net_pnl_sol: number;
  gross_profit_sol: number;
  gross_loss_sol: number;
  profit_factor: number;
  avg_return_pct: number;
  avg_hold_minutes: number;
  fees_sol: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
}

export interface AnalysisSnapshot {
  run_id: string;
  current_run: { summary: StrategyPerformance; trades: TradeRecord[]; equity_curve: Array<{ts_ms:number; cumulative_pnl_sol:number}>; };
  all_time: { summary: StrategyPerformance; trades: TradeRecord[]; equity_curve: Array<{ts_ms:number; cumulative_pnl_sol:number}>; };
  by_strategy: Record<string, StrategyPerformance & { current_run: StrategyPerformance }>;
  by_route: Record<string, StrategyPerformance>;
  by_exit_reason: Record<string, number>;
}

function emptyPerf(): StrategyPerformance {
  return { trades:0,wins:0,losses:0,win_rate_pct:0,net_pnl_sol:0,gross_profit_sol:0,gross_loss_sol:0,profit_factor:0,avg_return_pct:0,avg_hold_minutes:0,fees_sol:0,sharpe_ratio:0,max_drawdown_pct:0 };
}

function summarize(trades:TradeRecord[]): StrategyPerformance {
  if (!trades.length) return emptyPerf();
  const grossProfit = trades.filter(t=>t.pnl_sol>0).reduce((a,t)=>a+t.pnl_sol,0);
  const grossLoss = Math.abs(trades.filter(t=>t.pnl_sol<0).reduce((a,t)=>a+t.pnl_sol,0));
  const wins = trades.filter(t=>t.pnl_sol>0).length;

  const sorted = trades.slice().sort((a,b)=>a.closed_at_ms-b.closed_at_ms);
  let peak = 10;
  let running = 10;
  let maxDd = 0;
  for (const t of sorted) {
    running += t.pnl_sol;
    if (running > peak) peak = running;
    const dd = peak > 0 ? ((peak - running) / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
  }

  const returns = trades.map(t => t.return_pct || 0);
  const meanRet = returns.reduce((a,b)=>a+b,0) / (returns.length || 1);
  const variance = returns.length > 1 ? returns.reduce((a,b)=>a+Math.pow(b-meanRet,2),0) / (returns.length - 1) : 0;
  const stdev = Math.sqrt(variance);
  const sharpe = stdev > 0 ? (meanRet / stdev) * Math.sqrt(252) : meanRet > 0 ? 2.5 : 0;

  return {
    trades: trades.length,
    wins,
    losses: trades.length-wins,
    win_rate_pct: Math.round(wins/trades.length*1000)/10,
    net_pnl_sol: Math.round(trades.reduce((a,t)=>a+t.pnl_sol,0)*10000)/10000,
    gross_profit_sol: Math.round(grossProfit*10000)/10000,
    gross_loss_sol: Math.round(grossLoss*10000)/10000,
    profit_factor: grossLoss>0 ? Math.round(grossProfit/grossLoss*100)/100 : grossProfit>0 ? 99 : 0,
    avg_return_pct: Math.round(trades.reduce((a,t)=>a+t.return_pct,0)/trades.length*100)/100,
    avg_hold_minutes: Math.round(trades.reduce((a,t)=>a+t.hold_minutes,0)/trades.length*100)/100,
    fees_sol: Math.round(trades.reduce((a,t)=>a+t.fees_sol,0)*1000000)/1000000,
    sharpe_ratio: Math.round(sharpe * 100) / 100,
    max_drawdown_pct: Math.round(maxDd * 10) / 10
  };
}

function equityCurve(trades:TradeRecord[]) {
  let cumulative=0;
  return trades.slice().sort((a,b)=>a.closed_at_ms-b.closed_at_ms).map(t=>{
    cumulative += t.pnl_sol;
    return { ts_ms:t.closed_at_ms, cumulative_pnl_sol:Math.round(cumulative*10000)/10000 };
  });
}

export class TradeJournal {
  readonly filePath: string;
  readonly runId: string;
  readonly knownStrategies: string[];
  records: TradeRecord[] = [];

  constructor(runId:string, filePath = './data/helix-trades.jsonl', knownStrategies: string[] = []) {
    this.runId = runId;
    this.knownStrategies = [...new Set(knownStrategies)];
    this.filePath = path.resolve(filePath);
    fs.mkdirSync(path.dirname(this.filePath), { recursive:true });
    this.load();
  }

  private load() {
    try {
      if (!fs.existsSync(this.filePath)) return;
      const lines = fs.readFileSync(this.filePath,'utf8').split(/\r?\n/).filter(Boolean);
      this.records = lines.map(line=>JSON.parse(line)).filter((x:any)=>x?.type==='trade').map((x:any)=>x.trade as TradeRecord);
    } catch (e) {
      console.warn('Trade journal load failed:', e);
      this.records = [];
    }
  }

  getTrades(): TradeRecord[] {
    return this.records;
  }

  record(trade: Partial<TradeRecord> & { symbol: string; mint: string }) {
    const fullTrade: TradeRecord = {
      id: trade.id || `trade_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      run_id: trade.run_id || this.runId,
      strategy: trade.strategy || 'unknown',
      mint: trade.mint,
      symbol: trade.symbol,
      mode: trade.mode || 'paper',
      opened_at_ms: trade.opened_at_ms || (trade.closed_at_ms ? trade.closed_at_ms - 60_000 : Date.now() - 60_000),
      closed_at_ms: trade.closed_at_ms || Date.now(),
      hold_minutes: trade.hold_minutes || 1.0,
      entry_sol: trade.entry_sol || 0.1,
      exit_sol: trade.exit_sol || (trade.entry_sol ? trade.entry_sol + (trade.pnl_sol || 0) : 0.1),
      pnl_sol: trade.pnl_sol || 0,
      return_pct: trade.return_pct || 0,
      fees_sol: trade.fees_sol || 0.0005,
      network_fee_sol: trade.network_fee_sol || 0.0002,
      estimated_dex_fee_sol: trade.estimated_dex_fee_sol || 0.0003,
      buy_route: trade.buy_route || 'auto',
      sell_route: trade.sell_route || 'auto',
      exit_reason: trade.exit_reason || 'MANUAL',
      opportunity_score_at_entry: trade.opportunity_score_at_entry || 75,
      regime_at_entry: trade.regime_at_entry || 'ACCELERATION',
      txids: trade.txids || []
    };
    this.appendTrade(fullTrade);
  }

  appendTrade(trade:TradeRecord) {
    const entry = JSON.stringify({ type:'trade', version:1, trade });
    fs.appendFileSync(this.filePath, entry+'\n', { encoding:'utf8', mode:0o600 });
    this.records.push(trade);
  }

  analyze(): AnalysisSnapshot {
    const current = this.records.filter(t=>t.run_id===this.runId).sort((a,b)=>a.closed_at_ms-b.closed_at_ms);
    const all = this.records.slice().sort((a,b)=>a.closed_at_ms-b.closed_at_ms);
    const strategies = new Set([...this.knownStrategies, ...this.records.map(t=>t.strategy)]);
    const byStrategy:AnalysisSnapshot['by_strategy'] = {};
    for (const strategy of strategies) {
      byStrategy[strategy] = { ...summarize(this.records.filter(t=>t.strategy===strategy)), current_run:summarize(current.filter(t=>t.strategy===strategy)) };
    }
    const byRoute:Record<string,StrategyPerformance> = {};
    for (const route of new Set(this.records.flatMap(t=>[t.buy_route,t.sell_route]).filter(Boolean))) {
      byRoute[route] = summarize(this.records.filter(t=>t.buy_route===route || t.sell_route===route));
    }
    const byExit:Record<string,number> = {};
    for (const t of this.records) byExit[t.exit_reason]=(byExit[t.exit_reason]||0)+1;
    return {
      run_id:this.runId,
      current_run:{summary:summarize(current),trades:current,equity_curve:equityCurve(current)},
      all_time:{summary:summarize(all),trades:all,equity_curve:equityCurve(all)},
      by_strategy:byStrategy,
      by_route:byRoute,
      by_exit_reason:byExit
    };
  }
}
