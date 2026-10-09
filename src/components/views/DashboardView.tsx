import React, { useState } from 'react';
import { EngineSnapshot, Coin } from '../../types/helix';
import {
  TrendingUp,
  DollarSign,
  Briefcase,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Sliders,
  Cpu,
  BarChart2
} from 'lucide-react';

interface DashboardViewProps {
  snapshot: EngineSnapshot | null;
  onTradeCoin: (coin: Coin) => void;
  onInspectCoin: (coin: Coin) => void;
  onSellPosition: (positionId: string) => void;
  onNavigateTab: (tab: any) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  snapshot,
  onTradeCoin,
  onInspectCoin,
  onSellPosition,
  onNavigateTab
}) => {
  const stats = snapshot?.stats;
  const equitySol = stats?.equity_sol ?? 10;
  const realizedSol = stats?.realized_sol ?? 0;
  const unrealizedSol = stats?.unrealized_sol ?? 0;
  const winRate = stats?.win_rate_pct ?? (stats && stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0);
  const rawPositions = Array.isArray(snapshot?.positions) ? snapshot.positions : [];
  const openPositions = rawPositions.filter(p => p && p.status === 'OPEN');
  const rawCandidates = Array.isArray(snapshot?.candidates)
    ? snapshot.candidates
    : Array.isArray(snapshot?.coins)
    ? snapshot.coins
    : [];
  const topCandidates = rawCandidates.filter(Boolean).slice(0, 6);
  const rawFills = Array.isArray(snapshot?.fills) ? snapshot.fills : [];

  const regime = snapshot?.market_regime?.macro_regime || 'TREND';
  const tradable = snapshot?.market_regime?.tradable_regime ?? true;
  const cb = snapshot?.circuit_breaker;
  const p50 = snapshot?.latency?.signal_latency_p50_ms ?? 14;

  // Optimized Quant Equity History Chart with interactive hover & timeframe filters
  const [equityTimeframe, setEquityTimeframe] = useState<'1m' | '5m' | '15m' | '1d'>('1d');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const rawHistory = Array.isArray(stats?.equity_history) ? stats.equity_history.filter(Boolean) : [];
  const now = Date.now();
  const cutoff = equityTimeframe === '1m' ? now - 60000 
               : equityTimeframe === '5m' ? now - 300000 
               : equityTimeframe === '15m' ? now - 900000 
               : 0;
  const filteredHistory = cutoff > 0 ? rawHistory.filter(h => h.ts_ms >= cutoff) : rawHistory;
  const history = filteredHistory.length > 1 ? filteredHistory : rawHistory;

  const minEquity = history.length ? Math.min(...history.map(h => h.equity_sol)) : (equitySol * 0.95);
  const maxEquity = history.length ? Math.max(...history.map(h => h.equity_sol)) : (equitySol * 1.05);
  const midEquity = (maxEquity + minEquity) / 2;
  const equityRange = maxEquity - minEquity || 0.001;

  const chartWidth = 600;
  const chartHeight = 160;

  const points = history.map((h, i) => {
    const x = (i / Math.max(1, history.length - 1)) * chartWidth;
    const y = chartHeight - 25 - ((h.equity_sol - minEquity) / equityRange) * (chartHeight - 45);
    return `${x},${isNaN(y) ? chartHeight / 2 : y}`;
  }).join(' ');

  const areaPoints = history.length > 0
    ? `${0},${chartHeight - 20} ${points} ${chartWidth},${chartHeight - 20}`
    : `0,${chartHeight - 20} ${chartWidth},${chartHeight - 20}`;

  const formatTime = (ts?: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  const startTime = formatTime(history[0]?.ts_ms);
  const endTime = formatTime(history[history.length - 1]?.ts_ms);

  // Strategy PnL attribution from analysis
  const byStrategy = snapshot?.analysis?.by_strategy || {};

  return (
    <div className="space-y-5 p-4 sm:p-6 overflow-y-auto max-w-7xl mx-auto font-mono text-xs">
      {/* Top Quant Status Banner */}
      <div className="bg-[#081113] border border-[#132427] rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-[#00ffa3]/15 border border-[#00ffa3]/30 flex items-center justify-center text-[#00ffa3] font-extrabold text-base shadow-[0_0_12px_rgba(0,255,163,0.2)]">
            Ω
          </div>
          <div>
            <div className="font-extrabold text-sm text-[#ecf9f6] flex items-center space-x-2">
              <span>HELIX 5.5 QUANT TERMINAL</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#00ffa3]/15 text-[#00ffa3]">
                {snapshot?.mode?.toUpperCase() || 'PAPER'}
              </span>
            </div>
            <div className="text-[11px] text-[#7e9994]">
              Regime: <b className="text-[#00e5ff]">{regime}</b> · P50 Latency: <b className="text-[#00ffa3]">{p50.toFixed(1)}ms</b>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className={`px-2.5 py-1 rounded border text-[11px] font-bold flex items-center space-x-1.5 ${
            tradable ? 'bg-[#00ffa3]/15 text-[#00ffa3] border-[#00ffa3]/30' : 'bg-[#ff3b69]/20 text-[#ff3b69] border-[#ff3b69]/40'
          }`}>
            <span className={`w-2 h-2 rounded-full ${tradable ? 'bg-[#00ffa3] animate-pulse' : 'bg-[#ff3b69]'}`} />
            <span>{tradable ? 'ENTRIES ACTIVE' : 'GATEWAY BLOCKED'}</span>
          </div>

          {cb?.active && (
            <div className="px-2.5 py-1 rounded border bg-[#ff3b69]/20 text-[#ff3b69] border-[#ff3b69] font-bold animate-pulse flex items-center space-x-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>CIRCUIT BREAKER</span>
            </div>
          )}

          <button
            onClick={() => onNavigateTab('settings')}
            className="px-3 py-1.5 rounded bg-[#050b0d] hover:bg-[#0c1a1d] border border-[#132427] text-[#ecf9f6] font-bold transition flex items-center space-x-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-[#00ffa3]" />
            <span>CONFIG</span>
          </button>
        </div>
      </div>

      {/* Top Quant Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-[#081113] border border-[#132427] relative overflow-hidden">
          <div className="text-[10px] uppercase text-[#7e9994] font-medium flex items-center justify-between">
            <span>Portfolio Equity</span>
            <DollarSign className="w-4 h-4 text-[#00ffa3]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#ecf9f6] mt-1">
            {equitySol.toFixed(4)} <span className="text-xs text-[#00ffa3]">SOL</span>
          </div>
          <div className="text-[11px] text-[#7e9994] mt-0.5">
            ≈ ${(equitySol * 150).toFixed(2)} USD
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#081113] border border-[#132427] relative overflow-hidden">
          <div className="text-[10px] uppercase text-[#7e9994] font-medium flex items-center justify-between">
            <span>Net Realized PnL</span>
            <TrendingUp className={`w-4 h-4 ${realizedSol >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}`} />
          </div>
          <div className={`text-xl sm:text-2xl font-bold mt-1 ${realizedSol >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}`}>
            {realizedSol >= 0 ? '+' : ''}{realizedSol.toFixed(4)} <span className="text-xs">SOL</span>
          </div>
          <div className="text-[11px] text-[#7e9994] mt-0.5">
            Unrealized: {unrealizedSol >= 0 ? '+' : ''}{unrealizedSol.toFixed(4)} SOL
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#081113] border border-[#132427] relative overflow-hidden">
          <div className="text-[10px] uppercase text-[#7e9994] font-medium flex items-center justify-between">
            <span>Win Rate</span>
            <Target className="w-4 h-4 text-[#00e5ff]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#ecf9f6] mt-1">
            {winRate.toFixed(1)}%
          </div>
          <div className="text-[11px] text-[#7e9994] mt-0.5">
            {stats?.wins ?? 0}W / {stats?.losses ?? 0}L ({stats?.trades ?? 0} Trades)
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#081113] border border-[#132427] relative overflow-hidden">
          <div className="text-[10px] uppercase text-[#7e9994] font-medium flex items-center justify-between">
            <span>Open Positions</span>
            <Briefcase className="w-4 h-4 text-[#ffb800]" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#ecf9f6] mt-1">
            {openPositions.length} <span className="text-xs text-[#7e9994]">/ {snapshot?.config?.max_positions ?? 15}</span>
          </div>
          <div className="text-[11px] text-[#7e9994] mt-0.5">
            Exposure: {(stats?.open_exposure_sol ?? 0).toFixed(2)} SOL
          </div>
        </div>
      </div>

      {/* Two Chart Columns: Enhanced Equity Chart + Strategy Attribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Enhanced Quant Equity Chart */}
        {history.length > 1 && (
          <div className="p-5 rounded-xl bg-[#081113] border border-[#132427] space-y-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-[#00ffa3]" />
                <span className="font-bold text-xs text-[#ecf9f6]">
                  QUANT EQUITY TIMELINE
                </span>
              </div>
              
              {/* Timeframe Selector Buttons */}
              <div className="flex items-center space-x-1 bg-[#050b0d] p-1 rounded-lg border border-[#132427]">
                {(['1m', '5m', '15m', '1d'] as const).map(tf => {
                  const labels = { '1m': '1 Minute', '5m': '5 Minuten', '15m': '15 Minuten', '1d': '1 Tag' };
                  return (
                    <button
                      key={tf}
                      onClick={() => setEquityTimeframe(tf)}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition ${
                        equityTimeframe === tf
                          ? 'bg-[#00ffa3]/20 text-[#00ffa3] border border-[#00ffa3]/30 shadow-sm'
                          : 'text-[#7e9994] hover:text-[#ecf9f6]'
                      }`}
                    >
                      {labels[tf]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#7e9994] px-1">
              <span>Peak: <b className="text-[#00ffa3]">{maxEquity.toFixed(4)} SOL</b></span>
              <span>Trough: <b className="text-[#ff3b69]">{minEquity.toFixed(4)} SOL</b></span>
            </div>

            <div className="w-full h-48 bg-[#050b0d] rounded-lg border border-[#132427] relative overflow-hidden p-2 flex">
              {/* Y-Axis Labels (Left) */}
              <div className="w-16 pr-2 flex flex-col justify-between text-[9px] text-[#7e9994] font-mono select-none py-2 text-right border-r border-[#132427]/50">
                <span className="text-[#00ffa3] font-bold">{maxEquity.toFixed(3)} SOL</span>
                <span>{midEquity.toFixed(3)} SOL</span>
                <span className="text-[#ff3b69] font-bold">{minEquity.toFixed(3)} SOL</span>
              </div>

              {/* SVG Chart Area */}
              <div className="flex-1 relative pl-2">
                {hoveredIndex !== null && history[hoveredIndex] && (
                  <div className="absolute top-1 right-1 bg-[#081113] border border-[#00ffa3]/50 px-2 py-1 rounded text-[10px] text-[#ecf9f6] z-10 shadow-lg">
                    <div className="text-[#00ffa3] font-bold">{history[hoveredIndex].equity_sol.toFixed(4)} SOL</div>
                    <div className="text-[#7e9994]">{formatTime(history[hoveredIndex].ts_ms)}</div>
                  </div>
                )}

                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00ffa3" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#00ffa3" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Grid lines & Y-Axis ticks */}
                  <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke="#132427" strokeDasharray="3,3" />
                  <line x1="0" y1={chartHeight * 0.50} x2={chartWidth} y2={chartHeight * 0.50} stroke="#132427" strokeDasharray="3,3" />
                  <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke="#132427" strokeDasharray="3,3" />

                  {/* Area fill */}
                  {points && <polygon points={areaPoints} fill="url(#equityGrad)" />}

                  {/* Main curve */}
                  {points && (
                    <polyline
                      fill="none"
                      stroke="#00ffa3"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={points}
                    />
                  )}

                  {/* Interactive hover targets */}
                  {history.map((h, i) => {
                    const cx = (i / Math.max(1, history.length - 1)) * chartWidth;
                    const cy = chartHeight - 25 - ((h.equity_sol - minEquity) / equityRange) * (chartHeight - 45);
                    return (
                      <circle
                        key={i}
                        cx={cx}
                        cy={isNaN(cy) ? chartHeight / 2 : cy}
                        r="4"
                        fill="transparent"
                        className="cursor-pointer hover:fill-[#00ffa3]"
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                      />
                    );
                  })}
                </svg>

                {/* X-Axis Labels (Bottom) */}
                <div className="absolute bottom-0 left-2 right-0 flex justify-between text-[9px] text-[#7e9994] font-mono pt-1 border-t border-[#132427]">
                  <span>{startTime || 'Start'}</span>
                  <span className="text-[#ecf9f6]">Live Timeline</span>
                  <span>{endTime || 'Jetzt'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Second Helpful Chart: Strategy PnL Attribution & Win Rate Chart */}
        <div className="p-5 rounded-xl bg-[#081113] border border-[#132427] space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-[#00e5ff]" />
              <span className="font-bold text-xs text-[#ecf9f6]">
                STRATEGIE-ATTRIBUTION & PnL-VERTEILUNG
              </span>
            </div>
            <button
              onClick={() => onNavigateTab('analytics')}
              className="text-[10px] text-[#00ffa3] hover:underline"
            >
              Analytics →
            </button>
          </div>

          <div className="text-[10px] text-[#7e9994]">
            Netto-Ergebnis (SOL) & Win-Rate pro aktive Handelsstrategie
          </div>

          <div className="w-full h-48 bg-[#050b0d] rounded-lg border border-[#132427] p-3 flex flex-col justify-between overflow-y-auto space-y-2">
            {Object.keys(byStrategy).length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-[#7e9994] text-[11px]">
                Keine geschlossenen Trades vorhanden. Strategie-Attribution erscheint nach den ersten Trades.
              </div>
            ) : (
              Object.entries(byStrategy).map(([stratName, perf]: [string, any]) => {
                const pnl = perf.net_pnl_sol || 0;
                const winRatePct = perf.win_rate_pct || 0;
                const trades = perf.trades || 0;
                const maxPnl = Math.max(0.1, ...Object.values(byStrategy).map((p: any) => Math.abs(p.net_pnl_sol || 0)));
                const barWidthPct = Math.min(100, Math.max(5, (Math.abs(pnl) / maxPnl) * 80));

                return (
                  <div key={stratName} className="p-2 rounded bg-[#081113] border border-[#132427] space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-bold text-[#ecf9f6] uppercase flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#00ffa3]" />
                        <span>${stratName}</span>
                      </span>
                      <span className={`font-bold ${pnl >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}`}>
                        {pnl >= 0 ? '+' : ''}{pnl.toFixed(4)} SOL ({trades} Trades, {winRatePct.toFixed(0)}% Win)
                      </span>
                    </div>

                    <div className="w-full h-2 bg-[#050b0d] rounded-full overflow-hidden border border-[#132427]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${pnl >= 0 ? 'bg-[#00ffa3]' : 'bg-[#ff3b69]'}`}
                        style={{ width: `${barWidthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Live Positions + Top Scanner Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Active Open Positions */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#081113] border border-[#132427]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-mono font-bold text-sm text-[#ecf9f6] flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-[#00ffa3]" />
              <span>OFFENE POSITIONEN ({openPositions.length})</span>
            </h3>
            <button
              onClick={() => onNavigateTab('positions')}
              className="text-xs font-mono text-[#00ffa3] hover:underline"
            >
              Alle anzeigen →
            </button>
          </div>

          {openPositions.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-[#7e9994]">
              Keine offenen Positionen. Der Scanner sucht nach optimalen Setups.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto">
              {openPositions.map((pos: any) => {
                const pnl = pos?.unrealized_pnl_sol ?? 0;
                const amountSol = pos?.amount_sol ?? 0;
                const entryPrice = pos?.entry_price_usd ?? 0;
                const returnPct = pos?.return_pct ?? 0;
                const symbol = pos?.symbol || 'TOKEN';
                const posId = pos?.id || Math.random();
                const strategy = pos?.strategy || 'momentum';

                return (
                  <div
                    key={posId}
                    className="p-3 rounded-lg bg-[#050b0d] border border-[#132427] flex items-center justify-between hover:border-[#1d3e42] transition"
                  >
                    <div>
                      <div className="font-bold text-sm text-[#ecf9f6] flex items-center space-x-1.5">
                        <span>${symbol}</span>
                        <span className="text-[10px] px-1 py-0.2 rounded bg-[#00ffa3]/10 text-[#00ffa3]">
                          {strategy}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#7e9994] mt-0.5">
                        {amountSol.toFixed(2)} SOL · Entry: ${entryPrice < 0.01 ? entryPrice.toFixed(8) : entryPrice.toFixed(6)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className={`font-bold ${pnl >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}`}>
                          {pnl >= 0 ? '+' : ''}{pnl.toFixed(4)} SOL
                        </div>
                        <div className="text-[10px] text-[#7e9994]">
                          {returnPct >= 0 ? '+' : ''}{returnPct.toFixed(1)}%
                        </div>
                      </div>

                      <button
                        onClick={() => pos?.id && onSellPosition(pos.id)}
                        className="px-2.5 py-1.5 rounded bg-[#ff3b69]/15 hover:bg-[#ff3b69]/30 text-[#ff3b69] border border-[#ff3b69]/40 font-bold transition text-[10px]"
                      >
                        SELL
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Scanner Opportunities */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#081113] border border-[#132427]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-mono font-bold text-sm text-[#ecf9f6] flex items-center space-x-2">
              <Zap className="w-4 h-4 text-[#00ffa3]" />
              <span>TOP SCANNER OPPORTUNITIES</span>
            </h3>
            <button
              onClick={() => onNavigateTab('scanner')}
              className="text-xs font-mono text-[#00ffa3] hover:underline"
            >
              Scanner öffnen →
            </button>
          </div>

          {topCandidates.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-[#7e9994]">
              Lade Token-Stream von Pump.fun & Raydium…
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto">
              {topCandidates.map((coin: Coin) => (
                <div
                  key={coin?.mint || Math.random()}
                  onClick={() => coin && onInspectCoin(coin)}
                  className="p-3 rounded-lg bg-[#050b0d] border border-[#132427] flex items-center justify-between hover:border-[#1d3e42] cursor-pointer transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded bg-[#081113] border border-[#132427] flex items-center justify-center font-bold text-xs text-[#00ffa3]">
                      {(coin?.symbol || '??').slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-bold text-sm text-[#ecf9f6] flex items-center space-x-1.5">
                        <span>${coin?.symbol || 'TOKEN'}</span>
                        <span className="text-[9px] px-1 py-0.2 rounded bg-[#00e5ff]/10 text-[#00e5ff]">
                          {coin?.venue || 'solana'}
                        </span>
                      </div>
                      <div className="text-[10px] text-[#7e9994]">
                        Score: <b className="text-[#00ffa3]">{(coin?.opportunity_score ?? 0).toFixed(0)}/100</b> · Vol: ${(((coin?.volume_5m_usd ?? 0) / 1000)).toFixed(0)}k
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="text-right hidden sm:block">
                      <div className="font-bold text-xs text-[#ecf9f6]">
                        ${(coin?.price_usd ?? 0) < 0.01 ? (coin?.price_usd ?? 0).toFixed(7) : (coin?.price_usd ?? 0).toFixed(4)}
                      </div>
                      <div className={`text-[10px] font-bold ${(coin?.price_change_5m ?? 0) >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}`}>
                        {(coin?.price_change_5m ?? 0) >= 0 ? '+' : ''}{(coin?.price_change_5m ?? 0).toFixed(1)}%
                      </div>
                    </div>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (coin) onTradeCoin(coin);
                      }}
                      className="px-2.5 py-1.5 rounded bg-[#00ffa3]/20 hover:bg-[#00ffa3]/35 text-[#00ffa3] border border-[#00ffa3]/40 font-bold text-[10px] transition"
                    >
                      TRADE
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
