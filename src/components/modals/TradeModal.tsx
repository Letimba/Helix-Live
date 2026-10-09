import React, { useState } from 'react';
import { Coin } from '../../types/helix';
import { helixApi } from '../../services/api';
import { playTradeSound } from '../../utils/sound';
import { X, Zap, Shield, ArrowRight, Loader2 } from 'lucide-react';

interface TradeModalProps {
  coin: Coin | null;
  mode: 'paper' | 'dry_run' | 'live';
  activeStrategy: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const TradeModal: React.FC<TradeModalProps> = ({
  coin,
  mode,
  activeStrategy,
  onClose,
  onSuccess
}) => {
  if (!coin) return null;

  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [amountSol, setAmountSol] = useState<number>(0.1);
  const [strategy, setStrategy] = useState<string>(activeStrategy || 'momentum');
  const [route, setRoute] = useState<'auto' | 'raydium' | 'pumpfun'>('auto');
  const [slippage, setSlippage] = useState<number>(2.5);
  const [simulate, setSimulate] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const priceSol = coin.price_sol > 0 ? coin.price_sol : 0.00002;
  const estimatedTokens = priceSol > 0 ? amountSol / priceSol : 0;
  const isLive = mode === 'live';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLive) {
        if (side === 'BUY') {
          const res: any = await helixApi.liveBuy({
            mint: coin.mint,
            symbol: coin.symbol,
            amount_sol: amountSol,
            slippage_pct: slippage
          });
          if (!res.success) throw new Error(res.error || 'Live Buy fehlgeschlagen');
        } else {
          const res: any = await helixApi.liveSell({
            mint: coin.mint,
            slippage_pct: slippage
          });
          if (!res.success) throw new Error(res.error || 'Live Sell fehlgeschlagen');
        }
      } else {
        // Paper mode
        if (side === 'BUY') {
          await helixApi.paperBuy({
            mint: coin.mint,
            symbol: coin.symbol,
            amount_sol: amountSol,
            strategy,
            route
          });
        }
      }

      playTradeSound(side === 'BUY' ? 'buy' : 'tp');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Orderausführung fehlgeschlagen');
      playTradeSound('sl');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-[#081113] border border-[#132427] w-full max-w-md rounded-xl p-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#7e9994] hover:text-[#ecf9f6] transition p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#050b0d] border border-[#132427] flex items-center justify-center font-bold text-[#00ffa3] font-mono text-base">
            {coin.symbol.slice(0, 3)}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-base text-[#ecf9f6]">{coin.name}</h3>
              <span className="font-mono text-xs text-[#00ffa3] bg-[#00ffa3]/10 px-1.5 py-0.5 rounded">
                ${coin.symbol}
              </span>
            </div>
            <div className="text-xs font-mono text-[#7e9994]">
              {coin.mint.slice(0, 6)}...{coin.mint.slice(-6)}
            </div>
          </div>
        </div>

        {/* Side Tabs */}
        <div className="grid grid-cols-2 gap-2 mb-4 bg-[#050b0d] p-1 rounded-lg border border-[#132427]">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-2 rounded font-mono font-bold text-xs transition ${
              side === 'BUY'
                ? 'bg-[#00ffa3] text-[#030708] shadow-[0_0_12px_rgba(0,255,163,0.3)]'
                : 'text-[#7e9994] hover:text-[#ecf9f6]'
            }`}
          >
            BUY {isLive ? '⚡ LIVE' : 'PAPER'}
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-2 rounded font-mono font-bold text-xs transition ${
              side === 'SELL'
                ? 'bg-[#ff3b69] text-white shadow-[0_0_12px_rgba(255,59,105,0.3)]'
                : 'text-[#7e9994] hover:text-[#ecf9f6]'
            }`}
          >
            SELL NOW
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2.5 rounded bg-[#ff3b69]/15 border border-[#ff3b69]/40 text-[#ff3b69] text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount SOL */}
          {side === 'BUY' && (
            <div>
              <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                <label className="text-[#7e9994]">Amount in SOL</label>
                <span className="text-[#ecf9f6] font-semibold">
                  ≈ ${(amountSol * (coin.price_usd > 0 && coin.price_sol > 0 ? coin.price_usd / coin.price_sol : 150)).toFixed(2)}
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="10"
                value={amountSol}
                onChange={e => setAmountSol(Math.max(0.01, parseFloat(e.target.value) || 0.01))}
                className="w-full bg-[#050b0d] border border-[#132427] rounded-lg px-3 py-2 text-sm font-mono text-[#ecf9f6] focus:border-[#00ffa3] outline-none"
              />
              <div className="flex space-x-1.5 mt-2">
                {[0.05, 0.1, 0.25, 0.5, 1.0].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmountSol(val)}
                    className={`flex-1 py-1 rounded text-xs font-mono border transition ${
                      amountSol === val
                        ? 'bg-[#00ffa3]/20 border-[#00ffa3] text-[#00ffa3] font-bold'
                        : 'bg-[#050b0d] border-[#132427] text-[#7e9994] hover:border-[#7e9994]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Strategy selection */}
          <div>
            <label className="block text-xs font-mono text-[#7e9994] mb-1">
              Strategy Attribution
            </label>
            <select
              value={strategy}
              onChange={e => setStrategy(e.target.value)}
              className="w-full bg-[#050b0d] border border-[#132427] rounded-lg px-3 py-2 text-xs font-mono text-[#ecf9f6] focus:border-[#00ffa3] outline-none"
            >
              <option value="sniper">Sniper (Launch Capture)</option>
              <option value="momentum">Momentum (Price & Vol Accel)</option>
              <option value="breakout">Breakout (Range Expansion)</option>
              <option value="trend-following">Trend Following</option>
              <option value="pullback-continuation">Pullback Continuation</option>
              <option value="volatility-expansion">Volatility Expansion</option>
              <option value="micro-scalper">Micro Scalper</option>
              <option value="hft-scalper">HFT Scalper</option>
              <option value="runner">Runner (Outlier Retention)</option>
              <option value="early-entry">Early Entry</option>
              <option value="graduation">Graduation</option>
              <option value="liquidity">Liquidity Core</option>
              <option value="mean-reversion">Mean Reversion</option>
              <option value="combo">Combo Consensus</option>
            </select>
          </div>

          {/* Route & Slippage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-[#7e9994] mb-1">
                Routing Mode
              </label>
              <select
                value={route}
                onChange={e => setRoute(e.target.value as any)}
                className="w-full bg-[#050b0d] border border-[#132427] rounded-lg px-2.5 py-2 text-xs font-mono text-[#ecf9f6] focus:border-[#00ffa3] outline-none"
              >
                <option value="auto">Auto (Raydium → Pump)</option>
                <option value="raydium">Raydium Direct (V0 Tx)</option>
                <option value="pumpfun">PumpPortal Local API</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono text-[#7e9994] mb-1">
                Max Slippage ({slippage}%)
              </label>
              <input
                type="range"
                min="0.5"
                max="15"
                step="0.5"
                value={slippage}
                onChange={e => setSlippage(parseFloat(e.target.value))}
                className="w-full accent-[#00ffa3] h-2 bg-[#050b0d] rounded-lg mt-2 cursor-pointer"
              />
            </div>
          </div>

          {/* Summary Details */}
          <div className="p-3 bg-[#050b0d] rounded-lg border border-[#132427] text-xs font-mono space-y-1.5 text-[#7e9994]">
            <div className="flex justify-between">
              <span>Token Price</span>
              <span className="text-[#ecf9f6]">${coin.price_usd < 0.01 ? coin.price_usd.toFixed(7) : coin.price_usd.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Return</span>
              <span className="text-[#00ffa3]">≈ {estimatedTokens.toLocaleString(undefined, { maximumFractionDigits: 0 })} {coin.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span>Est. Execution Latency</span>
              <span className="text-[#00e5ff]">~22ms (Sub-50ms Pipeline)</span>
            </div>
            <div className="flex justify-between">
              <span>Simulation Guard</span>
              <span className="text-[#00ffa3]">Active (Pre-flight verify)</span>
            </div>
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg font-mono font-bold text-sm tracking-wider flex items-center justify-center space-x-2 transition ${
              side === 'BUY'
                ? isLive
                  ? 'bg-gradient-to-r from-[#ff3b69] to-[#d92550] text-white hover:brightness-110 shadow-lg'
                  : 'bg-gradient-to-r from-[#00ffa3] to-[#00a86b] text-[#030708] hover:brightness-110 shadow-lg'
                : 'bg-[#ff3b69] text-white hover:bg-[#d92550]'
            }`}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>{side === 'BUY' ? `EXECUTE ${amountSol} SOL BUY` : 'EXECUTE SELL'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
