import React, { useState } from 'react';
import { EngineSnapshot, AppConfig } from '../../types/helix';
import { Settings, RefreshCw, Zap, Sliders, CheckCircle, Sun, Moon, Palette } from 'lucide-react';
import { helixApi } from '../../services/api';
import { playTradeSound } from '../../utils/sound';

interface SettingsViewProps {
  snapshot: EngineSnapshot | null;
  onUpdateConfig: (cfg: Partial<AppConfig>) => void;
  onPresetChange: (preset: 'safe_slow' | 'normal' | 'aggressive') => void;
  onResetPaper: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  snapshot,
  onUpdateConfig,
  onPresetChange,
  onResetPaper,
  theme = 'dark',
  onToggleTheme
}) => {
  const cfg = snapshot?.config;
  const currentPreset = snapshot?.trading_preset || 'normal';
  const autoTrade = snapshot?.config?.auto_trade ?? true;

  const [pollSecs, setPollSecs] = useState<number>(cfg?.poll_seconds ?? 1.5);
  const [startingSol, setStartingSol] = useState<number>(cfg?.starting_sol ?? 10.0);
  const [slippage, setSlippage] = useState<number>(cfg?.execution?.max_slippage_pct ?? 1.0);
  const [saving, setSaving] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  const [keyStatusMsg, setKeyStatusMsg] = useState<string | null>(null);
  const [pumpPortalKeyInput, setPumpPortalKeyInput] = useState(cfg?.pumpportal_api_key || '');
  const [savingPumpPortalKey, setSavingPumpPortalKey] = useState(false);

  const handleSavePumpPortalKey = async () => {
    setSavingPumpPortalKey(true);
    try {
      await onUpdateConfig({ pumpportal_api_key: pumpPortalKeyInput.trim() });
      playTradeSound('buy');
    } finally {
      setSavingPumpPortalKey(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateConfig({
        poll_seconds: pollSecs,
        starting_sol: startingSol,
        execution: {
          mode: cfg?.execution?.mode || 'paper',
          live_armed: Boolean(cfg?.execution?.live_armed),
          active_route: cfg?.execution?.active_route || 'auto',
          solana_rpc_url: cfg?.execution?.solana_rpc_url || 'https://api.mainnet-beta.solana.com',
          jito_block_engine_url: cfg?.execution?.jito_block_engine_url || '',
          jito_tip_sol: cfg?.execution?.jito_tip_sol || 0.001,
          priority_fee_micro_lamports: cfg?.execution?.priority_fee_micro_lamports || 100000,
          priority_fee_sol: cfg?.execution?.priority_fee_sol || 0.0005,
          pumpportal_local_url: cfg?.execution?.pumpportal_local_url || '',
          bnb_rpc_url: cfg?.execution?.bnb_rpc_url || '',
          pancakeswap_router_address: cfg?.execution?.pancakeswap_router_address || '',
          raydium_trade_api_url: cfg?.execution?.raydium_trade_api_url || '',
          route_mode: cfg?.execution?.route_mode || 'auto',
          paper_raydium_fee_pct: cfg?.execution?.paper_raydium_fee_pct || 0.25,
          max_slippage_pct: slippage,
          simulate_before_submit: cfg?.execution?.simulate_before_submit ?? true
        },
        risk_limits: {
          max_daily_loss_sol: cfg?.risk_limits?.max_daily_loss_sol ?? 10.0,
          max_position_size_sol: cfg?.risk_limits?.max_position_size_sol ?? 1.0,
          max_portfolio_risk_pct: cfg?.risk_limits?.max_portfolio_risk_pct ?? 80.0,
          max_open_positions: cfg?.risk_limits?.max_open_positions ?? 15,
          max_slippage_pct: slippage,
          max_consecutive_losses: cfg?.risk_limits?.max_consecutive_losses ?? 15,
          max_token_risk_score: cfg?.risk_limits?.max_token_risk_score ?? 65.0,
          max_liquidity_drop_pct: cfg?.risk_limits?.max_liquidity_drop_pct ?? 30.0,
          max_rpc_latency_ms: cfg?.risk_limits?.max_rpc_latency_ms ?? 800.0,
          max_execution_latency_ms: cfg?.risk_limits?.max_execution_latency_ms ?? 2500.0
        }
      });
      playTradeSound('buy');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrivateKey = async () => {
    if (!privateKeyInput.trim()) return;
    setSavingKey(true);
    setKeyStatusMsg(null);
    try {
      const res = await helixApi.setPrivateKey(privateKeyInput.trim());
      if (res.ok) {
        setKeyStatusMsg(`Erfolgreich! Wallet: ${res.address} (Bereit: ${res.ready ? 'Ja' : 'Nein'})`);
        setPrivateKeyInput('');
        playTradeSound('buy');
      }
    } catch (err: any) {
      setKeyStatusMsg(`Fehler: ${err?.message || err}`);
      playTradeSound('kill');
    } finally {
      setSavingKey(false);
    }
  };

  const handleReset = () => {
    if (confirm('ACHTUNG: Paper-Trading Verlauf, offene Positionen und Cash zurücksetzen?')) {
      playTradeSound('kill');
      onResetPaper();
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto font-mono text-xs overflow-y-auto">
      <div className="bg-[#081113] border border-[#132427] rounded-xl p-5 shadow-sm space-y-5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#00ffa3]/15 border border-[#00ffa3]/30 flex items-center justify-center text-[#00ffa3]">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#ecf9f6]">SYSTEMKONFIGURATION & PROFILE</h2>
            <p className="text-xs text-[#7e9994] mt-0.5">
              Geschwindigkeit, Ausführungsprofile und Systemparameter
            </p>
          </div>
        </div>

        {/* Farbschema & Theme (Hell-Modus / Dunkel-Modus) */}
        {onToggleTheme && (
          <div className="p-4 rounded-lg bg-[#050b0d] border border-[#132427] space-y-3">
            <h3 className="font-bold text-[#ecf9f6] flex items-center space-x-1.5">
              <Palette className="w-4 h-4 text-[#00ffa3]" />
              <span>FARBSCHEMA & DESIGN (HELL / DUNKEL)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={theme === 'dark' ? onToggleTheme : undefined}
                className={`p-3.5 rounded-lg border text-left transition ${
                  theme === 'light'
                    ? 'bg-[#00ffa3]/15 border-[#00ffa3] text-[#ecf9f6] shadow-sm'
                    : 'bg-[#081113] border-[#132427] text-[#7e9994] hover:text-[#ecf9f6]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sun className="w-4 h-4 text-[#ffb800]" />
                    <span className="font-bold text-sm text-[#ecf9f6]">HELL-MODUS (LIGHT)</span>
                  </div>
                  {theme === 'light' && (
                    <span className="text-[10px] bg-[#00ffa3] text-[#030708] font-bold px-1.5 py-0.5 rounded">
                      AKTIV
                    </span>
                  )}
                </div>
                <div className="text-[11px] mt-1 text-[#7e9994]">
                  Hoher Kontrast, weißer Hintergrund mit Smaragd-Akzenten. Ideal für helle Büros und Tageslicht.
                </div>
              </button>

              <button
                type="button"
                onClick={theme === 'light' ? onToggleTheme : undefined}
                className={`p-3.5 rounded-lg border text-left transition ${
                  theme === 'dark'
                    ? 'bg-[#00ffa3]/15 border-[#00ffa3] text-[#ecf9f6] shadow-sm'
                    : 'bg-[#081113] border-[#132427] text-[#7e9994] hover:text-[#ecf9f6]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Moon className="w-4 h-4 text-[#00e5ff]" />
                    <span className="font-bold text-sm text-[#ecf9f6]">DUNKEL-MODUS (DARK)</span>
                  </div>
                  {theme === 'dark' && (
                    <span className="text-[10px] bg-[#00ffa3] text-[#030708] font-bold px-1.5 py-0.5 rounded">
                      AKTIV
                    </span>
                  )}
                </div>
                <div className="text-[11px] mt-1 text-[#7e9994]">
                  Augenschonendes OLED-Schwarz (#030708) mit Neon-Akzenten für High-Speed Nacht-Trading.
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Preset Selector */}
        <div className="p-4 rounded-lg bg-[#050b0d] border border-[#132427] space-y-3">
          <h3 className="font-bold text-[#ecf9f6] flex items-center space-x-1.5">
            <Sliders className="w-4 h-4 text-[#00ffa3]" />
            <span>EXECUTION PROFILE (PRESETS)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => onPresetChange('safe_slow')}
              className={`p-3.5 rounded-lg border text-left transition ${
                currentPreset === 'safe_slow'
                  ? 'bg-[#00e5ff]/15 border-[#00e5ff] text-[#ecf9f6]'
                  : 'bg-[#081113] border-[#132427] text-[#7e9994] hover:text-[#ecf9f6]'
              }`}
            >
              <div className="font-bold text-sm text-[#00e5ff]">SICHER & LANGSAM</div>
              <div className="text-[11px] mt-1 text-[#7e9994]">
                Höhere Score-Grenzwerte (70+), engere Stop-Losses, maximale Verifikation vor Order.
              </div>
            </button>

            <button
              onClick={() => onPresetChange('normal')}
              className={`p-3.5 rounded-lg border text-left transition ${
                currentPreset === 'normal'
                  ? 'bg-[#00ffa3]/15 border-[#00ffa3] text-[#ecf9f6]'
                  : 'bg-[#081113] border-[#132427] text-[#7e9994] hover:text-[#ecf9f6]'
              }`}
            >
              <div className="font-bold text-sm text-[#00ffa3]">NORMAL (STANDARD)</div>
              <div className="text-[11px] mt-1 text-[#7e9994]">
                Ausgewogenes Verhältnis aus Schnelligkeit, Trendfolge und Risikofilterung.
              </div>
            </button>

            <button
              onClick={() => onPresetChange('aggressive')}
              className={`p-3.5 rounded-lg border text-left transition ${
                currentPreset === 'aggressive'
                  ? 'bg-[#ffb800]/15 border-[#ffb800] text-[#ecf9f6]'
                  : 'bg-[#081113] border-[#132427] text-[#7e9994] hover:text-[#ecf9f6]'
              }`}
            >
              <div className="font-bold text-sm text-[#ffb800]">AGGRESSIV / HFT</div>
              <div className="text-[11px] mt-1 text-[#7e9994]">
                Frühste Einstiege (Score 55+), erweiterte Trailing-Zonen für 10x-Runner.
              </div>
            </button>
          </div>
        </div>

        {/* Engine Tuning */}
        <div className="p-4 rounded-lg bg-[#050b0d] border border-[#132427] space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-[#132427]">
            <span className="font-bold text-[#ecf9f6]">Automatischer Handel (Auto-Trade)</span>
            <button
              onClick={() => helixApi.control('toggle_autotrade')}
              className={`px-3 py-1.5 rounded font-bold transition ${
                autoTrade
                  ? 'bg-[#00ffa3]/20 text-[#00ffa3] border border-[#00ffa3]/40'
                  : 'bg-[#ff3b69]/20 text-[#ff3b69] border border-[#ff3b69]/40'
              }`}
            >
              {autoTrade ? '● AKTIV' : '○ DEAKTIVIERT'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] text-[#7e9994] block mb-1">
                Marktdaten Polling-Intervall ({pollSecs}s)
              </label>
              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.5"
                value={pollSecs}
                onChange={e => setPollSecs(parseFloat(e.target.value))}
                className="w-full accent-[#00ffa3] h-1.5 bg-[#081113] rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#7e9994] block mb-1">
                Slippage-Toleranz ({slippage.toFixed(1)}%)
              </label>
              <input
                type="range"
                min="0.1"
                max="5.0"
                step="0.1"
                value={slippage}
                onChange={e => setSlippage(parseFloat(e.target.value))}
                className="w-full accent-[#00ffa3] h-1.5 bg-[#081113] rounded cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[10px] text-[#7e9994] block mb-1">
                Startkapital Paper-Modus (SOL)
              </label>
              <input
                type="number"
                value={startingSol}
                onChange={e => setStartingSol(parseFloat(e.target.value) || 10)}
                className="w-full bg-[#081113] border border-[#132427] rounded px-3 py-1.5 text-xs text-[#ecf9f6] outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-2.5 rounded bg-[#00ffa3] text-[#030708] font-bold hover:brightness-110 transition"
          >
            {saving ? 'SPEICHERE...' : 'KONFIGURATION SPEICHERN'}
          </button>
        </div>

        {/* Solana Live Wallet / Private Key Configuration */}
        <div className="p-4 rounded-lg bg-[#050b0d] border border-[#00ffa3]/30 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-[#ecf9f6] flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-[#00ffa3]" />
                <span>SOLANA_PRIVATE_KEY KONFIGURATION</span>
              </h3>
              <p className="text-[11px] text-[#7e9994] mt-0.5">
                Basis58 Schlüssel oder Byte-Array ([12,34,...]) für echte Live-Ausführung auf Solana.
              </p>
            </div>
            <div>
              {snapshot?.live_signer?.ready ? (
                <span className="text-[10px] bg-[#00ffa3]/20 text-[#00ffa3] border border-[#00ffa3]/40 px-2 py-1 rounded font-bold">
                  ● BEREIT ({snapshot.live_signer.public_key?.slice(0, 4)}...{snapshot.live_signer.public_key?.slice(-4)})
                </span>
              ) : (
                <span className="text-[10px] bg-[#ff3b69]/20 text-[#ff3b69] border border-[#ff3b69]/40 px-2 py-1 rounded font-bold">
                  ○ NICHT KONFIGURIERT
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="password"
              placeholder="SOLANA_PRIVATE_KEY=DeinBase58SchlüsselOderByteArray"
              value={privateKeyInput}
              onChange={e => setPrivateKeyInput(e.target.value)}
              className="w-full bg-[#081113] border border-[#132427] rounded px-3 py-2 text-xs text-[#ecf9f6] outline-none focus:border-[#00ffa3]"
            />
            <button
              onClick={handleSavePrivateKey}
              disabled={savingKey || !privateKeyInput.trim()}
              className="w-full py-2 rounded bg-[#00ffa3]/20 hover:bg-[#00ffa3]/30 text-[#00ffa3] border border-[#00ffa3]/40 font-bold transition disabled:opacity-50"
            >
              {savingKey ? 'VALIDIERE & SPEICHERE SCHLÜSSEL...' : 'SOLANA_PRIVATE_KEY SPEICHERN & AKTIVIEREN'}
            </button>
            {keyStatusMsg && (
              <div className={`text-[11px] p-2 rounded ${keyStatusMsg.includes('Erfolgreich') ? 'bg-[#00ffa3]/10 text-[#00ffa3]' : 'bg-[#ff3b69]/10 text-[#ff3b69]'}`}>
                {keyStatusMsg}
              </div>
            )}
          </div>
        </div>

        {/* PumpPortal WebSocket API Key (Secrets Integration) */}
        <div className="p-4 rounded-lg bg-[#050b0d] border border-[#00e5ff]/30 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-bold text-[#ecf9f6] flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-[#00e5ff]" />
                <span>PUMPPORTAL WEBSOCKET API KEY (SECRETS)</span>
              </h3>
              <p className="text-[11px] text-[#7e9994] mt-0.5">
                Verbindung zu wss://pumpportal.fun/api/data?api-key=... für Live-Token-Stream & High-Speed Snipping.
              </p>
            </div>
            <div>
              {cfg?.pumpportal_api_key ? (
                <span className="text-[10px] bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/40 px-2 py-1 rounded font-bold">
                  ● AKTIV
                </span>
              ) : (
                <span className="text-[10px] bg-[#7e9994]/20 text-[#7e9994] border border-[#7e9994]/40 px-2 py-1 rounded font-bold">
                  ○ STANDARD (ÖFFENTLICH)
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <input
              type="password"
              placeholder="Dein PumpPortal API-Key (z.B. abc123xyz...)"
              value={pumpPortalKeyInput}
              onChange={e => setPumpPortalKeyInput(e.target.value)}
              className="w-full bg-[#081113] border border-[#132427] rounded px-3 py-2 text-xs text-[#ecf9f6] outline-none focus:border-[#00e5ff]"
            />
            <button
              onClick={handleSavePumpPortalKey}
              disabled={savingPumpPortalKey}
              className="w-full py-2 rounded bg-[#00e5ff]/20 hover:bg-[#00e5ff]/30 text-[#00e5ff] border border-[#00e5ff]/40 font-bold transition"
            >
              {savingPumpPortalKey ? 'SPEICHERE API-KEY...' : 'PUMPPORTAL API-KEY IN SECRETS SPEICHERN'}
            </button>
          </div>
        </div>

        {/* Paper reset */}
        <div className="p-4 rounded-lg bg-[#050b0d] border border-[#ff3b69]/30 flex justify-between items-center">
          <div>
            <div className="font-bold text-[#ff3b69]">PAPER-TRADING ZURÜCKSETZEN</div>
            <div className="text-[11px] text-[#7e9994] mt-0.5">
              Löscht alle virtuellen Trades und setzt das Startkapital auf {startingSol} SOL zurück.
            </div>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded bg-[#ff3b69]/15 hover:bg-[#ff3b69]/30 text-[#ff3b69] border border-[#ff3b69]/40 font-bold transition"
          >
            RESET
          </button>
        </div>
      </div>
    </div>
  );
};
