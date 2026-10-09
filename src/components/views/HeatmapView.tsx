import React, { useState } from 'react';
import { Coin } from '../../types/helix';
import { Grid, Eye, Zap } from 'lucide-react';

interface HeatmapViewProps {
  candidates?: Coin[];
  onTradeCoin: (coin: Coin) => void;
  onInspectCoin: (coin: Coin) => void;
}

export const HeatmapView: React.FC<HeatmapViewProps> = ({
  candidates = [],
  onTradeCoin,
  onInspectCoin
}) => {
  const [sizeBy, setSizeBy] = useState<'volume' | 'liquidity'>('volume');

  const list = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  // Filter top 32 coins
  const sorted = [...list].slice(0, 32);

  const getHeatColor = (pct: number) => {
    if (pct >= 50) return 'bg-[#00ffa3]/85 text-[#030708] border-[#00ffa3]';
    if (pct >= 25) return 'bg-[#00ffa3]/50 text-[#ecf9f6] border-[#00ffa3]/70';
    if (pct >= 10) return 'bg-[#00ffa3]/25 text-[#ecf9f6] border-[#00ffa3]/40';
    if (pct >= 0) return 'bg-[#081113] text-[#ecf9f6] border-[#132427]';
    if (pct >= -10) return 'bg-[#ff3b69]/20 text-[#ecf9f6] border-[#ff3b69]/40';
    if (pct >= -25) return 'bg-[#ff3b69]/45 text-[#ecf9f6] border-[#ff3b69]/60';
    return 'bg-[#ff3b69]/85 text-white border-[#ff3b69]';
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto font-mono text-xs overflow-y-auto">
      {/* Header controls */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between bg-[#081113] p-4 rounded-xl border border-[#132427]">
        <div>
          <h2 className="text-base font-bold text-[#ecf9f6] flex items-center space-x-2">
            <Grid className="w-5 h-5 text-[#00ffa3]" />
            <span>SOLANA MEME-MARKET HEATMAP</span>
          </h2>
          <p className="text-xs text-[#7e9994] mt-0.5">
            Echtzeit-Volumen & 5-Minuten Dynamik im Überblick
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-[#7e9994]">Größe nach:</span>
          <button
            onClick={() => setSizeBy('volume')}
            className={`px-3 py-1.5 rounded border transition ${
              sizeBy === 'volume'
                ? 'bg-[#00ffa3]/20 border-[#00ffa3] text-[#00ffa3] font-bold'
                : 'bg-[#050b0d] border-[#132427] text-[#7e9994]'
            }`}
          >
            5m Volume
          </button>
          <button
            onClick={() => setSizeBy('liquidity')}
            className={`px-3 py-1.5 rounded border transition ${
              sizeBy === 'liquidity'
                ? 'bg-[#00ffa3]/20 border-[#00ffa3] text-[#00ffa3] font-bold'
                : 'bg-[#050b0d] border-[#132427] text-[#7e9994]'
            }`}
          >
            Liquidity
          </button>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5">
        {sorted.map(coin => {
          const pct = coin.price_change_5m;
          const heatStyle = getHeatColor(pct);
          const metricVal = sizeBy === 'volume' ? coin.volume_5m_usd : coin.liquidity_usd;

          return (
            <div
              key={coin.mint}
              onClick={() => onInspectCoin(coin)}
              className={`p-3 rounded-lg border flex flex-col justify-between cursor-pointer transition hover:scale-[1.02] shadow-sm relative group min-h-[95px] ${heatStyle}`}
            >
              <div className="flex justify-between items-start">
                <span className="font-extrabold text-sm truncate max-w-[80px]">
                  ${coin.symbol}
                </span>
                <span className="text-[10px] font-bold">
                  {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
                </span>
              </div>

              <div className="my-1">
                <div className="text-[11px] font-semibold opacity-90 truncate">
                  ${coin.price_usd < 0.01 ? coin.price_usd.toFixed(6) : coin.price_usd.toFixed(3)}
                </div>
                <div className="text-[10px] opacity-75">
                  ${(metricVal / 1000).toFixed(0)}k {sizeBy === 'volume' ? 'Vol' : 'Liq'}
                </div>
              </div>

              {/* Hover quick trade button */}
              <div className="absolute inset-0 bg-[#050b0d]/90 backdrop-blur-xs rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center space-x-2 transition p-2">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onInspectCoin(coin);
                  }}
                  className="p-1.5 rounded bg-[#081113] text-[#ecf9f6] border border-[#132427] hover:border-[#00ffa3]"
                  title="Detail"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onTradeCoin(coin);
                  }}
                  className="px-2.5 py-1.5 rounded bg-[#00ffa3] text-[#030708] font-bold text-xs hover:brightness-110"
                >
                  BUY
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
