# HELIX 5.5 Architecture

HELIX is a modular Solana trading terminal built around six operational layers:

```text
Market Providers
      |
      v
Regime + Strategy Engine
      |
      v
Risk Gate
      |
      v
Execution Router
   |       |       |
 PumpPortal Raydium  (future provider slots)
   \       |       /
       Solana RPC
          |
       Mainnet
          |
          v
Position Manager -> Trade Journal -> Analytics UI
```

## Strategy layer

Implemented strategy modules include Sniper, Momentum, Breakout, Trend Following, Pullback Continuation, Volatility Expansion, Micro Scalper, HFT Scalper, Runner, Early Entry, Graduation, Liquidity, Mean Reversion and Combo consensus.

Each module produces a normalized 0–100 signal score and a regime eligibility decision. New entries are blocked in PANIC, DEAD and ILLIQUID regimes.

## Execution

`route_mode=auto` prefers Raydium Trade API execution and falls back to PumpPortal when a Raydium route cannot be built. Raydium uses quote -> transaction build -> local signing -> simulation -> Solana submission -> confirmation. The Raydium Trade API host is `https://transaction-v1.raydium.io`.

The current release does **not** claim a Jito execution provider; Jito remains a future extension point.

## Position lifecycle

```text
Signal -> Risk -> Entry -> Open Position -> Monitor -> TP/SL/Trail/Manual SELL -> Confirmation -> Journal
```

Every closed trade is persisted as JSONL in `data/helix-trades.jsonl` and linked to its run ID, strategy, route, fees, latency and exit reason.

## Analytics

The Analytics tab compares:

- current-run performance
- all-time performance
- per-strategy trades, win rate, PnL, profit factor, average return, hold time and fees
- route performance
- exit-reason distribution
- current/all-time PnL curves
- recent closed trade journal

No subscription, license or pro-tier gate is present in this release.
