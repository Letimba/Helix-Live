import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { classifyCoinRegime, computeOpportunityScore, evaluateRugRisk } from '../server/scoring.js';
import { computeStrategyScores, isStrategyAllowedInRegime } from '../server/strategies.js';
import { Coin } from '../server/types.js';

function createMockCoin(overrides: Partial<Coin> = {}): Coin {
  return {
    mint: 'TestMint111111111111111111111111111111111111',
    name: 'Test Token',
    symbol: 'TEST',
    creator: 'TestCreator1111111111111111111111111111111',
    image_uri: '',
    created_at_ms: Date.now() - 30_000, // 30s old
    last_trade_at_ms: Date.now() - 1_000,
    complete: false,
    banned: false,
    venue: 'pump.fun',
    pool_address: '',
    price_usd: 0.0045,
    price_sol: 0.00003,
    market_cap_usd: 45_000,
    liquidity_usd: 18_000,
    volume_5m_usd: 12_000,
    buys_5m: 85,
    sells_5m: 25,
    price_change_5m: 14.5,
    virtual_sol_reserves: 30,
    virtual_token_reserves: 1_000_000_000,
    real_sol_reserves: 15,
    token_total_supply: 1_000_000_000,
    is_new: false,
    risk_score: 18,
    risk_level: 'LOW',
    signal_score: 72,
    strategy_agreement: 8,
    strategy_scores: {},
    source: 'pump.fun',
    observed_at_ms: Date.now(),
    quote_source: 'pump.fun',
    volatility_rank: 65,
    opportunity_score: 78,
    opportunity_breakdown: {},
    rug_risk_state: 'SAFE',
    rug_reasons: [],
    regime: 'ACCELERATION',
    chain: 'solana',
    dex: 'pump.fun',
    transaction_velocity: 22,
    volume_acceleration: 1.8,
    price_acceleration: 1.4,
    liquidity_acceleration: 1.2,
    top_holder_concentration: 14,
    creator_holding_pct: 3.5,
    age_seconds: 30,
    ...overrides
  };
}

describe('Market Regime Classifier', () => {
  test('detects ILLIQUID when liquidity is below threshold for established token', () => {
    const coin = createMockCoin({ liquidity_usd: 500, is_new: false });
    const regime = classifyCoinRegime(coin);
    assert.equal(regime, 'ILLIQUID');
  });

  test('detects PANIC when heavy sell pressure and price crash occur', () => {
    const coin = createMockCoin({
      price_change_5m: -35,
      buys_5m: 5,
      sells_5m: 60,
      liquidity_usd: 10_000
    });
    const regime = classifyCoinRegime(coin);
    assert.equal(regime, 'PANIC');
  });

  test('detects ACCELERATION during high velocity and strong buying', () => {
    const coin = createMockCoin({
      price_change_5m: 25,
      volume_acceleration: 2.5,
      transaction_velocity: 35,
      buys_5m: 120,
      sells_5m: 30,
      volume_5m_usd: 8000
    });
    const regime = classifyCoinRegime(coin);
    assert.equal(regime, 'ACCELERATION');
  });

  test('detects DEAD tokens with no trades and zero 5m volume', () => {
    const coin = createMockCoin({
      volume_5m_usd: 50,
      buys_5m: 0,
      sells_5m: 0,
      price_change_5m: 0.1,
      transaction_velocity: 0,
      created_at_ms: Date.now() - 3_600_000 // 1 hour old
    });
    const regime = classifyCoinRegime(coin);
    assert.equal(regime, 'DEAD');
  });
});

describe('11-Factor Opportunity & Rug Risk Scoring', () => {
  test('opportunity score produces composite between 0 and 100 without NaN', () => {
    const coin = createMockCoin();
    const breakdown = computeOpportunityScore(coin);
    assert.ok(breakdown.composite >= 0 && breakdown.composite <= 100, `Score ${breakdown.composite} out of bounds`);
    assert.ok(!Number.isNaN(breakdown.composite), 'Score cannot be NaN');
  });

  test('handles zero edge-cases without division by zero', () => {
    const zeroCoin = createMockCoin({
      liquidity_usd: 0,
      real_sol_reserves: 0,
      volume_5m_usd: 0,
      buys_5m: 0,
      sells_5m: 0,
      price_usd: 0,
      market_cap_usd: 0,
      transaction_velocity: 0,
      volume_acceleration: 0,
      price_acceleration: 0,
      top_holder_concentration: 0,
      creator_holding_pct: 0
    });
    const breakdown = computeOpportunityScore(zeroCoin);
    assert.ok(breakdown.composite >= 0 && breakdown.composite <= 100);
    assert.ok(!Number.isNaN(breakdown.composite));
  });

  test('flags severe rug risk when creator holds massive token percentage', () => {
    const rugCoin = createMockCoin({
      creator_holding_pct: 65,
      top_holder_concentration: 85,
      liquidity_usd: 500,
      is_new: false
    });
    const { risk_score, reasons, risk_state } = evaluateRugRisk(rugCoin);
    assert.ok(risk_score >= 60, `High risk expected for creator dump risk, got ${risk_score}`);
    assert.ok(reasons.length > 0, 'Must have at least one rug warning reason');
    assert.equal(risk_state, 'BLOCKED');
  });
});

describe('Multi-Strategy Signal Engine', () => {
  test('computes scores for all 13 strategies plus combo', () => {
    const coin = createMockCoin();
    const scores = computeStrategyScores(coin);
    const expectedStrategies = [
      'sniper', 'momentum', 'breakout', 'trend-following',
      'pullback-continuation', 'volatility-expansion', 'micro-scalper',
      'hft-scalper', 'runner', 'early-entry', 'graduation',
      'liquidity', 'mean-reversion', 'combo'
    ];
    for (const strat of expectedStrategies) {
      assert.ok(typeof scores[strat] === 'number', `Missing score for ${strat}`);
      assert.ok(scores[strat] >= 0 && scores[strat] <= 100, `${strat} score ${scores[strat]} not in 0..100`);
    }
  });

  test('regime gating blocks new entries in PANIC, DEAD, and ILLIQUID', () => {
    assert.equal(isStrategyAllowedInRegime('momentum', 'PANIC'), false);
    assert.equal(isStrategyAllowedInRegime('sniper', 'DEAD'), false);
    assert.equal(isStrategyAllowedInRegime('trend-following', 'ILLIQUID'), false);
    assert.equal(isStrategyAllowedInRegime('momentum', 'ACCELERATION'), true);
  });
});
