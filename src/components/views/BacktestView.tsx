import React, { useState } from 'react';
import { helixApi } from '../../services/api';
import { FlaskConical, Play, TrendingUp, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

export const BacktestView: React.FC = () => {
  const [strategy, setStrategy] = useState('momentum');
  const [startingSol, setStartingSol] = useState(10);
  const [tradeSol, setTradeSol] = useState(0.1);
  const [stopPct, setStopPct] = useState(10);
  const [takePct, setTakePct] = useState(25);
  const [trailPct, setTrailPct] = useState(8);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setRunning(true);
    setError(null);
    try {
      const res: any = await helixApi.runBacktest({
        strategy,
        params: { stop_pct: stopPct, take_pct: takePct, trail_pct: trailPct },
        trade_amount_sol: tradeSol,
        starting_sol: startingSol
      });
      if (res.result) {
        setResult(res.result);
      }
    } catch (err: any) {
      setError(err?.message || 'Backtest fehlgeschlagen');
    } finally {
      setRunning(false);
    }
  };

  const curve = result?.equity_curve || [];
  const minEq = curve.length ? Math.min(...curve.map((c: any) => c.equity_sol)) : startingSol;
  const maxEq = curve.length ? Math.max(...curve.map((c: any) => c.equity_sol)) : startingSol;
  const range = maxEq - minEq || 1;

  const points = curve.map((c: any, i: number) => {
    const x = (i / Math.max(1, curve.length - 1)) * 400;
    const y = 90 - ((c.equity_sol - minEq) / range) * 80;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto font-mono text-xs overflow-y-auto">
      {/* Header */}
      <div className="bg-[#081113] border border-[#132427] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#00e5ff]/15 border border-[#00e5ff]/40 flex items-center justify-center text-[#00e5ff]">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#ecf9f6] flex items-center space-x-2">
                <span>MONTE CARLO BACKTEST ENGINE</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#00ffa3]/15 text-[#00ffa3] font-bold">
                  QUANT SIMULATOR
                </span>
              </h2>
              <p className="text-xs text-[#7e9994] mt-0.5">
                Stochastische Simulation mit realistischen Solana Slippage- & Gebührenmodellen
              </p>
            </div>
          </div>

          <button
            onClick={handleRun}
            disabled={running}
            className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#00ffa3] to-[#00a86b] text-[#030708] font-bold text-xs hover:brightness-110 flex items-center space-x-2 shadow-lg transition"
          >
            {running ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{running ? 'SIMULIERE 120 TOKENS...' : 'BACKTEST STARTEN'}</span>
          </button>
        </div>

        {/* Input Parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-4 pt-4 border-t border-[#132427]">
          <div>
            <label className="text-[10px] text-[#7e9994] block mb-1">Strategie</label>
            <select
              value={strategy}
              onChange={e => setStrategy(e.target.value)}
              className="w-full bg-[#050b0d] border border-[#132427] rounded px-2 py-1.5 text-xs text-[#ecf9f6] outline-none"
            >
              <option value="sniper">Sniper</option>
              <option value="momentum">Momentum</option>
              <option value="breakout">Breakout</option>
              <option value="trend-following">Trend Following</option>
              <option value="pullback-continuation">Pullback Continuation</option>
              <option value="volatility-expansion">Volatility</option>
              <option value="micro-scalper">Micro Scalper</option>
              <option value="hft-scalper">HFT Scalper</option>
              <option value="runner">Runner</option>
              <option value="mean-reversion">Mean Reversion</option>
              <option value="combo">Combo Consensus</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-[#7e9994] block mb-1">Startkapital (SOL)</label>
            <input
              type="number"
              value={startingSol}
              onChange={e => setStartingSol(parseFloat(e.target.value) || 10)}
              className="w-full bg-[#050b0d] border border-[#132427] rounded px-2 py-1.5 text-xs text-[#ecf9f6] outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#7e9994] block mb-1">Trade Size (SOL)</label>
            <input
              type="number"
              step="0.05"
              value={tradeSol}
              onChange={e => setTradeSol(parseFloat(e.target.value) || 0.1)}
              className="w-full bg-[#050b0d] border border-[#132427] rounded px-2 py-1.5 text-xs text-[#ecf9f6] outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#7e9994] block mb-1">Take Profit (%)</label>
            <input
              type="number"
              value={takePct}
              onChange={e => setTakePct(parseInt(e.target.value) || 25)}
              className="w-full bg-[#050b0d] border border-[#132427] rounded px-2 py-1.5 text-xs text-[#ecf9f6] outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#7e9994] block mb-1">Stop Loss (%)</label>
            <input
              type="number"
              value={stopPct}
              onChange={e => setStopPct(parseInt(e.target.value) || 10)}
              className="w-full bg-[#050b0d] border border-[#132427] rounded px-2 py-1.5 text-xs text-[#ecf9f6] outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] text-[#7e9994] block mb-1">Trailing Stop (%)</label>
            <input
              type="number"
              value={trailPct}
              onChange={e => setTrailPct(parseInt(e.target.value) || 8)}
              className="w-full bg-[#050b0d] border border-[#132427] rounded px-2 py-1.5 text-xs text-[#ecf9f6] outline-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-[#ff3b69]/15 border border-[#ff3b69]/30 text-[#ff3b69]">
          {error}
        </div>
      )}

      {/* Backtest Results */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-[#081113] border border-[#132427]">
              <div className="text-[10px] text-[#7e9994] uppercase">Win Rate</div>
              <div className="text-xl font-bold text-[#00ffa3] mt-0.5">
                {result.win_rate_pct}%
              </div>
              <div className="text-[10px] text-[#7e9994] mt-0.5">
                {result.winning_trades}W / {result.losing_trades}L
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#081113] border border-[#132427]">
              <div className="text-[10px] text-[#7e9994] uppercase">Net Return</div>
              <div className={`text-xl font-bold mt-0.5 ${result.net_pnl_sol >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}`}>
                {result.net_pnl_sol >= 0 ? '+' : ''}{result.net_pnl_sol} SOL
              </div>
              <div className="text-[10px] text-[#7e9994] mt-0.5">
                {result.net_return_pct}%
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#081113] border border-[#132427]">
              <div className="text-[10px] text-[#7e9994] uppercase">Profit Factor</div>
              <div className="text-xl font-bold text-[#00e5ff] mt-0.5">
                {result.profit_factor}
              </div>
              <div className="text-[10px] text-[#7e9994] mt-0.5">
                Avg R: {result.average_r}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#081113] border border-[#132427]">
              <div className="text-[10px] text-[#7e9994] uppercase">Max Drawdown</div>
              <div className="text-xl font-bold text-[#ff3b69] mt-0.5">
                {result.max_drawdown_pct}%
              </div>
              <div className="text-[10px] text-[#7e9994] mt-0.5">
                p95: {result.monte_carlo_drawdown_p95}%
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#081113] border border-[#132427]">
              <div className="text-[10px] text-[#7e9994] uppercase">Sharpe / Sortino</div>
              <div className="text-xl font-bold text-[#ffb800] mt-0.5">
                {result.sharpe_ratio} / {result.sortino_ratio}
              </div>
              <div className="text-[10px] text-[#7e9994] mt-0.5">
                Risk-adjusted
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#081113] border border-[#132427]">
              <div className="text-[10px] text-[#7e9994] uppercase">Total Fees Paid</div>
              <div className="text-xl font-bold text-[#ecf9f6] mt-0.5">
                {result.total_fees_sol} SOL
              </div>
              <div className="text-[10px] text-[#7e9994] mt-0.5">
                Slippage: {result.total_slippage_sol} SOL
              </div>
            </div>
          </div>

          {/* Equity Chart */}
          {curve.length > 1 && (
            <div className="p-5 rounded-xl bg-[#081113] border border-[#132427]">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-xs text-[#ecf9f6]">
                  SIMULIERTER KAPITALVERLAUF (120 MARKT-EVENTS)
                </span>
                <span className="text-[#7e9994] text-[10px]">
                  Endkapital: {(startingSol + result.net_pnl_sol).toFixed(3)} SOL
                </span>
              </div>
              <div className="w-full h-32 overflow-hidden">
                <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
                  <polyline
                    fill="none"
                    stroke="#00ffa3"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
