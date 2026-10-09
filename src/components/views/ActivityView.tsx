import React from 'react';
import { Fill } from '../../types/helix';
import { ListOrdered, ExternalLink, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface ActivityViewProps {
  fills?: Fill[];
}

export const ActivityView: React.FC<ActivityViewProps> = ({ fills = [] }) => {
  const safeFills = Array.isArray(fills) ? fills.filter(Boolean) : [];
  const reversed = [...safeFills].reverse();

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto font-mono text-xs overflow-y-auto">
      <div className="flex justify-between items-center bg-[#081113] p-4 rounded-xl border border-[#132427]">
        <div>
          <h2 className="text-base font-bold text-[#ecf9f6] flex items-center space-x-2">
            <ListOrdered className="w-5 h-5 text-[#00ffa3]" />
            <span>LIVE EXECUTION ORDER STREAM</span>
          </h2>
          <p className="text-xs text-[#7e9994] mt-0.5">
            Aufgezeichnete Fills, Routen, Latenzen und On-Chain Transaktionsnachweise
          </p>
        </div>
        <div className="text-xs text-[#7e9994]">
          Gesamt: <b className="text-[#ecf9f6]">{safeFills.length}</b> Fills
        </div>
      </div>

      <div className="bg-[#081113] border border-[#132427] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#132427] bg-[#050b0d] text-[#7e9994] text-[11px] uppercase">
                <th className="py-3 px-4">Zeit</th>
                <th className="py-3 px-3">Side & Token</th>
                <th className="py-3 px-3">Amount (SOL)</th>
                <th className="py-3 px-3">Price USD</th>
                <th className="py-3 px-3">PnL (SOL)</th>
                <th className="py-3 px-3">Route</th>
                <th className="py-3 px-3">Latenz</th>
                <th className="py-3 px-3">Grund</th>
                <th className="py-3 px-4 text-right">Tx Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#132427]">
              {reversed.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#7e9994]">
                    Noch keine Orderausführungen aufgezeichnet. Der Scanner beobachtet den Markt.
                  </td>
                </tr>
              ) : (
                reversed.map((fill, i) => {
                  const date = new Date(fill.ts_ms);
                  const timeStr = date.toLocaleTimeString();

                  return (
                    <tr key={i} className="hover:bg-[#0c1a1d] transition text-[#ecf9f6]">
                      <td className="py-3 px-4 text-[#7e9994]">{timeStr}</td>

                      <td className="py-3 px-3">
                        <div className="flex items-center space-x-1.5 font-bold">
                          <span className={fill.side === 'BUY' ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}>
                            {fill.side}
                          </span>
                          <span>${fill.symbol}</span>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-semibold">{fill.sol.toFixed(4)} SOL</td>

                      <td className="py-3 px-3 text-[#7e9994]">
                        ${fill.price_usd < 0.01 ? fill.price_usd.toFixed(8) : fill.price_usd.toFixed(4)}
                      </td>

                      <td className="py-3 px-3">
                        {fill.side === 'SELL' ? (
                          <span className={`font-bold ${fill.pnl_sol >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}`}>
                            {fill.pnl_sol >= 0 ? '+' : ''}{fill.pnl_sol.toFixed(4)} SOL
                          </span>
                        ) : (
                          <span className="text-[#7e9994]">—</span>
                        )}
                      </td>

                      <td className="py-3 px-3 font-semibold text-[#00e5ff] uppercase">
                        {fill.route}
                      </td>

                      <td className="py-3 px-3 text-[#7e9994]">
                        {fill.execution_latency_ms.toFixed(0)} ms
                      </td>

                      <td className="py-3 px-3">
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#050b0d] border border-[#132427] text-[#ecf9f6]">
                          {fill.reason || 'AUTO_TRADE'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        {fill.txid ? (
                          <a
                            href={`https://solscan.io/tx/${fill.txid}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#00ffa3] hover:underline inline-flex items-center space-x-1"
                          >
                            <span>{fill.txid.slice(0, 6)}...</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-[#7e9994]">SIMULATED</span>
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
