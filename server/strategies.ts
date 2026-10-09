import { Coin } from './types.js';

export interface StrategySignal {
  score: number;
  eligible: boolean;
  reason: string;
  regime_ok: boolean;
}

const clamp = (x:number, lo=0, hi=100) => Math.max(lo, Math.min(hi, x));
const pct = (c:Coin) => c.buys_5m + c.sells_5m > 0 ? (c.buys_5m / (c.buys_5m + c.sells_5m))*100 : 50;
const pos = (x:number, floor=0) => Math.max(floor, x);

export const STRATEGY_REGIMES: Record<string,string[]> = {
  sniper: ['ACCELERATION','TREND','LOW_VOLATILITY','UNKNOWN'],
  momentum: ['ACCELERATION','TREND','LOW_VOLATILITY'],
  breakout: ['ACCELERATION','TREND','LOW_VOLATILITY'],
  'trend-following': ['TREND','ACCELERATION','LOW_VOLATILITY'],
  'pullback-continuation': ['TREND','ACCELERATION'],
  'volatility-expansion': ['ACCELERATION','BLOW_OFF','TREND','UNKNOWN'],
  'micro-scalper': ['ACCELERATION','TREND','LOW_VOLATILITY'],
  'hft-scalper': ['ACCELERATION','TREND'],
  runner: ['TREND','ACCELERATION','BLOW_OFF'],
  'early-entry': ['ACCELERATION','TREND','LOW_VOLATILITY','UNKNOWN'],
  graduation: ['TREND','ACCELERATION','BLOW_OFF','LOW_VOLATILITY'],
  liquidity: ['TREND','LOW_VOLATILITY','ACCELERATION'],
  'mean-reversion': ['LOW_VOLATILITY','DISTRIBUTION','UNKNOWN','TREND'],
  combo: ['TREND','ACCELERATION','LOW_VOLATILITY','UNKNOWN','BLOW_OFF','DISTRIBUTION']
};

export function regimeOK(strategy:string, regime:string): boolean {
  if (['PANIC','DEAD','ILLIQUID'].includes(regime)) return false;
  const allowed = STRATEGY_REGIMES[strategy];
  return !allowed || allowed.includes(regime);
}

export function isStrategyAllowedInRegime(strategy: string, regime: string): boolean {
  return regimeOK(strategy, regime);
}

function scoreSniper(c:Coin) {
  if (pct(c) < 50 || c.price_change_5m < 0) return 0;
  const age = c.age_seconds ?? Math.max(0,(Date.now()-c.created_at_ms)/1000);
  if (age > 90 || !c.is_new) return 0;
  return clamp(
    (age <= 30 ? 25 : 14) +
    pos(c.liquidity_usd/20000)*12 +
    pos(c.volume_5m_usd/15000)*18 +
    pos((pct(c)-50)*0.55) +
    pos(c.price_change_5m*0.9) +
    (c.risk_score < 20 ? 15 : c.risk_score < 40 ? 8 : 0)
  );
}

function scoreMomentum(c:Coin) {
  if (c.price_change_5m <= 0 || pct(c) < 50) return 0;
  return clamp(
    25 + pos(c.price_change_5m*1.8) +
    pos(c.volume_acceleration*10) +
    pos(c.price_acceleration*10) +
    pos((pct(c)-50)*0.6) +
    pos(c.transaction_velocity*2)
  );
}

function scoreBreakout(c:Coin, prev?:Coin) {
  if (c.price_change_5m < 2 || pct(c) < 50) return 0;
  const expansion = prev ? Math.max(0, c.price_change_5m - prev.price_change_5m) : Math.max(0,c.price_change_5m-4);
  return clamp(
    22 + pos((c.price_change_5m-4)*2.0) +
    pos(expansion*2.5) +
    pos((c.volume_5m_usd/10000)*12) +
    pos((pct(c)-50)*0.5) +
    (c.buys_5m > c.sells_5m*1.15 ? 12 : 0)
  );
}

function scoreTrend(c:Coin) {
  if (c.price_change_5m <= 0 || pct(c) < 50) return 0;
  return clamp(
    18 + pos(c.price_change_5m*1.4) +
    pos(c.volume_acceleration*8) +
    pos(c.transaction_velocity*1.8) +
    pos((pct(c)-50)*0.7) +
    (['TREND','ACCELERATION'].includes(c.regime) ? 20 : 0) +
    (c.liquidity_usd >= 10000 ? 8 : 0)
  );
}

function scorePullback(c:Coin, prev?:Coin) {
  const healthyTrend = prev ? prev.price_change_5m > 5 : c.price_change_5m > 5;
  const pullback = prev ? prev.price_change_5m - c.price_change_5m : Math.max(0, 8-c.price_change_5m);
  const recovering = c.price_acceleration >= 0 && pct(c) >= 47;
  if (!healthyTrend || !recovering) return 0;
  return clamp(28 + pos(pullback*2.5) + pos(c.price_change_5m*1.6) + pos((pct(c)-45)*0.7) + pos(c.volume_5m_usd/15000*12));
}

function scoreVolExpansion(c:Coin, prev?:Coin) {
  if (c.price_change_5m <= 0 || pct(c) < 50) return 0;
  const prevVol = prev?.volume_5m_usd ?? 0;
  const deltaVol = prevVol > 0 ? c.volume_5m_usd/prevVol : c.volume_acceleration;
  const range = Math.abs(c.price_change_5m);
  return clamp(15 + pos(range*2.2) + pos((deltaVol-1)*18) + pos(c.volume_acceleration*9) + pos(c.liquidity_usd/25000*10) + (range >= 8 ? 15 : 0));
}

function scoreMicro(c:Coin) {
  if (c.liquidity_usd < 5000 || c.price_change_5m <= 0 || pct(c) < 50) return 0;
  return clamp(18 + pos(c.transaction_velocity*4) + pos(Math.abs(c.price_change_5m)*1.8) + pos((pct(c)-50)*0.75) + pos(c.volume_5m_usd/8000*10) + (c.risk_score < 20 ? 12 : 0));
}

function scoreHft(c:Coin) {
  if (c.liquidity_usd < 15000 || c.price_change_5m <= 0 || pct(c) < 50) return 0;
  return clamp(16 + pos(c.transaction_velocity*6) + pos(Math.abs(c.price_change_5m)*1.5) + pos((pct(c)-50)*0.8) + pos(c.volume_acceleration*8));
}

function scoreRunner(c:Coin) {
  if (c.price_change_5m <= 0 || pct(c) < 50) return 0;
  return clamp(18 + pos(c.price_change_5m*1.5) + pos(c.volume_acceleration*8) + pos(c.liquidity_usd/20000*10) + pos((pct(c)-50)*0.65) + (['TREND','ACCELERATION','BLOW_OFF'].includes(c.regime) ? 22 : 0));
}

function scoreEarly(c:Coin) {
  if (c.price_change_5m < 0 || pct(c) < 50) return 0;
  const age = c.age_seconds ?? 9999;
  if (age > 180) return 0;
  return clamp(30 + pos(c.price_change_5m*1.2) + pos(c.volume_5m_usd/12000*12) + pos((pct(c)-50)*0.5) + (c.liquidity_usd>5000 ? 12 : 0));
}

function scoreGraduation(c:Coin) {
  if (c.price_change_5m < 0 || pct(c) < 50) return 0;
  const isGraduatedVenue = c.complete || ['raydium','pumpswap'].includes(String(c.dex||'').toLowerCase());
  if (!isGraduatedVenue) return 0;
  return clamp(28 + pos(c.liquidity_usd/25000*16) + pos(c.volume_5m_usd/18000*16) + pos(c.price_change_5m*1.2) + (pct(c)>52 ? 15 : 0));
}

function scoreLiquidity(c:Coin) {
  return clamp(20 + pos(c.liquidity_usd/50000*35) + pos(c.volume_5m_usd/30000*18) + pos((pct(c)-45)*0.5) + (c.risk_score < 20 ? 18 : c.risk_score < 40 ? 10 : 0) + (Math.abs(c.price_change_5m)<35 ? 8 : 0));
}

function scoreMeanReversion(c:Coin, prev?:Coin) {
  const oversold = c.price_change_5m <= -3 && c.price_change_5m >= -45;
  const reversal = prev ? c.price_acceleration > prev.price_acceleration : c.price_acceleration >= 0;
  const flow = pct(c);
  if (!oversold || !reversal) return 0;
  return clamp(26 + pos(Math.abs(c.price_change_5m)*1.2) + pos((flow-45)*1.2) + pos(c.liquidity_usd/15000*10) + (c.sells_5m > c.buys_5m ? 12 : 4));
}

export function strategySignal(strategy:string, c:Coin, prev?:Coin): StrategySignal {
  const s0 = strategy.toLowerCase();
  const s = s0 === 'volatility' ? 'volatility-expansion' : s0;
  const regime = c.regime || 'UNKNOWN';
  const regime_ok = regimeOK(s, regime);
  let score = 0;
  let reason = 'No qualified setup';

  switch (s) {
    case 'sniper': score=scoreSniper(c); reason='Fresh launch + early flow'; break;
    case 'momentum': score=scoreMomentum(c); reason='Price/volume acceleration'; break;
    case 'breakout': score=scoreBreakout(c,prev); reason='Range expansion + confirmation'; break;
    case 'trend-following': score=scoreTrend(c); reason='Trend strength + positive flow'; break;
    case 'pullback-continuation': score=scorePullback(c,prev); reason='Healthy pullback + recovery'; break;
    case 'volatility-expansion': score=scoreVolExpansion(c,prev); reason='Volatility/volume expansion'; break;
    case 'micro-scalper': score=scoreMicro(c); reason='Fast flow + liquid micro move'; break;
    case 'hft-scalper': score=scoreHft(c); reason='High transaction velocity'; break;
    case 'runner': score=scoreRunner(c); reason='Strong trend suitable for runner'; break;
    case 'early-entry': score=scoreEarly(c); reason='Early lifecycle momentum'; break;
    case 'graduation': score=scoreGraduation(c); reason='Post-graduation liquidity/volume'; break;
    case 'liquidity': score=scoreLiquidity(c); reason='Liquidity-first setup'; break;
    case 'mean-reversion': score=scoreMeanReversion(c,prev); reason='Oversold reversal'; break;
    case 'combo': {
      const parts = ['momentum','breakout','trend-following','pullback-continuation','volatility-expansion','liquidity','mean-reversion'].map(k=>strategySignal(k,c,prev));
      score = parts.reduce((a,b)=>a+b.score,0)/Math.max(1,parts.length);
      reason='Multi-strategy consensus';
      break;
    }
    default: score = c.opportunity_score || 0; reason='Fallback opportunity score';
  }

  if (!regime_ok) score *= 0.15;
  if (c.rug_risk_state === 'BLOCKED' || c.banned) score = 0;
  return { score: Math.round(clamp(score)*100)/100, eligible: regime_ok && score > 0, reason, regime_ok };
}

export function computeStrategyScores(c:Coin, prev?:Coin): Record<string,number> {
  const keys = Object.keys(STRATEGY_REGIMES);
  const out:Record<string,number> = {};
  for (const k of keys) out[k] = strategySignal(k,c,prev).score;
  return out;
}
