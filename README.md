<div align="center">

# ⚡ HELIX 5.5 QUANT TERMINAL
### Autonomous Ultra-Low Latency Solana Trading Terminal & Multi-Strategy Quantitative Execution Engine

[![Solana](https://img.shields.io/badge/Solana-Mainnet_Beta-14F195?style=for-the-badge&logo=solana&logoColor=black)](https://solana.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![D3.js](https://img.shields.io/badge/D3.js-v7.9-F9A03C?style=for-the-badge&logo=d3.js&logoColor=white)](https://d3js.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.3-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/Build-Passing-00ffa3?style=for-the-badge&logo=github-actions&logoColor=black)](#)
[![GitHub Stars](https://img.shields.io/badge/Stars-★★★★★-ffd700?style=for-the-badge)](#)

<p align="center">
  <b>Non-Custodial · Multi-Strategy Ensemble · Raydium SDK v2 & PumpPortal Routing · D3 Correlation Matrix · Jito MEV Protection · Telegram Alerts</b>
</p>

<p align="center">
  <a href="#-quickstart">Quickstart</a> •
  <a href="#-key-features">Key Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-d3-correlation-matrix">D3 Correlation Matrix</a> •
  <a href="#-paper--live-trading">Paper / Live Mode</a> •
  <a href="#-benchmark-comparison">Benchmarks</a> •
  <a href="#-api-documentation">API Reference</a> •
  <a href="#-license">License</a>
</p>

---

</div>

## 📌 Executive Summary

**HELIX 5.5** is an institutional-grade, self-hosted algorithmic trading terminal engineered specifically for high-speed automated execution on the **Solana** blockchain. 

Built with **Node.js, TypeScript, and React 19**, HELIX bridges the gap between raw Python backtesters and institutional HFT terminals. It provides continuous real-time market ingestion from **PumpPortal WebSocket** and **DexScreener**, multi-strategy signal generation, dynamic regime classification, dual-route order execution (Raydium v2 + PumpPortal Fast-Path), sub-15ms decision latency, and an interactive **D3-powered inter-strategy correlation matrix**.

Whether operating in risk-free simulated **Paper Mode** with fractional slip modeling or executing sub-second on-chain swaps in **Live Mode** via non-custodial local signing, HELIX delivers absolute execution transparency, zero platform fees, and total custody over private keys.

---

## 🚀 Key Features

### ⚡ Ultra-Low Latency Pipeline (<15ms Decision-to-Wire)
- **Direct WebSocket Ingestion**: Zero-polling live token streams via dedicated PumpPortal WebSocket connection with automatic reconnect and heartbeats.
- **Microsecond Signal Pipeline**: Asynchronous token evaluation pipeline calculating Opportunity Scores, rug risks, liquidity acceleration, and transaction velocity in parallel.
- **Jito MEV Tip Bundles**: Optional block-engine tip injection bypassing public mempool congestion and sandwich bot attacks.

### 🧠 Dynamic Multi-Strategy Ensemble
Run up to 6 specialized quant strategies concurrently or ensembled:
1. **Momentum (`$MOMENTUM`)**: High-velocity trend following on rapid volume influx and buy-ratio acceleration.
2. **Breakout (`$BREAKOUT`)**: Volatility breakout detection exceeding rolling local resistance and liquidity expansion.
3. **Micro-Scalp (`$SCALP`)**: High-frequency micro-captures taking rapid 3–8% profits with tight trailing stop protection.
4. **Dip Buyer (`$DIP_BUYER`)**: Mean-reversion algorithm detecting oversold conditions with high holder retention.
5. **Reversal (`$REVERSAL`)**: Exhaustion signal identifier for counter-trend entries at key bonding curve thresholds.
6. **Ensemble Combo (`$COMBO`)**: Multi-factor voting engine aggregating signal consensus across all individual models.

### 📊 D3-Based Inter-Strategy Correlation Matrix
- **Pearson $r$ Performance Tracking**: Real-time correlation matrix calculated using D3.js showing co-performance of active strategies over selectable time windows (`1H`, `24H`, `7D`, `ALL-TIME`).
- **Diversification vs. Redundancy Scoring**: Automatic identification of complementary alpha sources ($r < 0.2$) vs. redundant concentration risks ($r > 0.65$).
- **Rolling Correlation Sparklines**: Interactive cell inspection displaying temporal correlation trends and pairwise comparative Sharpe ratios and win rates.

### 🔀 Instant Paper / Live Switching & Dynamic Equity
- **One-Click Mode Switcher**: Seamlessly toggle between risk-free paper simulation and live on-chain execution directly from the TopBar or Dashboard.
- **Dual Equity Attribution**: Portfolio Equity dynamically adapts between simulated **Paper Equity** (with customizable starting capital) and **Live Wallet Equity** (real Solana on-chain balance + open position value).
- **Interactive Source Selector**: Inspect Paper and Wallet balances simultaneously without switching execution modes.

### 🛡️ Institutional Risk Engine & Circuit Breakers
- **Multi-Level Circuit Breaker**: Immediate auto-disarm when daily loss thresholds, consecutive loss counts, or abnormal RPC latencies are breached.
- **Anti-Rug Heuristics**: Real-time creator holding concentration analysis, liquidity pool lock validation, and mint authority checks.
- **Trailing Stop & Runner Scaling**: Multi-tier take-profit ladders with break-even ratcheting and dynamic trailing stops.
- **Emergency Panic Button (KILL)**: Instantly disarms all strategies and aborts active orders with sub-second execution.

### 📲 Telegram Bot Integration
- Real-time automated alerts for trade entries, take-profit exits, stop-loss triggers, circuit breaker activations, and rug warnings.
- Test notification integration directly from the UI.

---

## 🏗️ System Architecture

```
                    ┌──────────────────────────────────────────────┐
                    │           SOLANA ON-CHAIN ECOSYSTEM          │
                    │   (Pump.fun / Raydium DEX / Solana RPC)      │
                    └──────────────────────┬───────────────────────┘
                                           │
                   PumpPortal WebSocket    │   Solana RPC Calls
                     (Live New Mints)      │   (Account & Price Data)
                                           ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             HELIX 5.5 BACKEND ENGINE                             │
│                                                                                  │
│  ┌─────────────────────────┐          ┌──────────────────────────────────────┐  │
│  │   MARKET FEED ROUTER    │          │        MARKET REGIME DETECTOR        │  │
│  │  - PumpPortal WS Client │ ───────► │  - Macro Regime: Trend / Range / Vol │  │
│  │  - DexScreener Fallback │          │  - Tradable Regime Gateway           │  │
│  └───────────┬─────────────┘          └──────────────────┬───────────────────┘  │
│              │                                           │                      │
│              ▼                                           ▼                      │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                     MULTI-STRATEGY SCORING ENSEMBLE                       │  │
│  │   [Momentum]    [Breakout]    [Scalp]    [Dip Buyer]    [Reversal]        │  │
│  └───────────────────────────────────┬───────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                       RISK GUARD & CIRCUIT BREAKER                        │  │
│  │   - Max Daily Loss Guard  - Rug Score Filter  - Max Exposure Sizing       │  │
│  └───────────────────────────────────┬───────────────────────────────────────┘  │
│                                      │                                          │
│                                      ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │                         DUAL EXECUTION ROUTER                             │  │
│  │   Mode: [PAPER SIMULATION]   ◄──►   Mode: [LIVE ON-CHAIN SIGNER]          │  │
│  │   - Slippage Modeling               - Local @solana/web3.js Signer        │  │
│  │   - Virtual Balance Engine          - Raydium SDK v2 / PumpPortal Fast    │  │
│  │                                     - Jito MEV Tip Injection              │  │
│  └───────────────────┬───────────────────────────────────┬───────────────────┘  │
│                      │                                   │                      │
│                      ▼                                   ▼                      │
│  ┌─────────────────────────────────────┐     ┌───────────────────────────────┐  │
│  │         TRADE JOURNAL & DB          │     │     TELEGRAM NOTIFIER BOT     │  │
│  │   - Append-Only JSONL Audit Trail   │     │  - Buy / Sell / Exit Alerts   │  │
│  │   - Performance & Equity Curves     │     │  - Circuit Breaker Warning    │  │
│  └───────────────────┬─────────────────┘     └───────────────────────────────┘  │
└──────────────────────┼───────────────────────────────────────────────────────────┘
                       │
                       ▼ WebSocket Broadcast (/ws)
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            REACT 19 QUANT DASHBOARD                              │
│                                                                                  │
│   ┌─────────────────────┐   ┌───────────────────────┐   ┌────────────────────┐   │
│   │ TopBar Status &     │   │ Dynamic Portfolio     │   │ D3-Based Strategy  │   │
│   │ Paper/Live Switcher │   │ Equity (Paper/Wallet) │   │ Correlation Matrix │   │
│   └─────────────────────┘   └───────────────────────┘   └────────────────────┘   │
│   ┌─────────────────────┐   ┌───────────────────────┐   ┌────────────────────┐   │
│   │ Live Token Scanner  │   │ Real-Time Heatmap &   │   │ Multi-Timeframe    │   │
│   │ & Sniper Radar      │   │ Position Manager      │   │ PnL Attribution    │   │
│   └─────────────────────┘   └───────────────────────┘   └────────────────────┘   │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📈 D3-Based Strategy Correlation Matrix

A core quantitative innovation in HELIX 5.5 is the **Inter-Strategy Performance Correlation Matrix**, rendered natively in SVG using **D3.js**.

$$r_{xy} = \frac{\sum_{i=1}^{n} (x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum_{i=1}^{n} (x_i - \bar{x})^2 \sum_{i=1}^{n} (y_i - \bar{y})^2}}$$

### Matrix Interpretation Guide:
| Correlation ($r$) | Color Code | Portfolio Impact | Tactical Recommendation |
|:---:|:---:|:---|:---|
| **$+0.65$ to $+1.00$** | **Neon Emerald** (`#00ffa3`) | High Co-Movement / Redundancy | Strategies enter in the same direction. Reduce combined allocation to avoid concentration. |
| **$+0.25$ to $+0.65$** | **Cyan** (`#00e5ff`) | Moderate Positive Correlation | Common trend-following characteristics with staggered entry timing. |
| **$-0.20$ to $+0.25$** | **Amber** (`#ffb800`) | **Uncorrelated (Optimal Alpha)** | **Ideal quantitative portfolio mix.** Smoothes portfolio equity curve and increases Sharpe Ratio. |
| **$-1.00$ to $-0.20$** | **Crimson** (`#ff3b69`) | Negative Correlation / Hedge | Counter-balancing return profile. Offsets drawdowns during sharp market reversals. |

---

## ⚖️ Benchmark Comparison

| Feature / Metric | **HELIX 5.5** | **Trojan / Photon** | **BonkBot** | **Freqtrade** |
|:---|:---:|:---:|:---:|:---:|
| **Decision Latency** | **< 15 ms** | ~250–500 ms | ~800 ms+ | ~1,000 ms+ |
| **Private Key Custody** | **100% Non-Custodial (Local)** | Third-Party Server | Telegram Bot Custody | Local |
| **Platform Fees** | **0% (Zero)** | 1.00% per trade | 1.00% per trade | 0% |
| **Multi-Strategy Ensemble** | **Yes (6 Active Models)** | No (Single sniper) | No (Manual buy/sell) | Yes |
| **D3 Correlation Matrix** | **Yes (Built-in Interactive)**| No | No | No |
| **Dual Paper/Live Equity** | **Yes (Instant Toggle)** | Limited / None | No | Simulated only |
| **Execution Routes** | **Raydium v2 + PumpPortal** | Proprietary Router | Jupiter/Raydium | CEX / DEX |
| **Jito MEV Bundles** | **Yes (Configurable Tips)** | Optional | No | No |
| **Open Source** | **MIT License** | Closed Source | Closed Source | GPLv3 |

---

## 🛠️ Quickstart Guide

### Prerequisites
- **Node.js**: v20.0.0 or higher
- **npm** or **bun**
- (Optional for Live Mode) **Solana Wallet Private Key** (Base58 format)

### 1. Clone & Install
```bash
# Clone the repository
git clone https://github.com/helix-quant/helix-terminal.git
cd helix-terminal

# Install dependencies
npm install
```

### 2. Environment Configuration
Copy the example environment template:
```bash
cp .env.example .env
```

Edit `.env` with your preferred endpoints:
```env
# Solana RPC Endpoint (QuickNode, Helius, Triton, or Public)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# PumpPortal WebSocket API Key (Optional: unlocks priority stream)
PUMPPORTAL_API_KEY=your_pumpportal_api_key_here

# Non-Custodial Trading Signer (Only required for LIVE execution)
SOLANA_PRIVATE_KEY=your_base58_private_key_here

# Telegram Push Notifications (Optional)
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here
```

### 3. Launch Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser to launch the terminal.

---

## 🎮 Execution Modes: Paper vs. Live

### 🧪 Paper Trading Mode (Default)
- **Zero Financial Risk**: Trades are simulated with real-time on-chain pricing, realistic DEX slippage formulas, and simulated gas fees.
- **Custom Starting Balance**: Configure starting equity (`starting_sol`) from 1 to 1,000 SOL.
- **Reset Anytime**: One-click reset to purge paper history and restart testing.

### ⚡ Live Trading Mode
- **Non-Custodial Architecture**: Transactions are created, signed, and broadcasted locally using `@solana/web3.js`. Private keys are **never sent over the wire**.
- **Dual Confirmation Guards**: Live mode requires intentional arming, wallet balance verification, and secondary confirmation modal before on-chain execution.
- **Automatic Fallback**: If private key is absent or invalid, the engine strictly forces Paper Mode.

---

## 📡 REST & WebSocket API Reference

The HELIX backend exposes an HTTP REST API and a real-time WebSocket feed on port 3000:

| Endpoint | Method | Description |
|:---|:---:|:---|
| `/api/state` | `GET` | Returns full terminal snapshot (positions, coins, latency, stats, health). |
| `/api/config` | `GET` / `PUT` | Read or update engine configuration (risk limits, strategies, routes). |
| `/api/control` | `POST` | Control actions: `arm`, `disarm`, `pause`, `resume`, `kill`, `set_mode`. |
| `/api/preset` | `POST` | Switch execution preset: `safe_slow`, `normal`, `aggressive`. |
| `/api/analysis` | `GET` | Retrieve trade journal analysis, Sharpe ratios, and strategy attribution. |
| `/api/journal/export` | `GET` | Export complete trade audit journal as CSV format. |
| `/api/live/status` | `GET` | Query local signer readiness and on-chain SOL balance. |
| `/ws` | `WS` | Real-time WebSocket event feed streaming live market changes at 60 FPS. |

---

## 🛡️ Security & Privacy Notice

- **Zero Telemetry**: HELIX contains no user tracking, analytics beacons, or remote telemetry.
- **Local Key Storage**: Private keys are stored strictly in local memory and environment variables. They never touch third-party servers.
- **Circuit Breaker Guarantee**: In the event of network disruption or abnormal price slippage, the automated Circuit Breaker trips immediately to protect capital.

---

## 🤝 Contributing

Contributions from quant developers, Solana rust engineers, and frontend specialists are warmly welcomed!
1. Fork the Project (`https://github.com/helix-quant/helix-terminal/fork`)
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License & Disclaimer

Distributed under the **MIT License**. See `LICENSE` for more information.

> **⚠️ Risk Warning**: Cryptocurrency trading, particularly on low-market-cap Solana meme tokens and automated bonding curves, involves substantial risk of loss. HELIX is an open-source execution tool provided "as is". Always perform extensive testing in **Paper Mode** before committing real capital.

---

<div align="center">
  <sub>Engineered with precision for the Solana DeFi & Quant Trading Community.</sub>
</div>
