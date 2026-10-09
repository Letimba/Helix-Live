import React, { useState } from 'react';
import { EngineSnapshot, AppConfig } from '../../types/helix';
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle, Sliders } from 'lucide-react';
import { helixApi } from '../../services/api';

interface RiskViewProps {
  snapshot: EngineSnapshot | null;
  onUpdateConfig: (cfg: Partial<AppConfig>) => void;
}

export const RiskView: React.FC<RiskViewProps> = ({ snapshot, onUpdateConfig }) => {
  const limits = snapshot?.config?.risk_limits;
  const cb = snapshot?.circuit_breaker;

  const [maxDailyLoss, setMaxDailyLoss] = useState(limits?.max_daily_loss_sol ?? 10);
  const [maxPositionSize, setMaxPositionSize] = useState(limits?.max_position_size_sol ?? 1.0);
  const [maxOpenPositions, setMaxOpenPositions] = useState(limits?.max_open_positions ?? 15);
  const [maxSlippage, setMaxSlippage] = useState(limits?.max_slippage_pct ?? 2.5);
  const [maxTokenRisk, setMaxTokenRisk] = useState(limits?.max_token_risk_score ?? 65);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateConfig({
        risk_limits: {
          ...(limits as any),
          max_daily_loss_sol: maxDailyLoss,
          max_position_size_sol: maxPositionSize,
          max_open_positions: maxOpenPositions,
          max_slippage_pct: maxSlippage,
          max_token_risk_score: maxTokenRisk
        }
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto font-mono text-xs overflow-y-auto">
      {/* Circuit Breaker Status Banner */}
      <div className={`p-5 rounded-xl border ${cb?.active ? 'bg-[#ff3b69]/15 border-[#ff3b69]' : 'bg-[#081113] border-[#132427]'}`}>
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cb?.active ? 'bg-[#ff3b69]/20 text-[#ff3b69]' : 'bg-[#00ffa3]/15 text-[#00ffa3]'}`}>
            {cb?.active ? <ShieldAlert className="w-5 h-5 animate-pulse" /> : <ShieldCheck className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-base font-bold text-[#ecf9f6]">
              CIRCUIT BREAKER RISK PROTECTION
            </h2>
            <p className="text-xs text-[#7e9994] mt-0.5">
              Status:{' '}
              <span className={`font-bold ${cb?.active ? 'text-[#ff3b69]' : 'text-[#00ffa3]'}`}>
                {cb?.active ? `AUSGELÖST: ${cb.reason}` : 'INAKTIV (Normale Handelsüberwachung)'}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Risk Limits Form */}
      <div className="bg-[#081113] border border-[#132427] rounded-xl p-5 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-[#132427]">
          <h3 className="font-bold text-sm text-[#ecf9f6] flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-[#00ffa3]" />
            <span>PORTFOLIO SCHUTZGRENZEN</span>
          </h3>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-1.5 rounded-lg bg-[#00ffa3] text-[#030708] font-bold hover:brightness-110 transition"
          >
            {saving ? 'SPEICHERE...' : 'SICHERN'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3 bg-[#050b0d] rounded-lg border border-[#132427]">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#7e9994]">Max. Tagesverlust (SOL):</span>
              <span className="text-[#ff3b69] font-bold">{maxDailyLoss} SOL</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={maxDailyLoss}
              onChange={e => setMaxDailyLoss(parseFloat(e.target.value))}
              className="w-full accent-[#ff3b69] h-1.5 bg-[#081113] rounded cursor-pointer"
            />
            <span className="text-[10px] text-[#4b635f] mt-1 block">
              Automatischer Stop aller Käufe bei Erreichen des Tageslimits.
            </span>
          </div>

          <div className="p-3 bg-[#050b0d] rounded-lg border border-[#132427]">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#7e9994]">Max. Positionsgröße (SOL):</span>
              <span className="text-[#00ffa3] font-bold">{maxPositionSize} SOL</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="5"
              step="0.05"
              value={maxPositionSize}
              onChange={e => setMaxPositionSize(parseFloat(e.target.value))}
              className="w-full accent-[#00ffa3] h-1.5 bg-[#081113] rounded cursor-pointer"
            />
            <span className="text-[10px] text-[#4b635f] mt-1 block">
              Maximale Allokation für einen einzelnen Token-Kauf.
            </span>
          </div>

          <div className="p-3 bg-[#050b0d] rounded-lg border border-[#132427]">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#7e9994]">Max. Parallele Positionen:</span>
              <span className="text-[#00e5ff] font-bold">{maxOpenPositions}</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              step="1"
              value={maxOpenPositions}
              onChange={e => setMaxOpenPositions(parseInt(e.target.value))}
              className="w-full accent-[#00e5ff] h-1.5 bg-[#081113] rounded cursor-pointer"
            />
            <span className="text-[10px] text-[#4b635f] mt-1 block">
              Verhindert Überinvestition in memecoin-spezifische Klumpenrisiken.
            </span>
          </div>

          <div className="p-3 bg-[#050b0d] rounded-lg border border-[#132427]">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#7e9994]">Max. Slippage Toleranz (%):</span>
              <span className="text-[#ffb800] font-bold">{maxSlippage}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="15"
              step="0.5"
              value={maxSlippage}
              onChange={e => setMaxSlippage(parseFloat(e.target.value))}
              className="w-full accent-[#ffb800] h-1.5 bg-[#081113] rounded cursor-pointer"
            />
            <span className="text-[10px] text-[#4b635f] mt-1 block">
              Verwirft Orders wenn Slippage das Limit übersteigt.
            </span>
          </div>

          <div className="p-3 bg-[#050b0d] rounded-lg border border-[#132427] sm:col-span-2">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-[#7e9994]">Max. Erlaubter Token-Risikoscore (0-100):</span>
              <span className="text-[#ecf9f6] font-bold">{maxTokenRisk}/100</span>
            </div>
            <input
              type="range"
              min="30"
              max="85"
              step="1"
              value={maxTokenRisk}
              onChange={e => setMaxTokenRisk(parseInt(e.target.value))}
              className="w-full accent-[#ecf9f6] h-1.5 bg-[#081113] rounded cursor-pointer"
            />
            <span className="text-[10px] text-[#4b635f] mt-1 block">
              Tokens mit höherem Rug-Risk-Score werden vor Eintritt automatisch gefiltert.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
