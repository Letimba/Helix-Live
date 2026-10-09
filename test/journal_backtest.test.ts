import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { TradeJournal } from '../server/journal.js';
import { runBacktest } from '../server/backtest.js';

describe('Trade Journal & Analytics Attribution', () => {
  const testJournalPath = path.resolve(process.cwd(), 'data/test-journal.jsonl');

  test('records trade fills and aggregates current-run & all-time metrics', () => {
    // Clean up if exists
    if (fs.existsSync(testJournalPath)) fs.unlinkSync(testJournalPath);

    const journal = new TradeJournal('test_run_1', testJournalPath, ['momentum', 'sniper']);
    assert.equal(journal.getTrades().length, 0);

    // Record win trade
    journal.record({
      symbol: 'WINNER',
      mint: 'MintWinner1111111111111111111111111111111',
      entry_sol: 0.25,
      pnl_sol: 0.05,
      return_pct: 20.0,
      exit_reason: 'TAKE_PROFIT',
      mode: 'paper',
      buy_route: 'raydium',
      strategy: 'momentum'
    });

    // Record loss trade
    journal.record({
      symbol: 'LOSER',
      mint: 'MintLoser11111111111111111111111111111111',
      entry_sol: 0.2,
      pnl_sol: -0.02,
      return_pct: -10.0,
      exit_reason: 'STOP_LOSS',
      mode: 'paper',
      buy_route: 'pumpportal',
      strategy: 'sniper'
    });

    const analysis = journal.analyze();
    assert.equal(analysis.current_run.summary.trades, 2);
    assert.equal(analysis.current_run.summary.wins, 1);
    assert.equal(analysis.current_run.summary.losses, 1);
    assert.equal(analysis.current_run.summary.win_rate_pct, 50);
    assert.ok(analysis.current_run.summary.net_pnl_sol > 0, 'Net PnL should be positive (0.05 - 0.02 = 0.03)');

    // Verify per-strategy attribution
    assert.ok(analysis.by_strategy['momentum']);
    assert.equal(analysis.by_strategy['momentum'].current_run.wins, 1);
    assert.ok(analysis.by_strategy['sniper']);
    assert.equal(analysis.by_strategy['sniper'].current_run.losses, 1);

    // Clean up
    if (fs.existsSync(testJournalPath)) fs.unlinkSync(testJournalPath);
  });
});

describe('Monte Carlo Backtest Engine', () => {
  test('executes backtest with realistic trade metrics and parameters', () => {
    const result = runBacktest('momentum', { stop_pct: 10, take_pct: 30, trail_pct: 8 }, 0.1, 10.0);

    assert.ok(result.total_trades > 0, 'Should have executed trades');
    assert.ok(typeof result.win_rate_pct === 'number');
    assert.ok(result.win_rate_pct >= 0 && result.win_rate_pct <= 100);
    assert.ok(typeof result.net_pnl_sol === 'number');
    assert.ok(result.equity_curve.length > 0);
  });
});
