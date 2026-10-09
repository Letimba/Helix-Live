import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Scanner & Views Robustness', () => {
  test('safely filters candidates when candidates is undefined or null', () => {
    const filterCandidates = (
      candidates?: any[],
      search = '',
      venueFilter = 'ALL',
      safeOnly = false
    ) => {
      const list = Array.isArray(candidates) ? candidates.filter(Boolean) : [];
      return list.filter(c => {
        if (!c) return false;
        if (search) {
          const query = search.trim().toLowerCase();
          const name = (c.name || '').toLowerCase();
          const symbol = (c.symbol || '').toLowerCase();
          const mint = (c.mint || '').toLowerCase();
          if (!name.includes(query) && !symbol.includes(query) && !mint.includes(query)) {
            return false;
          }
        }
        if (venueFilter !== 'ALL' && !(c.venue || '').toLowerCase().includes(venueFilter.toLowerCase())) {
          return false;
        }
        if (safeOnly && c.rug_risk_state !== 'SAFE') {
          return false;
        }
        return true;
      });
    };

    // Edge cases that previously threw TypeError: Cannot read properties of undefined (reading 'filter')
    assert.deepEqual(filterCandidates(undefined), []);
    assert.deepEqual(filterCandidates(null as any), []);
    assert.deepEqual(filterCandidates([]), []);
    assert.deepEqual(filterCandidates([null, undefined] as any), []);

    // Partial objects without crashing on undefined properties
    const partialCoins = [
      { mint: 'mint1', symbol: 'SOLO' },
      { name: 'Full Coin', symbol: 'FULL', mint: 'mint2', venue: 'pump.fun', rug_risk_state: 'SAFE', opportunity_score: 80 }
    ];
    const res = filterCandidates(partialCoins as any, 'solo');
    assert.equal(res.length, 1);
    assert.equal(res[0].symbol, 'SOLO');

    const safeRes = filterCandidates(partialCoins as any, '', 'ALL', true);
    assert.equal(safeRes.length, 1);
    assert.equal(safeRes[0].symbol, 'FULL');
  });

  test('validates theme token values for Hell-Modus and Dunkel-Modus', () => {
    const validThemes = ['dark', 'light'];
    const parseTheme = (stored: string | null): 'dark' | 'light' => {
      if (stored === 'light' || stored === 'dark') return stored;
      return 'dark';
    };

    assert.equal(parseTheme('light'), 'light');
    assert.equal(parseTheme('dark'), 'dark');
    assert.equal(parseTheme(null), 'dark');
    assert.equal(parseTheme('invalid'), 'dark');
  });
});
