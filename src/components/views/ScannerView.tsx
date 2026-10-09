import React, { useState } from 'react';
import { Coin } from '../../types/helix';
import { Search, Filter, ShieldCheck, ShieldAlert, ArrowUpDown, Zap, Eye, LayoutGrid, Table } from 'lucide-react';

interface ScannerViewProps {
  candidates?: Coin[];
  onTradeCoin: (coin: Coin) => void;
  onInspectCoin: (coin: Coin) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  candidates = [],
  onTradeCoin,
  onInspectCoin
}) => {
  const [search, setSearch] = useState('');
  const [venueFilter, setVenueFilter] = useState<'ALL' | 'pump.fun' | 'raydium'>('ALL');
  const [safeOnly, setSafeOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'volume' | 'change' | 'liquidity'>('score');
  const [mobileViewMode, setMobileViewMode] = useState<'cards' | 'table'>('cards');

  // Bulletproof fallback: ensure candidates is an array with valid objects
  const list = Array.isArray(candidates) ? candidates.filter(Boolean) : [];

  const filtered = list
    .filter(c => {
      if (!c) return false;
      if (search) {
        const query = search.trim().toLowerCase();
        const name = (c.name || '').toLowerCase();
        const symbol = (c.symbol || '').toLowerCase();
        const mint = (c.mint || '').toLowerCase();
        const matches = name.includes(query) || symbol.includes(query) || mint.includes(query);
        if (!matches) return false;
      }
      if (venueFilter !== 'ALL' && !(c.venue || '').toLowerCase().includes(venueFilter.toLowerCase())) {
        return false;
      }
      if (safeOnly && c.rug_risk_state !== 'SAFE') {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'score') return (b.opportunity_score ?? 0) - (a.opportunity_score ?? 0);
      if (sortBy === 'volume') return (b.volume_5m_usd ?? 0) - (a.volume_5m_usd ?? 0);
      if (sortBy === 'change') return (b.price_change_5m ?? 0) - (a.price_change_5m ?? 0);
      if (sortBy === 'liquidity') return (b.liquidity_usd ?? 0) - (a.liquidity_usd ?? 0);
      return 0;
    });

  return (
    <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto font-mono text-xs overflow-y-auto">
      {/* Header & Filter Controls */}
      <div className="flex flex-col gap-3 bg-[#081113] p-3 sm:p-4 rounded-xl border border-[#132427]">
        <div className="flex flex-col sm:flex-row gap-2.5 sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7e9994] absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Token Name, $Symbol oder Mint suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-[#050b0d] border border-[#132427] rounded-lg pl-9 pr-3 py-2 text-xs text-[#ecf9f6] focus:border-[#00ffa3] outline-none"
            />
          </div>

          {/* Mobile Cards / Table toggle button */}
          <div className="sm:hidden flex justify-end">
            <div className="flex bg-[#050b0d] p-0.5 rounded border border-[#132427]">
              <button
                onClick={() => setMobileViewMode('cards')}
                className={`p-1.5 rounded transition ${mobileViewMode === 'cards' ? 'bg-[#00ffa3]/20 text-[#00ffa3]' : 'text-[#7e9994]'}`}
                title="Kartenansicht"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMobileViewMode('table')}
                className={`p-1.5 rounded transition ${mobileViewMode === 'table' ? 'bg-[#00ffa3]/20 text-[#00ffa3]' : 'text-[#7e9994]'}`}
                title="Tabellenansicht"
              >
                <Table className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Venue toggle */}
          <select
            value={venueFilter}
            onChange={e => setVenueFilter(e.target.value as any)}
            className="flex-1 sm:flex-none bg-[#050b0d] border border-[#132427] rounded-lg px-2.5 py-1.5 sm:py-2 text-xs text-[#ecf9f6] focus:border-[#00ffa3] outline-none"
          >
            <option value="ALL">Alle Venues</option>
            <option value="pump.fun">Nur Pump.fun</option>
            <option value="raydium">Nur Raydium</option>
          </select>

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="flex-1 sm:flex-none bg-[#050b0d] border border-[#132427] rounded-lg px-2.5 py-1.5 sm:py-2 text-xs text-[#ecf9f6] focus:border-[#00ffa3] outline-none"
          >
            <option value="score">Sort: Score</option>
            <option value="volume">Sort: Volumen</option>
            <option value="change">Sort: 5m %</option>
            <option value="liquidity">Sort: Liquidität</option>
          </select>

          {/* Safe filter */}
          <button
            onClick={() => setSafeOnly(!safeOnly)}
            className={`px-3 py-1.5 sm:py-2 rounded-lg border flex items-center space-x-1.5 transition ${
              safeOnly
                ? 'bg-[#00ffa3]/20 border-[#00ffa3] text-[#00ffa3] font-bold'
                : 'bg-[#050b0d] border-[#132427] text-[#7e9994] hover:text-[#ecf9f6]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Nur Safe</span>
          </button>
        </div>
      </div>

      {/* Mobile Card List View (Active on < sm if cards selected) */}
      <div className={`${mobileViewMode === 'cards' ? 'block sm:hidden' : 'hidden'} space-y-2.5`}>
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-[#7e9994] bg-[#081113] rounded-xl border border-[#132427]">
            Keine Token gefunden.
          </div>
        ) : (
          filtered.map(coin => (
            <div
              key={coin.mint}
              onClick={() => onInspectCoin(coin)}
              className="p-3.5 rounded-xl bg-[#081113] border border-[#132427] hover:border-[#1d3e42] active:scale-[0.99] transition cursor-pointer shadow-xs space-y-2.5"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#050b0d] border border-[#132427] flex items-center justify-center font-bold text-xs text-[#00ffa3] shrink-0">
                    {(coin.symbol || '??').slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="font-extrabold text-sm text-[#ecf9f6]">${coin.symbol || 'TOKEN'}</span>
                      <span className="text-[10px] px-1 py-0.2 rounded bg-[#00ffa3]/10 text-[#00ffa3]">
                        {coin.venue || 'solana'}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#7e9994] truncate max-w-[150px]">{coin.name || 'Unknown'}</div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-sm text-[#ecf9f6]">
                    {(coin.price_usd ?? 0) < 0.01 ? (coin.price_usd ?? 0).toFixed(7) : (coin.price_usd ?? 0).toFixed(4)}
                  </div>
                  <div className={`text-[11px] font-bold ${(coin.price_change_5m ?? 0) >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}`}>
                    5m: {(coin.price_change_5m ?? 0) >= 0 ? '+' : ''}{(coin.price_change_5m ?? 0).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Progress & metrics */}
              <div className="grid grid-cols-3 gap-2 py-2 border-t border-[#132427] text-[10px] text-[#7e9994]">
                <div>
                  Liq: <b className="text-[#ecf9f6]">${((coin.liquidity_usd ?? 0) / 1000).toFixed(0)}k</b>
                </div>
                <div>
                  Vol: <b className="text-[#ecf9f6]">${((coin.volume_5m_usd ?? 0) / 1000).toFixed(0)}k</b>
                </div>
                <div>
                  Score: <b className="text-[#00ffa3]">{(coin.opportunity_score ?? 0).toFixed(0)}/100</b>
                </div>
              </div>

              {/* Touch Action Buttons */}
              <div className="flex space-x-2 pt-1">
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onInspectCoin(coin);
                  }}
                  className="flex-1 py-2 rounded-lg bg-[#050b0d] hover:bg-[#0c1a1d] border border-[#132427] text-[#ecf9f6] font-bold text-xs flex items-center justify-center space-x-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>DETAILS</span>
                </button>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onTradeCoin(coin);
                  }}
                  className="flex-1 py-2 rounded-lg bg-[#00ffa3] text-[#030708] font-bold text-xs flex items-center justify-center space-x-1 shadow-sm"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>BUY NOW</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop & Table Mode (Always visible on >= sm, or on mobile when table toggled) */}
      <div className={`${mobileViewMode === 'table' ? 'block' : 'hidden sm:block'} bg-[#081113] border border-[#132427] rounded-xl overflow-hidden shadow-sm`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-[#132427] bg-[#050b0d] text-[#7e9994] text-[11px] uppercase">
                <th className="py-3 px-4">Token</th>
                <th className="py-3 px-3">Price USD</th>
                <th className="py-3 px-3">5m Change</th>
                <th className="py-3 px-3">Liquidity</th>
                <th className="py-3 px-3">5m Volume</th>
                <th className="py-3 px-3">Buys / Sells</th>
                <th className="py-3 px-3">Score (11F)</th>
                <th className="py-3 px-3">Rug Risk</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#132427]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#7e9994]">
                    Keine Token entsprechen den aktuellen Such- oder Filterkriterien.
                  </td>
                </tr>
              ) : (
                filtered.map(coin => (
                  <tr
                    key={coin.mint}
                    onClick={() => onInspectCoin(coin)}
                    className="hover:bg-[#0c1a1d] cursor-pointer transition text-[#ecf9f6]"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded bg-[#050b0d] border border-[#132427] flex items-center justify-center font-bold text-[10px] text-[#00ffa3] shrink-0">
                          {(coin.symbol || '??').slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-bold flex items-center space-x-1">
                            <span>${coin.symbol || 'TOKEN'}</span>
                            <span className="text-[10px] text-[#7e9994] font-normal truncate max-w-[120px]">
                              {coin.name || 'Unknown'}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#4b635f]">
                            {coin.venue || 'solana'} · {coin.mint ? `${coin.mint.slice(0, 4)}...${coin.mint.slice(-4)}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-semibold">
                      {(coin.price_usd ?? 0) < 0.01 ? (coin.price_usd ?? 0).toFixed(8) : (coin.price_usd ?? 0).toFixed(4)}
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`font-bold ${
                          (coin.price_change_5m ?? 0) >= 0 ? 'text-[#00ffa3]' : 'text-[#ff3b69]'
                        }`}
                      >
                        {(coin.price_change_5m ?? 0) >= 0 ? '+' : ''}
                        {(coin.price_change_5m ?? 0).toFixed(1)}%
                      </span>
                    </td>

                    <td className="py-3 px-3 text-[#7e9994]">
                      ${((coin.liquidity_usd ?? 0) / 1000).toFixed(1)}k
                    </td>

                    <td className="py-3 px-3 text-[#7e9994]">
                      ${((coin.volume_5m_usd ?? 0) / 1000).toFixed(1)}k
                    </td>

                    <td className="py-3 px-3">
                      <span className="text-[#00ffa3] font-semibold">{coin.buys_5m ?? 0}</span> /{' '}
                      <span className="text-[#ff3b69] font-semibold">{coin.sells_5m ?? 0}</span>
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-1.5">
                        <div className="w-12 h-1.5 bg-[#050b0d] rounded-full overflow-hidden border border-[#132427]">
                          <div
                            className={`h-full ${
                              (coin.opportunity_score ?? 0) >= 70
                                ? 'bg-[#00ffa3]'
                                : (coin.opportunity_score ?? 0) >= 50
                                ? 'bg-[#00e5ff]'
                                : 'bg-[#ff3b69]'
                            }`}
                            style={{ width: `${Math.min(100, coin.opportunity_score ?? 0)}%` }}
                          />
                        </div>
                        <span className="font-bold">{(coin.opportunity_score ?? 0).toFixed(0)}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          coin.rug_risk_state === 'SAFE'
                            ? 'bg-[#00ffa3]/15 text-[#00ffa3] border-[#00ffa3]/30'
                            : 'bg-[#ff3b69]/15 text-[#ff3b69] border-[#ff3b69]/30'
                        }`}
                      >
                        {coin.rug_risk_state || 'UNKNOWN'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onInspectCoin(coin);
                          }}
                          className="p-1 rounded text-[#7e9994] hover:text-[#ecf9f6] hover:bg-[#050b0d] transition"
                          title="11-Faktor Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            onTradeCoin(coin);
                          }}
                          className="px-2.5 py-1 rounded bg-[#00ffa3]/20 hover:bg-[#00ffa3]/35 text-[#00ffa3] border border-[#00ffa3]/40 font-bold transition"
                        >
                          BUY
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
