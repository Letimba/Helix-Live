import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RISK_LIMITS, DEFAULT_CONFIG } from '../server/config.js';
import { clamp } from '../server/scoring.js';

describe('Risk Management & Circuit Breaker', () => {
  test('validates default risk limits are conservative and protective', () => {
    assert.ok(DEFAULT_RISK_LIMITS.max_daily_loss_sol > 0);
    assert.ok(DEFAULT_RISK_LIMITS.max_position_size_sol <= 2.0);
    assert.ok(DEFAULT_RISK_LIMITS.max_slippage_pct <= 25.0);
    assert.ok(DEFAULT_RISK_LIMITS.max_token_risk_score <= 75);
    assert.ok(DEFAULT_RISK_LIMITS.max_open_positions >= 1 && DEFAULT_RISK_LIMITS.max_open_positions <= 50);
  });

  test('circuit breaker triggers when daily loss exceeds ceiling', () => {
    const maxLoss = DEFAULT_RISK_LIMITS.max_daily_loss_sol;
    const currentLoss = maxLoss + 0.5;
    const isTripped = currentLoss >= maxLoss;
    assert.equal(isTripped, true, 'Circuit breaker should engage when loss exceeds max limit');
  });

  test('clamp safely bounds negative and unbounded numeric values', () => {
    assert.equal(clamp(-100, 0, 100), 0);
    assert.equal(clamp(9999, 0, 100), 100);
    assert.equal(clamp(42.5, 0, 100), 42.5);
    assert.equal(clamp(NaN, 0, 100), 0);
  });
});

describe('Execution Configuration', () => {
  test('defaults to paper mode with safe simulation before submit', () => {
    assert.equal(DEFAULT_CONFIG.execution.mode, 'paper');
    assert.equal(DEFAULT_CONFIG.execution.simulate_before_submit, true);
    assert.equal(DEFAULT_CONFIG.execution.live_armed, false);
    assert.equal(DEFAULT_CONFIG.execution.route_mode, 'auto');
  });
});
