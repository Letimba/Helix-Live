import React from 'react';
import { Coin } from '../../types/helix';
import { X, ExternalLink, ShieldAlert, CheckCircle, TrendingUp, DollarSign, Activity } from 'lucide-react';

interface TokenDetailModalProps {
  coin: Coin | null;
  onClose: () => void;
  onTrade: (coin: Coin) => void;
}

export const TokenDetailModal: React.FC<TokenDetailModalProps> = ({ coin, onClose, onTrade }) => {
  if (!coin) return null;

  const b = coin.opportunity_breakdown || {};
  const isRugSafe = coin.rug_risk_state === 'SAFE';

  const factors = [
    { label: 'Liquidity Quality', val: b.liquidity_quality ?? 50, weight: '12%' },
    { label: 'Volume Acceleration', val: b.volume_acceleration ?? 50, weight: '12%' },
    { label: 'Buy Pressure Ratio', val: b.buy_pressure ?? 50, weight: '14%' },
    { label: 'Price Momentum', val: b.price_momentum ?? 50, weight: '14%' },
    { label: 'Holder Growth', val: b.holder_growth ?? 50, weight: '8%' },
    { label: 'Wallet Quality', val: b.wallet_quality ?? 50, weight: '8%' },
    { label: 'Market Cap Accel', val: b.market_cap_acceleration ?? 50, weight: '8%' },
    { label: 'Liquidity Accel', val: b.liquidity_acceleration ?? 50, weight: '8%' },
    { label: 'Trend Strength', val: b.trend_strength ?? 50, weight: '10%' },
    { label: 'Execution Quality', val: b.execution_quality ?? 50, weight: '6%' },
    { label: 'Risk Penalty (Invert)', val: 100 - (b.risk_penalty ?? 0), weight: '15%' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#081113] border border-[#132427] w-full max-w-2xl rounded-xl p-6 shadow-2xl relative my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#7e9994] hover:text-[#ecf9f6] transition p-1"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-start justify-between mb-5 pr-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-xl bg-[#050b0d] border border-[#132427] flex items-center justify-center text-lg font-mono font-extrabold text-[#00ffa3]">
              {coin.symbol.slice(0, 3)}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-[#ecf9f6]">{coin.name}</h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#00ffa3]/15 text-[#00ffa3] font-bold">
                  ${coin.symbol}
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#00e5ff]/10 text-[#00e5ff]">
                  {coin.venue}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono text-[#7e9994] mt-0.5">
                <span>{coin.mint}</span>
                <a
                  href={`https://solscan.io/token/${coin.mint}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#00ffa3] flex items-center space-x-0.5"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-extrabold font-mono text-[#ecf9f6]">
              ${coin.price_usd < 0.01 ? coin.price_usd.toFixed(8) : coin.price_usd.toFixed(4)}
            </div>
            <div
              className={`text-xs font-mono font-bold ${
                coin.price_change_5m >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'
              }`}
            >
              5m: {coin.price_change_5m >= 0 ? '+' : ''}
              {coin.price_change_5m.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Top metrics summary grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5 font-mono text-xs">
          <div className="p-3 rounded-lg bg-[#050b0d] border border-[#132427]">
            <div className="text-[#7e9994] text-[10px] uppercase">Opportunity Score</div>
            <div className="text-xl font-bold text-[#00ffa3] mt-0.5">
              {coin.opportunity_score.toFixed(0)}/100
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#050b0d] border border-[#132427]">
            <div className="text-[#7e9994] text-[10px] uppercase">Liquidity</div>
            <div className="text-base font-bold text-[#ecf9f6] mt-0.5">
              ${coin.liquidity_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#050b0d] border border-[#132427]">
            <div className="text-[#7e9994] text-[10px] uppercase">5m Volume</div>
            <div className="text-base font-bold text-[#ecf9f6] mt-0.5">
              ${coin.volume_5m_usd.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-[#050b0d] border border-[#132427]">
            <div className="text-[#7e9994] text-[10px] uppercase">Buy/Sell 5m</div>
            <div className="text-sm font-bold text-[#00ffa3] mt-0.5">
              {coin.buys_5m}B / <span className="text-[#ff3b69]">{coin.sells_5m}S</span>
            </div>
          </div>
        </div>

        {/* 11-Factor Opportunity Radar / Breakdown */}
        <div className="mb-5 p-4 rounded-lg bg-[#050b0d] border border-[#132427]">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-mono font-bold text-[#ecf9f6] flex items-center space-x-1.5">
              <Activity className="w-4 h-4 text-[#00ffa3]" />
              <span>11-FACTOR OPPORTUNITY MODELLING</span>
            </h4>
            <span className="text-[11px] font-mono text-[#00ffa3] font-bold">
              COMPOSITE: {coin.opportunity_score.toFixed(1)}
            </span>
          </div>
          <div className="space-y-2">
            {factors.map(f => (
              <div key={f.label} className="text-xs font-mono">
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-[#7e9994]">
                    {f.label} <span className="text-[10px] text-[#4b635f]">({f.weight})</span>
                  </span>
                  <span className="text-[#ecf9f6] font-semibold">{f.val.toFixed(0)}%</span>
                </div>
                <div className="h-1.5 bg-[#081113] rounded-full overflow-hidden border border-[#132427]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      f.val >= 70
                        ? 'bg-[#00ffa3]'
                        : f.val >= 45
                        ? 'bg-[#00e5ff]'
                        : 'bg-[#ff3b69]'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, f.val))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Rug Risk Audit */}
        <div className="mb-5 p-4 rounded-lg bg-[#050b0d] border border-[#132427] font-mono text-xs">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-[#ecf9f6] flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-[#ffb800]" />
              <span>ON-CHAIN RUG-PULL AUDIT</span>
            </h4>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                isRugSafe
                  ? 'bg-[#00ffa3]/15 text-[#00ffa3] border-[#00ffa3]/30'
                  : 'bg-[#ff3b69]/15 text-[#ff3b69] border-[#ff3b69]/30'
              }`}
            >
              {coin.rug_risk_state}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-[#7e9994] my-2">
            <div>
              Creator Holding: <b className="text-[#ecf9f6]">{coin.creator_holding_pct.toFixed(1)}%</b>
            </div>
            <div>
              Top Holder Conc: <b className="text-[#ecf9f6]">{coin.top_holder_concentration.toFixed(1)}%</b>
            </div>
            <div>
              Bonding Status: <b className="text-[#ecf9f6]">{coin.complete ? 'GRADUATED' : 'CURVE ACTIVE'}</b>
            </div>
            <div>
              Creator Banned: <b className={coin.banned ? 'text-[#ff3b69]' : 'text-[#00ffa3]'}>{coin.banned ? 'YES' : 'NO'}</b>
            </div>
          </div>

          {coin.rug_reasons && coin.rug_reasons.length > 0 && (
            <div className="mt-2 p-2 bg-[#ff3b69]/10 border border-[#ff3b69]/25 rounded text-[11px] text-[#ff3b69] space-y-0.5">
              {coin.rug_reasons.map(r => (
                <div key={r}>⚠ {r}</div>
              ))}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-[#050b0d] hover:bg-[#0c1a1d] border border-[#132427] text-[#7e9994] font-mono font-bold transition text-xs"
          >
            SCHLIESSEN
          </button>
          <button
            onClick={() => {
              onClose();
              onTrade(coin);
            }}
            className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-[#00ffa3] to-[#00a86b] text-[#030708] font-mono font-bold text-xs hover:brightness-110 shadow-lg flex items-center justify-center space-x-2 transition"
          >
            <span>TRADE DIESEN TOKEN</span>
          </button>
        </div>
      </div>
    </div>
  );
};
