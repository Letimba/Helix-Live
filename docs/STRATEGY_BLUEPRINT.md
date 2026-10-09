# HELIX 5.5 Strategy Blueprint

HELIX evaluates every market candidate through a shared regime gate and a strategy-specific 0–100 signal model. The active strategy pool can run in multi-strategy mode; the engine selects the strongest qualifying setup while risk limits remain the final gate.

## Implemented strategies

| Strategy | Core idea | Typical trigger | Main exit style |
|---|---|---|---|
| Sniper | Early launch capture | New token + early liquidity/flow | Tight TP/SL/trail |
| Momentum | Acceleration capture | Positive price + volume acceleration + buy pressure | TP/trail |
| Breakout | Range expansion | Price expansion + volume + buy dominance | TP/trail |
| Trend Following | Follow established trend | Positive price trend + flow + velocity | Wide TP + trail |
| Pullback Continuation | Buy a healthy retracement | Prior trend + recovering momentum | TP/trail |
| Volatility Expansion | Trade expansion after compression | Rising volatility/volume + positive flow | TP/trail |
| Micro Scalper | Short micro-moves | Liquid market + fast flow | Tight TP/SL |
| HFT Scalper | High-velocity short setups | High transaction velocity + positive flow | Tight TP/SL |
| Runner | Preserve exceptional upside | Strong positive trend | Break-even + dynamic trailing |
| Early Entry | Early lifecycle momentum | Very young token + positive flow | TP/trail |
| Graduation | Post-launch liquidity transition | Graduated venue + liquidity/volume | TP/trail |
| Liquidity | Liquidity-first selection | Deep liquidity + volume quality | Conservative TP/trail |
| Mean Reversion | Reversal after oversold move | Negative extension + recovering acceleration | Mean-target + protection |
| Combo | Consensus | Average of several strategy signals | Configured TP/SL/trail |

## Regime gate

New entries are blocked for `PANIC`, `DEAD` and `ILLIQUID`. Each strategy also declares compatible regimes, so a strategy does not automatically trade every market condition.

```text
Market Data
    |
    v
Regime Classifier
    |
    +--> blocked regime ------> NO ENTRY
    |
    v
Strategy Scores (0–100)
    |
    v
Best qualifying setup
    |
    v
Risk limits
    |
    +--> rejected ------------> NO TRADE
    |
    v
Execution Router
```

## Data used by the strategy layer

The current models use combinations of price change, price acceleration, volume, volume acceleration, buy/sell balance, transaction velocity, liquidity, token age, venue/graduation state and the existing risk score.

Long-biased strategies include explicit positive-flow checks so high activity during a falling move does not by itself become a buy signal. Mean Reversion intentionally remains the exception because its setup starts with an oversold move and a reversal condition.

## Performance attribution

Every closed trade records its strategy and run ID. The Analytics tab aggregates:

- current-run performance
- all-time performance
- PnL
- win rate
- profit factor
- gross profit/loss
- average return
- average hold time
- fees
- execution route
- exit reason

This allows HELIX to compare which strategy is actually contributing to performance instead of relying on a single aggregate score.
