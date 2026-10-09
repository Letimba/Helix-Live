import React, { useState } from 'react';
import { Coin, AppConfig } from '../../types/helix';
import { Crosshair, Zap, Shield, Clock, Flame, Sliders, CheckCircle } from 'lucide-react';
import { helixApi } from '../../services/api';

interface SniperViewProps {
  candidates?: Coin[];
  config: AppConfig | null;
  onTradeCoin: (coin: Coin) => void;
  onInspectCoin: (coin: Coin) => void;
  onUpdateConfig: (cfg: Partial<AppConfig>) => void;
}

export const SniperView: React.FC<SniperViewProps> = ({
  candidates = [],
  config,
  onTradeCoin,
  onInspectCoin,
  onUpdateConfig
}) => {
  const [maxAge, setMaxAge] = useState<number>(config?.sniper_max_age_seconds ?? 60);
  const [minScore, setMinScore] = useState<number>(config?.sniper_min_score ?? 58);
  const [tradeSol, setTradeSol] = useState<number>(config?.max_trade_sol ?? 0.2);
  const [saving, setSaving] = useState(false);

  // Filter candidates younger than 180s or marked as is_new
  const now = Date.now();
  const list = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
  const freshTokens = list
    .filter(c => {
      if (!c) return false;
      const createdAt = c.created_at_ms || now;
      const ageSec = c.age_seconds ?? Math.max(0, (now - createdAt) / 1000);
      return ageSec <= 180 || !!c.is_new;
    })
    .sort((a, b) => {
      const createdAtA = a.created_at_ms || now;
      const createdAtB = b.created_at_ms || now;
      const ageA = a.age_seconds ?? Math.max(0, (now - createdAtA) / 1000);
      const ageB = b.age_seconds ?? Math.max(0, (now - createdAtB) / 1000);
      return ageA - ageB;
    });

  const handleSaveParams = async () => {
    setSaving(true);
    try {
      await onUpdateConfig({
        sniper_max_age_seconds: maxAge,
        sniper_min_score: minScore,
        max_trade_sol: tradeSol
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto font-mono text-xs overflow-y-auto">
      {/* Sniper Control Banner */}
      <div className="bg-[#081113] border border-[#132427] rounded-xl p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#ff3b69]/15 border border-[#ff3b69]/40 flex items-center justify-center text-[#ff3b69]">
              <Crosshair className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#ecf9f6] flex items-center space-x-2">
                <span>ULTRA-LOW LATENCY SNIPER ENGINE</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#00ffa3]/15 text-[#00ffa3] font-bold">
                  &lt;50ms SPEED
                </span>
              </h2>
              <p className="text-xs text-[#7e9994] mt-0.5">
                Direkte Erfassung frischer Solana Pool-Launches vor PumpSwap & Raydium
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleSaveParams}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#00ffa3] text-[#030708] font-bold hover:brightness-110 transition flex items-center space-x-1.5"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>{saving ? 'SPEICHERE...' : 'PARAMETER ANWENDEN'}</span>
            </button>
          </div>
        </div>

        {/* Configuration Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[#132427]">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#7e9994]">Max. Token-Alter:</span>
              <span className="text-[#00ffa3] font-bold">{maxAge}s</span>
            </div>
            <input
              type="range"
              min="10"
              max="180"
              step="5"
              value={maxAge}
              onChange={e => setMaxAge(parseInt(e.target.value))}
              className="w-full accent-[#00ffa3] h-1.5 bg-[#050b0d] rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#7e9994]">Min. Opportunity Score:</span>
              <span className="text-[#00e5ff] font-bold">{minScore}/100</span>
            </div>
            <input
              type="range"
              min="40"
              max="85"
              step="1"
              value={minScore}
              onChange={e => setMinScore(parseInt(e.target.value))}
              className="w-full accent-[#00e5ff] h-1.5 bg-[#050b0d] rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#7e9994]">Snipe Trade Size (SOL):</span>
              <span className="text-[#ffb800] font-bold">{tradeSol} SOL</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="2.0"
              step="0.05"
              value={tradeSol}
              onChange={e => setTradeSol(parseFloat(e.target.value))}
              className="w-full accent-[#ffb800] h-1.5 bg-[#050b0d] rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Fresh Token Launch Feed */}
      <div className="bg-[#081113] border border-[#132427] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#ecf9f6] flex items-center space-x-2">
            <Flame className="w-4 h-4 text-[#ff3b69]" />
            <span>FRISCHE LAUNCHES (&lt;3 MINUTEN ALT) ({freshTokens.length})</span>
          </h3>
          <span className="text-xs text-[#7e9994]">Auto-Scan aktiv</span>
        </div>

        {freshTokens.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#7e9994]">
            Aktuell keine Token unter 3 Minuten Alter gefunden. Warte auf neuen Block-Launch...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {freshTokens.map(coin => {
              const ageSec = coin.age_seconds ?? Math.max(0, (now - coin.created_at_ms) / 1000);
              const isMatch = ageSec <= maxAge && coin.opportunity_score >= minScore;

              return (
                <div
                  key={coin.mint}
                  onClick={() => onInspectCoin(coin)}
                  className={`p-3.5 rounded-lg border flex flex-col justify-between cursor-pointer transition ${
                    isMatch
                      ? 'bg-[#00ffa3]/5 border-[#00ffa3]/50 shadow-[0_0_12px_rgba(0,255,163,0.15)]'
                      : 'bg-[#050b0d] border-[#132427] hover:border-[#1d3e42]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded bg-[#081113] border border-[#132427] flex items-center justify-center font-bold text-xs text-[#00ffa3]">
                        {coin.symbol.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-[#ecf9f6] flex items-center space-x-1.5">
                          <span>${coin.symbol}</span>
                          {isMatch && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-[#00ffa3] text-[#030708] font-extrabold">
                              SNIPE QUALIFIED
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#7e9994] flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-[#ffb800]" />
                          <span>{ageSec.toFixed(0)}s alt</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-[#00ffa3]">
                        {coin.opportunity_score.toFixed(0)}/100
                      </div>
                      <div className="text-[10px] text-[#7e9994]">
                        Liq: ${(coin.liquidity_usd / 1000).toFixed(1)}k
                      </div>
                    </div>
                  </div>

                  <div className="py-2 border-t border-[#132427] flex justify-between items-center text-[11px] text-[#7e9994]">
                    <span>5m Vol: ${(coin.volume_5m_usd / 1000).toFixed(1)}k</span>
                    <span className={coin.price_change_5m >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}>
                      {coin.price_change_5m >= 0 ? '+' : ''}{coin.price_change_5m.toFixed(1)}%
                    </span>
                  </div>

                  <div className="flex space-x-2 mt-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onInspectCoin(coin);
                      }}
                      className="flex-1 py-1.5 rounded bg-[#081113] hover:bg-[#0c1a1d] border border-[#132427] text-[#7e9994] hover:text-[#ecf9f6] font-bold text-center"
                    >
                      AUDIT
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onTradeCoin(coin);
                      }}
                      className="flex-1 py-1.5 rounded bg-[#00ffa3] hover:brightness-110 text-[#030708] font-bold text-center shadow-md flex items-center justify-center space-x-1"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                      <span>SNIPE NOW</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
