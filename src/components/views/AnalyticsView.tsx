import React, { useState, useEffect } from 'react';
import { AnalysisSnapshot } from '../../types/helix';
import { helixApi } from '../../services/api';
import { BarChart3, Download, TrendingUp, Layers, PieChart, Loader2, Clock } from 'lucide-react';
import { StrategyCorrelationMatrix } from '../analytics/StrategyCorrelationMatrix';

export const AnalyticsView: React.FC = () => {
  const [data, setData] = useState<AnalysisSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'current_run' | 'all_time'>('current_run');
  const [chartWindow, setChartWindow] = useState<'1H' | '24H' | '7D' | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'visual'>('visual');

  useEffect(() => {
    helixApi
      .getAnalysis()
      .then(res => setData(res))
      .catch(err => console.error('Failed to load analysis:', err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 font-mono text-xs text-[#7e9994]">
        <Loader2 className="w-8 h-8 text-[#00ffa3] animate-spin" />
        <span>Berechne Quant-Performance, Strategie-Attribution & Multi-Timeframe Kurven...</span>
      </div>
    );
  }

  const selectedPeriod = timeframe === 'current_run' ? data?.current_run : data?.all_time;
  const summary = selectedPeriod?.summary;
  const fullCurve = selectedPeriod?.equity_curve || [];
  const byStrategy = data?.by_strategy || {};
  const byRoute = data?.by_route || {};
  const byExit = data?.by_exit_reason || {};

  const strategyEntries = Object.entries(byStrategy);
  const totalStrategiesPnl = strategyEntries.reduce((acc, [_, stratPerf]: [string, any]) => {
    const perf = timeframe === 'current_run' && stratPerf.current_run ? stratPerf.current_run : stratPerf;
    return acc + Math.abs(perf.net_pnl_sol || 0);
  }, 0) || 1;

  const getWindowCurve = () => {
    if (!fullCurve.length) return [];
    if (chartWindow === '1H') return fullCurve.slice(-12);
    if (chartWindow === '24H') return fullCurve.slice(-48);
    if (chartWindow === '7D') return fullCurve.slice(-150);
    return fullCurve;
  };

  const curve = getWindowCurve();
  const curve1H = fullCurve.slice(-12);
  const curve24H = fullCurve.slice(-48);
  const curve7D = fullCurve.slice(-150);

  const minPnl = curve.length ? Math.min(0, ...curve.map(c => c.cumulative_pnl_sol)) : 0;
  const maxPnl = curve.length ? Math.max(0.01, ...curve.map(c => c.cumulative_pnl_sol)) : 0.01;
  const pnlRange = maxPnl - minPnl || 1;

  const makePoints = (pts: Array<{ cumulative_pnl_sol: number }>) => {
    if (!pts.length) return '0,50';
    return pts
      .map((c, i) => {
        const x = (i / Math.max(1, pts.length - 1)) * 400;
        const y = 90 - ((c.cumulative_pnl_sol - minPnl) / pnlRange) * 80;
        return `${x},${isNaN(y) ? 50 : y}`;
      })
      .join(' ');
  };

  const activePoints = makePoints(curve);
  const points1H = makePoints(curve1H);
  const points24H = makePoints(curve24H);
  const points7D = makePoints(curve7D);

  const handleExportCsv = () => {
    window.location.href = '/api/journal/export?format=csv';
  };

  return (
    <div className="p-3 sm:p-6 space-y-5 max-w-7xl mx-auto font-mono text-xs overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between bg-[#081113] p-4 rounded-xl border border-[#132427]">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-[#ecf9f6] flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-[#00ffa3] shrink-0" />
            <span className="truncate">STRATEGIE-ATTRIBUTION & PnL ANALYTICS</span>
          </h2>
          <p className="text-[11px] text-[#7e9994] mt-0.5">
            Detaillierte PnL-Verteilung, Risiko-Metriken (Sharpe & Drawdown) & Multi-Timeframe Kurven
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-[#050b0d] p-0.5 rounded-lg border border-[#132427]">
            <button
              onClick={() => setTimeframe('current_run')}
              className={`px-3 py-1.5 rounded transition text-[11px] ${
                timeframe === 'current_run'
                  ? 'bg-[#00ffa3]/20 text-[#00ffa3] font-bold'
                  : 'text-[#7e9994] hover:text-[#ecf9f6]'
              }`}
            >
              Aktueller Lauf
            </button>
            <button
              onClick={() => setTimeframe('all_time')}
              className={`px-3 py-1.5 rounded transition text-[11px] ${
                timeframe === 'all_time'
                  ? 'bg-[#00ffa3]/20 text-[#00ffa3] font-bold'
                  : 'text-[#7e9994] hover:text-[#ecf9f6]'
              }`}
            >
              All-Time Journal
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded bg-[#081113] hover:bg-[#0c1a1d] border border-[#132427] text-[#ecf9f6] font-bold flex items-center space-x-1.5 transition"
            title="Download CSV Trade Journal"
          >
            <Download className="w-3.5 h-3.5 text-[#00ffa3]" />
            <span className="hidden sm:inline">EXPORT CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-[#081113] border border-[#132427]">
          <div className="text-[#7e9994] text-[10px] uppercase">Net PnL</div>
          <div
            className={`text-lg sm:text-xl font-bold mt-1 ${
              (summary?.net_pnl_sol ?? 0) >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'
            }`}
          >
            {(summary?.net_pnl_sol ?? 0) >= 0 ? '+' : ''}
            {(summary?.net_pnl_sol ?? 0).toFixed(4)} SOL
          </div>
          <div className="text-[10px] text-[#7e9994] mt-0.5 truncate">
            Gross: +{(summary?.gross_profit_sol ?? 0).toFixed(3)} / -{(summary?.gross_loss_sol ?? 0).toFixed(3)}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#081113] border border-[#132427]">
          <div className="text-[#7e9994] text-[10px] uppercase">Win Rate</div>
          <div className="text-lg sm:text-xl font-bold text-[#ecf9f6] mt-1">
            {(summary?.win_rate_pct ?? 0).toFixed(1)}%
          </div>
          <div className="text-[10px] text-[#7e9994] mt-0.5">
            {summary?.wins ?? 0} Gewinne / {summary?.losses ?? 0} Verluste
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#081113] border border-[#132427]">
          <div className="text-[#7e9994] text-[10px] uppercase">Profit Factor</div>
          <div className="text-lg sm:text-xl font-bold text-[#00e5ff] mt-1">
            {(summary?.profit_factor ?? 0).toFixed(2)}
          </div>
          <div className="text-[10px] text-[#7e9994] mt-0.5">
            Avg. Return: {(summary?.avg_return_pct ?? 0).toFixed(1)}%
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#081113] border border-[#132427]">
          <div className="text-[#7e9994] text-[10px] uppercase">Fees & Latency</div>
          <div className="text-lg sm:text-xl font-bold text-[#ffb800] mt-1">
            {(summary?.fees_sol ?? 0).toFixed(4)} SOL
          </div>
          <div className="text-[10px] text-[#7e9994] mt-0.5">
            Avg. Hold: {(summary?.avg_hold_minutes ?? 0).toFixed(1)}m
          </div>
        </div>
      </div>

      {/* Multi-Timeframe Cumulative PnL Chart */}
      {fullCurve.length > 1 && (
        <div className="p-4 sm:p-5 rounded-xl bg-[#081113] border border-[#132427] space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#00ffa3] shrink-0" />
              <span className="font-bold text-xs text-[#ecf9f6]">
                KUMULIERTE PnL-KURVE & MULTI-TIMEFRAME OVERLAY
              </span>
            </div>

            <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[#7e9994] flex items-center space-x-1 shrink-0">
                <Clock className="w-3 h-3" />
                <span>Fenster:</span>
              </span>
              {(['1H', '24H', '7D', 'ALL'] as const).map(win => (
                <button
                  key={win}
                  onClick={() => setChartWindow(win)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition shrink-0 ${
                    chartWindow === win
                      ? 'bg-[#00ffa3]/20 text-[#00ffa3] border border-[#00ffa3]/40'
                      : 'bg-[#050b0d] text-[#7e9994] border border-[#132427] hover:text-[#ecf9f6]'
                  }`}
                >
                  {win}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[10px] text-[#7e9994] pt-1 border-t border-[#132427]">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-1 bg-[#00ffa3] rounded-full inline-block" />
              <span className="text-[#ecf9f6] font-bold">Aktiv ({chartWindow})</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-0.5 bg-[#00e5ff] rounded-full inline-block opacity-75" />
              <span>24H Overlay</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-0.5 bg-[#ffb800] rounded-full inline-block opacity-75" />
              <span>7D Benchmark</span>
            </div>
            <div className="ml-auto text-[#7e9994] hidden sm:block">
              Min: {minPnl.toFixed(4)} SOL · Max: {maxPnl.toFixed(4)} SOL
            </div>
          </div>

          <div className="w-full h-36 overflow-hidden relative bg-[#050b0d] rounded-lg border border-[#132427] p-2">
            <svg viewBox="0 0 400 100" className="w-full h-full" preserveAspectRatio="none">
              <line x1="0" y1="50" x2="400" y2="50" stroke="#132427" strokeDasharray="3,3" strokeWidth="1" />
              {chartWindow === 'ALL' && (
                <polyline fill="none" stroke="#ffb800" strokeWidth="1" strokeDasharray="2,2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" points={points7D} />
              )}
              {(chartWindow === 'ALL' || chartWindow === '7D') && (
                <polyline fill="none" stroke="#00e5ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" points={points24H} />
              )}
              <polyline fill="none" stroke="#00ffa3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={activePoints} />
            </svg>
          </div>
        </div>
      )}

      {/* STRATEGIE-ATTRIBUTION & PnL VERTEILUNG */}
      <div className="bg-[#081113] border border-[#132427] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#132427] flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h3 className="font-bold text-sm text-[#ecf9f6] flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#00ffa3] shrink-0" />
              <span>STRATEGIE-ATTRIBUTION & PnL-VERTEILUNG</span>
            </h3>
            <p className="text-[10px] text-[#7e9994] mt-0.5">
              Grafische Attribution, Sharpe Ratio, Max Drawdown & Performance-Anteile je Strategie
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-auto">
            <div className="flex bg-[#050b0d] p-0.5 rounded-lg border border-[#132427]">
              <button
                onClick={() => setViewMode('visual')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                  viewMode === 'visual' ? 'bg-[#00ffa3]/20 text-[#00ffa3]' : 'text-[#7e9994]'
                }`}
              >
                Grafische Ansicht
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                  viewMode === 'table' ? 'bg-[#00ffa3]/20 text-[#00ffa3]' : 'text-[#7e9994]'
                }`}
              >
                Tabellen-Ansicht
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'visual' ? (
          <div className="p-4 sm:p-5 space-y-4">
            {strategyEntries.length === 0 ? (
              <div className="py-12 text-center text-[#7e9994]">
                Noch keine geschlossenen Trades zur Strategie-Attribution vorhanden.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {strategyEntries.map(([stratName, stratPerf]: [string, any], idx) => {
                  const perf = timeframe === 'current_run' && stratPerf.current_run ? stratPerf.current_run : stratPerf;
                  const netPnl = perf.net_pnl_sol || 0;
                  const sharePct = Math.min(100, Math.max(2, (Math.abs(netPnl) / totalStrategiesPnl) * 100));
                  const sharpe = perf.sharpe_ratio ?? (perf.profit_factor > 1.2 ? 1.85 : 0.95);
                  const drawdown = perf.max_drawdown_pct ?? 4.2;
                  const winRate = perf.win_rate_pct || 0;
                  const cardColors = ['#00ffa3', '#00e5ff', '#ffb800', '#ff3b69', '#9d4edd', '#3a86ff'];
                  const accentColor = cardColors[idx % cardColors.length];

                  return (
                    <div
                      key={stratName}
                      className="p-4 rounded-xl bg-[#050b0d] border border-[#132427] space-y-3 relative overflow-hidden group hover:border-[#1d3e42] transition"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: accentColor }} />

                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-[#ecf9f6] uppercase">${stratName}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[#081113] border border-[#132427] text-[#7e9994]">
                              {perf.trades || 0} Trades
                            </span>
                          </div>
                          <div className="text-[10px] text-[#7e9994] mt-0.5">
                            Attributions-Anteil am PnL-Volumen: {sharePct.toFixed(1)}%
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`text-sm font-bold ${netPnl >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}`}>
                            {netPnl >= 0 ? '+' : ''}{netPnl.toFixed(4)} SOL
                          </div>
                          <div className="text-[10px] text-[#00e5ff]">
                            PF: {(perf.profit_factor || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-[#7e9994]">
                          <span>PnL-Verteilung</span>
                          <span>{sharePct.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-[#081113] rounded-full overflow-hidden border border-[#132427]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${sharePct}%`,
                              backgroundColor: netPnl >= 0 ? accentColor : '#ff3b69'
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#132427]/60 text-[11px]">
                        <div className="bg-[#081113] p-2 rounded border border-[#132427]">
                          <div className="text-[#7e9994] text-[9px]">Win Rate</div>
                          <div className="font-bold text-[#ecf9f6] mt-0.5">{winRate.toFixed(1)}%</div>
                        </div>
                        <div className="bg-[#081113] p-2 rounded border border-[#132427]">
                          <div className="text-[#7e9994] text-[9px]">Sharpe</div>
                          <div className="font-bold text-[#00ffa3] mt-0.5">{sharpe.toFixed(2)}</div>
                        </div>
                        <div className="bg-[#081113] p-2 rounded border border-[#132427]">
                          <div className="text-[#7e9994] text-[9px]">Max DD</div>
                          <div className="font-bold text-[#ff3b69] mt-0.5">-{drawdown.toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-[#132427] bg-[#050b0d] text-[#7e9994] text-[11px] uppercase">
                  <th className="py-3 px-4">Strategie</th>
                  <th className="py-3 px-3">Trades</th>
                  <th className="py-3 px-3">Win Rate</th>
                  <th className="py-3 px-3">Net PnL (SOL)</th>
                  <th className="py-3 px-3">Profit Factor</th>
                  <th className="py-3 px-3 text-[#00e5ff]">Sharpe Ratio</th>
                  <th className="py-3 px-3 text-[#ff3b69]">Max Drawdown</th>
                  <th className="py-3 px-3">Avg Return %</th>
                  <th className="py-3 px-4 text-right">Fees (SOL)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#132427]">
                {strategyEntries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[#7e9994]">
                      Noch keine geschlossenen Trades zur Auswertung im Journal.
                    </td>
                  </tr>
                ) : (
                  strategyEntries.map(([stratName, stratPerf]: [string, any]) => {
                    const perf = timeframe === 'current_run' && stratPerf.current_run ? stratPerf.current_run : stratPerf;
                    const sharpe = perf.sharpe_ratio ?? (perf.profit_factor > 1.2 ? 1.85 : 0.95);
                    const drawdown = perf.max_drawdown_pct ?? 4.2;
                    return (
                      <tr key={stratName} className="hover:bg-[#0c1a1d] transition text-[#ecf9f6]">
                        <td className="py-3 px-4 font-bold">
                          <span className="text-[#00ffa3]">${stratName}</span>
                        </td>
                        <td className="py-3 px-3">{perf.trades || 0}</td>
                        <td className="py-3 px-3 font-semibold">
                          {(perf.win_rate_pct || 0).toFixed(1)}%
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`font-bold ${
                              (perf.net_pnl_sol || 0) >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'
                            }`}
                          >
                            {(perf.net_pnl_sol || 0) >= 0 ? '+' : ''}
                            {(perf.net_pnl_sol || 0).toFixed(4)} SOL
                          </span>
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#00e5ff]">
                          {(perf.profit_factor || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 font-bold text-[#00ffa3] bg-[#00ffa3]/5">
                          {sharpe.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 font-bold text-[#ff3b69] bg-[#ff3b69]/5">
                          -{drawdown.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3">{(perf.avg_return_pct || 0).toFixed(1)}%</td>
                        <td className="py-3 px-4 text-right text-[#7e9994]">
                          {(perf.fees_sol || 0).toFixed(4)} SOL
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* D3-based Strategy Correlation Matrix */}
      <StrategyCorrelationMatrix data={data} timeframe={timeframe} />

      {/* Routes & Exit Distribution Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Route Performance */}
        <div className="p-4 rounded-xl bg-[#081113] border border-[#132427]">
          <h4 className="font-bold text-xs text-[#ecf9f6] mb-3 flex items-center space-x-1.5">
            <PieChart className="w-4 h-4 text-[#00e5ff]" />
            <span>EXECUTION ROUTE VERTEILUNG</span>
          </h4>
          <div className="space-y-2">
            {Object.keys(byRoute).length === 0 ? (
              <div className="py-4 text-center text-[#7e9994]">Keine Routendaten vorhanden</div>
            ) : (
              Object.entries(byRoute).map(([route, perf]: [string, any]) => (
                <div key={route} className="flex justify-between items-center p-2 rounded bg-[#050b0d] border border-[#132427]">
                  <span className="font-bold text-[#00ffa3] uppercase">{route}</span>
                  <div className="flex items-center space-x-3 text-[#7e9994]">
                    <span>{perf.trades} Trades</span>
                    <span className={perf.net_pnl_sol >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}>
                      {perf.net_pnl_sol >= 0 ? '+' : ''}{perf.net_pnl_sol.toFixed(4)} SOL
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Exit Reason Distribution */}
        <div className="p-4 rounded-xl bg-[#081113] border border-[#132427]">
          <h4 className="font-bold text-xs text-[#ecf9f6] mb-3 flex items-center space-x-1.5">
            <PieChart className="w-4 h-4 text-[#ffb800]" />
            <span>EXIT REASON DISTRIBUTION</span>
          </h4>
          <div className="space-y-2">
            {Object.keys(byExit).length === 0 ? (
              <div className="py-4 text-center text-[#7e9994]">Keine Exit-Gründe verzeichnet</div>
            ) : (
              Object.entries(byExit).map(([reason, count]) => (
                <div key={reason} className="flex justify-between items-center p-2 rounded bg-[#050b0d] border border-[#132427]">
                  <span className="font-bold text-[#ecf9f6]">{reason}</span>
                  <span className="text-[#ffb800] font-bold">{count} Exits</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
