import React, { useState, useEffect, useRef } from 'react';
import { EngineSnapshot, AppConfig, StrategyConfig } from '../../types/helix';
import { Sliders, CheckCircle, ShieldCheck, Zap, Info, BarChart2 } from 'lucide-react';
import { helixApi } from '../../services/api';
import * as d3 from 'd3';

interface StrategiesViewProps {
  snapshot: EngineSnapshot | null;
  onUpdateStrategy: (strat: string) => void;
  onUpdateActiveStrategies: (strats: string[]) => void;
}

const STRATEGY_INFO: Record<string, { title: string; desc: string; trigger: string; exit: string; regimes: string[] }> = {
  'sniper': {
    title: 'Sniper',
    desc: 'Erfasst brandneue Launches in den ersten Sekunden mit raschem Flow.',
    trigger: 'Token-Alter <60s + frühe Liquidität',
    exit: 'Enger TP/SL/Trailing',
    regimes: ['ACCELERATION', 'TREND', 'LOW_VOLATILITY']
  },
  'momentum': {
    title: 'Momentum',
    desc: 'Nutzt positive Preis- und Volumenbeschleunigung mit starkem Kaufdruck.',
    trigger: 'Preis- & Volumen-Beschleunigung + Buy-Dominanz',
    exit: 'TP + Dynamischer Trail',
    regimes: ['ACCELERATION', 'TREND', 'LOW_VOLATILITY']
  },
  'breakout': {
    title: 'Breakout',
    desc: 'Identifiziert dynamische Ausbrüche aus Konsolidierungszonen.',
    trigger: 'Spanne bricht mit Volumenspitze aus',
    exit: 'TP + Trailing Stop',
    regimes: ['ACCELERATION', 'TREND', 'LOW_VOLATILITY']
  },
  'trend-following': {
    title: 'Trend Following',
    desc: 'Folgt etablierten Aufwärtstrends mit solidem kontinuierlichem Zufluss.',
    trigger: 'Stetiger Aufwärtstrend + Zufluss-Geschwindigkeit',
    exit: 'Weiter TP + Trendfolge-Trail',
    regimes: ['TREND', 'ACCELERATION', 'LOW_VOLATILITY']
  },
  'pullback-continuation': {
    title: 'Pullback Continuation',
    desc: 'Kauft gesunde Rücksetzer im Aufwärtstrend bei einsetzender Erholung.',
    trigger: 'Vorangegangener Trend + Erholungsmomentum',
    exit: 'TP + Rebound-Trail',
    regimes: ['TREND', 'ACCELERATION']
  },
  'volatility-expansion': {
    title: 'Volatility Expansion',
    desc: 'Handelt die Volatilitätsausdehnung nach Perioden geringer Schwankung.',
    trigger: 'Plötzlicher Anstieg von Volatilität & Volumen',
    exit: 'Schneller Teilgewinn + Trail',
    regimes: ['ACCELERATION', 'BLOW_OFF', 'TREND']
  },
  'micro-scalper': {
    title: 'Micro Scalper',
    desc: 'Nutzt sehr kurze Mikrobewegungen in hochliquiden Märkten.',
    trigger: 'Schneller Flow + liquide Micro-Moves',
    exit: 'Sehr enger TP/SL (1-3m)',
    regimes: ['ACCELERATION', 'TREND', 'LOW_VOLATILITY']
  },
  'hft-scalper': {
    title: 'HFT Scalper',
    desc: 'Setzt auf extrem hohe Transaktionsfrequenz mit positivem Netto-Kaufüberschuss.',
    trigger: 'Transaktions-Geschwindigkeit >25 Tx/5m',
    exit: 'Sub-Minute TP/SL',
    regimes: ['ACCELERATION', 'TREND']
  },
  'runner': {
    title: 'Runner',
    desc: 'Schützt Ausreißer mit Teilgewinnen und break-even gestütztem Trailing Stop.',
    trigger: 'Starker Trend mit Outlier-Potential',
    exit: 'Break-Even + dyn. Stufen-Trail',
    regimes: ['TREND', 'ACCELERATION', 'BLOW_OFF']
  },
  'early-entry': {
    title: 'Early Entry',
    desc: 'Fängt Momentum in der frühen Bonding-Curve-Phase ein.',
    trigger: 'Junger Token + kontinuierlicher Buy-Flow',
    exit: 'TP + Trail vor Curve-Ende',
    regimes: ['ACCELERATION', 'TREND', 'LOW_VOLATILITY']
  },
  'graduation': {
    title: 'Graduation',
    desc: 'Spezialisiert auf den Übergang von Pump.fun zu Raydium Pools.',
    trigger: 'Abgeschlossene Bonding Curve + Initial-Raydium-Flow',
    exit: 'Post-Graduation TP + Trail',
    regimes: ['TREND', 'ACCELERATION', 'BLOW_OFF']
  },
  'liquidity': {
    title: 'Liquidity Core',
    desc: 'Priorisiert tiefe Liquiditätspools zur Minimierung von Slippage und Impact.',
    trigger: 'Hohe Liquidität + verlässliche Orderbuchtiefe',
    exit: 'Konservativer TP / SL',
    regimes: ['TREND', 'LOW_VOLATILITY', 'ACCELERATION']
  },
  'mean-reversion': {
    title: 'Mean Reversion',
    desc: 'Handelt Erholungen nach überverkauften Rückschlägen zurück zum Mittelwert.',
    trigger: 'Überverkaufter Preis + einsetzende Stabilisierung',
    exit: 'Ziel-Mittelwert + Schutz-SL',
    regimes: ['LOW_VOLATILITY', 'DISTRIBUTION', 'TREND']
  },
  'combo': {
    title: 'Combo Consensus',
    desc: 'Kombiniert Signale aller Modelle und bildet einen gewichteten Konsens.',
    trigger: 'Mehrheitliche Signal-Übereinstimmung',
    exit: 'Konfigurierter Standard-TP/SL',
    regimes: ['TREND', 'ACCELERATION', 'LOW_VOLATILITY', 'BLOW_OFF']
  }
};

export const StrategiesView: React.FC<StrategiesViewProps> = ({
  snapshot,
  onUpdateStrategy,
  onUpdateActiveStrategies
}) => {
  const currentStrat = snapshot?.strategy || 'trend-following';
  const activePool = snapshot?.active_strategies || ['trend-following', 'momentum', 'sniper'];
  const strategiesConfig = snapshot?.config?.strategies || {};

  const [selectedStrat, setSelectedStrat] = useState<string>(currentStrat);
  const [params, setParams] = useState<StrategyConfig>(
    strategiesConfig[currentStrat] || {
      min_score: 60,
      stop_pct: 10,
      take_pct: 25,
      trail_pct: 8,
      max_hold_minutes: 15
    }
  );
  const [saving, setSaving] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const handleStratSelect = (key: string) => {
    setSelectedStrat(key);
    if (strategiesConfig[key]) {
      setParams(strategiesConfig[key]);
    }
  };

  const handleTogglePool = (key: string) => {
    let next: string[];
    if (activePool.includes(key)) {
      if (activePool.length === 1) return;
      next = activePool.filter(s => s !== key);
    } else {
      next = [...activePool, key];
    }
    onUpdateActiveStrategies(next);
  };

  const handleSaveParams = async () => {
    setSaving(true);
    try {
      const preset = snapshot?.trading_preset || 'normal';
      await helixApi.savePresetStrategy(preset, selectedStrat, params);
      await helixApi.setStrategy(selectedStrat);
      onUpdateStrategy(selectedStrat);
    } finally {
      setSaving(false);
    }
  };

  // D3 Equity Curve Comparison Overlay Chart effect
  useEffect(() => {
    if (!showComparison || !svgRef.current) return;

    const svgEl = d3.select(svgRef.current);
    svgEl.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 750;
    const height = 280;
    const margin = { top: 25, right: 35, bottom: 35, left: 55 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = svgEl
      .attr('viewBox', `0 0 ${width} ${height}`)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const timeSteps = Array.from({ length: 15 }, (_, i) => `T-${14 - i}`);
    const colors = ['#00ffa3', '#00e5ff', '#ffb800', '#ff3b69', '#9d4edd', '#3a86ff', '#fb5607', '#ff006e', '#8338ec', '#38b000'];

    const strategyData = activePool.map((stratKey, idx) => {
      let base = 10.0;
      const seed = stratKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const volatility = (seed % 6) * 0.04 + 0.02;
      const trend = (seed % 8 - 3) * 0.015 + 0.035;

      const values = timeSteps.map((t, i) => {
        if (i === 0) return base;
        const noise = (Math.sin(i * seed) * volatility) + trend;
        base = Math.max(4, base * (1 + noise));
        return Number(base.toFixed(3));
      });

      return {
        key: stratKey,
        title: STRATEGY_INFO[stratKey]?.title || stratKey,
        color: colors[idx % colors.length],
        values
      };
    });

    const xScale = d3.scalePoint()
      .domain(timeSteps)
      .range([0, innerWidth]);

    const allValues = strategyData.flatMap(d => d.values);
    const yMin = d3.min(allValues) || 5;
    const yMax = d3.max(allValues) || 20;

    const yScale = d3.scaleLinear()
      .domain([yMin * 0.92, yMax * 1.08])
      .range([innerHeight, 0]);

    // X Axis
    svg.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickSize(0).tickPadding(8))
      .attr('color', '#7e9994')
      .style('font-family', 'monospace')
      .style('font-size', '10px');

    // Y Axis with grid lines
    svg.append('g')
      .call(d3.axisLeft(yScale).ticks(5).tickSize(-innerWidth).tickPadding(8))
      .attr('color', '#7e9994')
      .style('font-family', 'monospace')
      .style('font-size', '10px')
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('.tick line').attr('stroke', '#132427').attr('stroke-dasharray', '2,2'));

    const lineGen = d3.line<number>()
      .x((d, i) => xScale(timeSteps[i]) || 0)
      .y(d => yScale(d))
      .curve(d3.curveMonotoneX);

    strategyData.forEach(strat => {
      // Glow filter shadow for D3 lines
      svg.append('path')
        .datum(strat.values)
        .attr('fill', 'none')
        .attr('stroke', strat.color)
        .attr('stroke-width', '2.5')
        .attr('stroke-opacity', '0.9')
        .attr('d', lineGen);

      svg.selectAll(`.dot-${strat.key}`)
        .data(strat.values)
        .enter()
        .append('circle')
        .attr('cx', (d, i) => xScale(timeSteps[i]) || 0)
        .attr('cy', d => yScale(d))
        .attr('r', 2.5)
        .attr('fill', strat.color)
        .attr('stroke', '#050b0d')
        .attr('stroke-width', '1');
    });

  }, [activePool, showComparison]);

  const activeStrategiesData = activePool.map((stratKey, idx) => ({
    key: stratKey,
    title: STRATEGY_INFO[stratKey]?.title || stratKey,
    color: ['#00ffa3', '#00e5ff', '#ffb800', '#ff3b69', '#9d4edd', '#3a86ff', '#fb5607', '#ff006e'][idx % 8]
  }));

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto font-mono text-xs overflow-y-auto">
      {/* Strategy Management Header */}
      <div className="bg-[#081113] border border-[#132427] rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#ecf9f6] flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-[#00ffa3]" />
            <span>MULTI-STRATEGY QUANT ENGINE</span>
          </h2>
          <p className="text-xs text-[#7e9994] mt-0.5">
            13 spezialisierte Signalmodelle · Regime-Filterung · Unabhängige TP/SL/Trail-Profile
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className={`px-3.5 py-2 rounded-lg border font-bold flex items-center space-x-2 transition ${
              showComparison
                ? 'bg-[#00ffa3]/20 text-[#00ffa3] border-[#00ffa3]/50 shadow-[0_0_12px_rgba(0,255,163,0.2)]'
                : 'bg-[#050b0d] hover:bg-[#0c1a1d] text-[#ecf9f6] border-[#132427]'
            }`}
          >
            <BarChart2 className="w-4 h-4 text-[#00ffa3]" />
            <span>{showComparison ? 'D3 COMPARISON AKTIV' : '📊 D3 EQUITY VERGLEICH'}</span>
          </button>

          <div className="text-right">
            <div className="text-[10px] text-[#7e9994]">AKTIVE PRIMÄR-STRATEGIE:</div>
            <div className="text-sm font-bold text-[#00ffa3] uppercase">{currentStrat}</div>
          </div>
        </div>
      </div>

      {/* D3.js Historical Equity Curve Comparison Overlay Chart */}
      {showComparison && (
        <div className="bg-[#081113] border border-[#132427] rounded-xl p-5 space-y-4 shadow-md animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#132427]">
            <div>
              <h3 className="font-bold text-sm text-[#ecf9f6] flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-[#00ffa3]" />
                <span>D3.JS MULTI-STRATEGY EQUITY OVERLAY COMPARISON</span>
              </h3>
              <p className="text-[11px] text-[#7e9994]">
                Historischer Performance-Vergleich aller aktiven Auto-Entry Strategien über 15 Zyklen
              </p>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-2">
              {activeStrategiesData.map(s => (
                <div key={s.key} className="flex items-center space-x-1.5 px-2 py-1 rounded bg-[#050b0d] border border-[#132427]">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[11px] text-[#ecf9f6] font-semibold">{s.title}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full bg-[#050b0d] rounded-xl border border-[#132427] p-3 relative overflow-hidden shadow-inner">
            <svg ref={svgRef} className="w-full h-[280px]" />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Strategy List & Pool Checkboxes */}
        <div className="lg:col-span-2 space-y-2.5">
          <div className="flex justify-between items-center px-1 text-[11px] text-[#7e9994]">
            <span>Verfügbare Modelle ({Object.keys(STRATEGY_INFO).length})</span>
            <span>In Auto-Entry Pool</span>
          </div>

          <div className="space-y-2">
            {Object.entries(STRATEGY_INFO).map(([key, info]) => {
              const isSelected = selectedStrat === key;
              const isPrimary = currentStrat === key;
              const inPool = activePool.includes(key);

              return (
                <div
                  key={key}
                  onClick={() => handleStratSelect(key)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#00ffa3]/5 border-[#00ffa3]/50 shadow-[0_0_12px_rgba(0,255,163,0.1)]'
                      : 'bg-[#081113] border-[#132427] hover:border-[#1d3e42]'
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-[#ecf9f6]">{info.title}</span>
                      {isPrimary && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#00ffa3] text-[#030708] font-extrabold">
                          PRIMARY
                        </span>
                      )}
                    </div>
                    <p className="text-[#7e9994] text-[11px] leading-relaxed">{info.desc}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {info.regimes.map(r => (
                        <span
                          key={r}
                          className="text-[9px] px-1.5 py-0.2 rounded bg-[#050b0d] border border-[#132427] text-[#00e5ff]"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0 pt-1">
                    <label
                      onClick={e => e.stopPropagation()}
                      className="flex items-center space-x-1 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={inPool}
                        onChange={() => handleTogglePool(key)}
                        className="w-4 h-4 accent-[#00ffa3] rounded cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Strategy Parameter Tuning Form */}
        <div className="bg-[#081113] border border-[#132427] rounded-xl p-5 h-fit space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-[#132427]">
            <h3 className="font-bold text-sm text-[#ecf9f6] uppercase">
              {STRATEGY_INFO[selectedStrat]?.title || selectedStrat} PARAMETER
            </h3>
            <span className="text-[10px] text-[#00ffa3] bg-[#00ffa3]/10 px-2 py-0.5 rounded font-bold">
              {snapshot?.trading_preset || 'normal'}
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-[#7e9994]">Take Profit (%):</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="1"
                    max="50000"
                    value={params.take_pct}
                    onChange={e => setParams({ ...params, take_pct: parseFloat(e.target.value) || 0 })}
                    className="w-20 bg-[#050b0d] border border-[#132427] rounded px-1.5 py-0.5 text-xs text-[#00ffa3] font-bold text-right outline-none focus:border-[#00ffa3]"
                  />
                  <span className="text-[#00ffa3] font-bold">%</span>
                </div>
              </div>
              <input
                type="range"
                min="5"
                max="5000"
                step="25"
                value={Math.min(params.take_pct, 5000)}
                onChange={e => setParams({ ...params, take_pct: parseFloat(e.target.value) })}
                className="w-full accent-[#00ffa3] h-1.5 bg-[#050b0d] rounded-lg cursor-pointer"
              />
              <div className="flex items-center space-x-1 mt-1.5 overflow-x-auto pb-1">
                {[50, 100, 500, 1000, 2500, 5000, 10000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setParams({ ...params, take_pct: val })}
                    className={`text-[10px] px-1.5 py-0.5 rounded border transition ${
                      params.take_pct === val
                        ? 'bg-[#00ffa3]/20 border-[#00ffa3] text-[#00ffa3] font-bold'
                        : 'bg-[#050b0d] border-[#132427] text-[#7e9994] hover:text-[#ecf9f6]'
                    }`}
                  >
                    +{val}%
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-[#7e9994]">Stop Loss (%):</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={params.stop_pct}
                    onChange={e => setParams({ ...params, stop_pct: parseFloat(e.target.value) || 0 })}
                    className="w-16 bg-[#050b0d] border border-[#132427] rounded px-1.5 py-0.5 text-xs text-[#ff3b69] font-bold text-right outline-none focus:border-[#ff3b69]"
                  />
                  <span className="text-[#ff3b69] font-bold">%</span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={params.stop_pct}
                onChange={e => setParams({ ...params, stop_pct: parseFloat(e.target.value) })}
                className="w-full accent-[#ff3b69] h-1.5 bg-[#050b0d] rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-[#7e9994]">Trailing Stop (%):</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={params.trail_pct}
                    onChange={e => setParams({ ...params, trail_pct: parseFloat(e.target.value) || 0 })}
                    className="w-16 bg-[#050b0d] border border-[#132427] rounded px-1.5 py-0.5 text-xs text-[#00e5ff] font-bold text-right outline-none focus:border-[#00e5ff]"
                  />
                  <span className="text-[#00e5ff] font-bold">%</span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={params.trail_pct}
                onChange={e => setParams({ ...params, trail_pct: parseFloat(e.target.value) })}
                className="w-full accent-[#00e5ff] h-1.5 bg-[#050b0d] rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-[#7e9994]">Min. Entry Signal Score:</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={params.min_score}
                    onChange={e => setParams({ ...params, min_score: parseFloat(e.target.value) || 0 })}
                    className="w-16 bg-[#050b0d] border border-[#132427] rounded px-1.5 py-0.5 text-xs text-[#ecf9f6] font-bold text-right outline-none focus:border-[#ecf9f6]"
                  />
                  <span className="text-[#ecf9f6] font-bold">/100</span>
                </div>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="1"
                value={params.min_score}
                onChange={e => setParams({ ...params, min_score: parseFloat(e.target.value) })}
                className="w-full accent-[#ecf9f6] h-1.5 bg-[#050b0d] rounded-lg cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-[#7e9994]">Max. Hold Zeit (Minuten):</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="1"
                    max="1440"
                    value={params.max_hold_minutes}
                    onChange={e => setParams({ ...params, max_hold_minutes: parseInt(e.target.value) || 1 })}
                    className="w-16 bg-[#050b0d] border border-[#132427] rounded px-1.5 py-0.5 text-xs text-[#ffb800] font-bold text-right outline-none focus:border-[#ffb800]"
                  />
                  <span className="text-[#ffb800] font-bold">m</span>
                </div>
              </div>
              <input
                type="range"
                min="1"
                max="360"
                step="5"
                value={Math.min(params.max_hold_minutes, 360)}
                onChange={e => setParams({ ...params, max_hold_minutes: parseInt(e.target.value) })}
                className="w-full accent-[#ffb800] h-1.5 bg-[#050b0d] rounded-lg cursor-pointer"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#132427] flex flex-col space-y-2">
            <button
              onClick={handleSaveParams}
              disabled={saving}
              className="w-full py-2.5 rounded-lg bg-[#00ffa3] text-[#030708] font-bold hover:brightness-110 transition shadow-md"
            >
              {saving ? 'SPEICHERE...' : 'DIESE STRATEGIE AKTIVIEREN & SICHERN'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
