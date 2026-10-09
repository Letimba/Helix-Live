import React, { useState } from 'react';
import { Position } from '../../types/helix';
import { Briefcase, ArrowUpRight, ArrowDownRight, ShieldAlert, XOctagon, RefreshCw, Zap } from 'lucide-react';
import { playTradeSound } from '../../utils/sound';

interface PositionsViewProps {
  positions?: Position[];
  onSellPosition: (posId: string) => void;
  onCloseAll: () => void;
}

export const PositionsView: React.FC<PositionsViewProps> = ({
  positions = [],
  onSellPosition,
  onCloseAll
}) => {
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'CLOSED'>('OPEN');

  const safePositions = Array.isArray(positions) ? positions.filter(Boolean) : [];
  const openPositions = safePositions.filter(p => p && p.status === 'OPEN');
  const closedPositions = safePositions.filter(p => p && p.status === 'CLOSED');

  const displayed = filter === 'OPEN' ? openPositions : filter === 'CLOSED' ? closedPositions : safePositions;

  const totalOpenSol = openPositions.reduce((acc, p) => acc + (p.current_value_sol ?? 0), 0);
  const totalUnrealizedSol = openPositions.reduce((acc, p) => acc + (p.unrealized_pnl_sol ?? 0), 0);

  const handleCloseAll = () => {
    if (confirm('ACHTUNG: Alle offenen Positionen sofort mit Market-Sell schließen?')) {
      playTradeSound('kill');
      onCloseAll();
    }
  };

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto font-mono text-xs overflow-y-auto">
      {/* Top Banner & Emergency Close */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-[#081113] p-3.5 sm:p-4 rounded-xl border border-[#132427]">
        <div>
          <h2 className="text-base font-bold text-[#ecf9f6] flex items-center space-x-2">
            <Briefcase className="w-5 h-5 text-[#00ffa3]" />
            <span>PORTFOLIO & POSITION MANAGER</span>
          </h2>
          <div className="text-xs text-[#7e9994] mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Offen: <b className="text-[#ecf9f6]">{openPositions.length}</b></span>
            <span>Gesamtwert: <b className="text-[#00ffa3]">{totalOpenSol.toFixed(4)} SOL</b></span>
            <span>
              Unrealized:{' '}
              <b className={totalUnrealizedSol >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}>
                {totalUnrealizedSol >= 0 ? '+' : ''}{totalUnrealizedSol.toFixed(4)} SOL
              </b>
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filter toggle */}
          <div className="flex bg-[#050b0d] p-0.5 rounded-lg border border-[#132427]">
            <button
              onClick={() => setFilter('OPEN')}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded transition ${
                filter === 'OPEN' ? 'bg-[#00ffa3]/20 text-[#00ffa3] font-bold' : 'text-[#7e9994]'
              }`}
            >
              Open ({openPositions.length})
            </button>
            <button
              onClick={() => setFilter('CLOSED')}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded transition ${
                filter === 'CLOSED' ? 'bg-[#00ffa3]/20 text-[#00ffa3] font-bold' : 'text-[#7e9994]'
              }`}
            >
              Closed ({closedPositions.length})
            </button>
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded transition ${
                filter === 'ALL' ? 'bg-[#00ffa3]/20 text-[#00ffa3] font-bold' : 'text-[#7e9994]'
              }`}
            >
              Alle
            </button>
          </div>

          {openPositions.length > 0 && (
            <button
              onClick={handleCloseAll}
              className="px-3 py-1.5 rounded bg-[#ff3b69]/15 hover:bg-[#ff3b69]/30 text-[#ff3b69] border border-[#ff3b69]/40 font-bold flex items-center space-x-1.5 transition text-[11px]"
            >
              <XOctagon className="w-3.5 h-3.5" />
              <span>ALLE SCHLIESSEN</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile Card View (Active on < sm) */}
      <div className="block sm:hidden space-y-2.5">
        {displayed.length === 0 ? (
          <div className="p-8 text-center text-[#7e9994] bg-[#081113] rounded-xl border border-[#132427]">
            Keine Positionen in dieser Ansicht.
          </div>
        ) : (
          displayed.map(pos => {
            const roiPct = pos.entry_price_usd > 0
              ? ((pos.current_price_usd - pos.entry_price_usd) / pos.entry_price_usd) * 100
              : 0;
            const isOpen = pos.status === 'OPEN';

            return (
              <div
                key={pos.id}
                className="p-3.5 rounded-xl bg-[#081113] border border-[#132427] space-y-2.5 shadow-xs"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-base text-[#ecf9f6]">${pos.symbol}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#00ffa3]/10 text-[#00ffa3] font-semibold">
                        {pos.strategy}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#7e9994] mt-0.5">
                      Route: {pos.execution_route || 'auto'} · {pos.mint.slice(0, 4)}...{pos.mint.slice(-4)}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-extrabold text-base ${roiPct >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}`}>
                      {roiPct >= 0 ? '+' : ''}{roiPct.toFixed(1)}%
                    </div>
                    <div className="text-[10px] text-[#7e9994]">
                      {pos.unrealized_pnl_sol >= 0 ? '+' : ''}{pos.unrealized_pnl_sol.toFixed(4)} SOL
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 py-2 border-t border-[#132427] text-[11px] text-[#7e9994]">
                  <div>
                    Entry: <b className="text-[#ecf9f6]">{pos.entry_sol.toFixed(3)} SOL</b> (${pos.entry_price_usd < 0.01 ? pos.entry_price_usd.toFixed(6) : pos.entry_price_usd.toFixed(3)})
                  </div>
                  <div>
                    Aktuell: <b className="text-[#ecf9f6]">{pos.current_value_sol.toFixed(3)} SOL</b> (${pos.current_price_usd < 0.01 ? pos.current_price_usd.toFixed(6) : pos.current_price_usd.toFixed(3)})
                  </div>
                </div>

                {isOpen ? (
                  <button
                    onClick={() => onSellPosition(pos.id)}
                    className="w-full py-2.5 rounded-lg bg-[#ff3b69]/20 hover:bg-[#ff3b69]/30 text-[#ff3b69] border border-[#ff3b69]/40 font-bold text-xs flex items-center justify-center space-x-1.5 transition active:scale-[0.99]"
                  >
                    <XOctagon className="w-4 h-4" />
                    <span>SOFORT VERKAUFEN (SELL NOW)</span>
                  </button>
                ) : (
                  <div className="py-1 text-center text-[10px] text-[#7e9994] bg-[#050b0d] rounded border border-[#132427]">
                    Geschlossen: {pos.exit_reason || 'NORMAL'}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block bg-[#081113] border border-[#132427] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-[#132427] bg-[#050b0d] text-[#7e9994] text-[11px] uppercase">
                <th className="py-3 px-4">Token & Strategie</th>
                <th className="py-3 px-3">Entry Price</th>
                <th className="py-3 px-3">Current Price</th>
                <th className="py-3 px-3">Entry SOL</th>
                <th className="py-3 px-3">Current SOL</th>
                <th className="py-3 px-3">PnL (SOL)</th>
                <th className="py-3 px-3">ROI %</th>
                <th className="py-3 px-3">Route & Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#132427]">
              {displayed.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#7e9994]">
                    Keine Positionen in dieser Ansicht vorhanden.
                  </td>
                </tr>
              ) : (
                displayed.map(pos => {
                  const entryPrice = pos?.entry_price_usd ?? 0;
                  const currPrice = pos?.current_price_usd ?? 0;
                  const entrySol = pos?.entry_sol ?? 0;
                  const currValSol = pos?.current_value_sol ?? 0;
                  const unrealPnl = pos?.unrealized_pnl_sol ?? 0;
                  const roiPct = entryPrice > 0
                    ? ((currPrice - entryPrice) / entryPrice) * 100
                    : 0;
                  const isOpen = pos?.status === 'OPEN';
                  const symbol = pos?.symbol || 'TOKEN';
                  const mint = pos?.mint || 'xxxx';
                  const strategy = pos?.strategy || 'SNIPER';

                  return (
                    <tr key={pos?.id || Math.random()} className="hover:bg-[#0c1a1d] transition text-[#ecf9f6]">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm">${symbol}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#00ffa3]/10 text-[#00ffa3] font-semibold">
                            {strategy}
                          </span>
                        </div>
                        <div className="text-[10px] text-[#4b635f]">
                          {mint.slice(0, 4)}...{mint.slice(-4)}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-[#7e9994]">
                        ${entryPrice < 0.01 ? entryPrice.toFixed(8) : entryPrice.toFixed(4)}
                      </td>

                      <td className="py-3 px-3 font-semibold">
                        ${currPrice < 0.01 ? currPrice.toFixed(8) : currPrice.toFixed(4)}
                      </td>

                      <td className="py-3 px-3 text-[#7e9994]">
                        {entrySol.toFixed(4)} SOL
                      </td>

                      <td className="py-3 px-3 font-bold text-[#ecf9f6]">
                        {currValSol.toFixed(4)} SOL
                      </td>

                      <td className="py-3 px-3">
                        <span className={`font-bold ${unrealPnl >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}`}>
                          {unrealPnl >= 0 ? '+' : ''}{unrealPnl.toFixed(4)} SOL
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span className={`font-bold ${roiPct >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}`}>
                          {roiPct >= 0 ? '+' : ''}{roiPct.toFixed(1)}%
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <div className="text-[10px] font-semibold text-[#00e5ff]">
                          {pos?.execution_route || 'auto'}
                        </div>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                            isOpen
                              ? 'bg-[#00ffa3]/15 text-[#00ffa3]'
                              : 'bg-[#7e9994]/15 text-[#7e9994]'
                          }`}
                        >
                          {isOpen ? 'ACTIVE' : pos?.exit_reason || 'CLOSED'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isOpen ? (
                          <button
                            onClick={() => onSellPosition(pos.id)}
                            className="px-3 py-1.5 rounded bg-[#ff3b69]/15 hover:bg-[#ff3b69]/30 text-[#ff3b69] border border-[#ff3b69]/30 font-bold transition"
                          >
                            SELL NOW
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#7e9994]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
