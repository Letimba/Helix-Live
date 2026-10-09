import React, { useState, useEffect } from 'react';
import { helixApi } from '../../services/api';
import { X, ShieldAlert, Zap, AlertTriangle, CheckCircle, ExternalLink, Loader2 } from 'lucide-react';

interface LiveArmModalProps {
  onClose: () => void;
  onArmed: () => void;
}

export const LiveArmModal: React.FC<LiveArmModalProps> = ({ onClose, onArmed }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [agreeTerms, setAgreeTerms] = useState<boolean>(false);
  const [arming, setArming] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    helixApi
      .getLiveStatus()
      .then(res => setLiveStatus(res))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleArmLive = async () => {
    if (!agreeTerms) return;
    setArming(true);
    setError(null);
    try {
      if (!liveStatus?.ready) {
        throw new Error(
          'SOLANA_PRIVATE_KEY fehlt in der Umgebung (.env). Setze deinen 64-Byte Base58 Key lokal ein, um LIVE zu aktivieren.'
        );
      }
      await helixApi.control('set_mode', 'live');
      onArmed();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Aktivierung fehlgeschlagen');
    } finally {
      setArming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="bg-[#081113] border border-[#ff3b69]/40 w-full max-w-lg rounded-xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#7e9994] hover:text-[#ecf9f6] transition p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 rounded-xl bg-[#ff3b69]/15 border border-[#ff3b69]/40 flex items-center justify-center text-[#ff3b69]">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-[#ecf9f6] flex items-center space-x-2">
              <span>ECHTGELD LIVE-TRADING</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#ff3b69]/20 text-[#ff3b69] border border-[#ff3b69]/30">
                MAINNET
              </span>
            </h2>
            <p className="text-xs font-mono text-[#7e9994]">
              Lokale Signierung · Raydium V0 Transaktionen · PumpPortal Fallback
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-7 h-7 text-[#00ffa3] animate-spin" />
            <span className="text-xs font-mono text-[#7e9994]">Prüfe Signer-Status & Solana RPC...</span>
          </div>
        ) : (
          <div className="space-y-4 text-xs font-mono">
            {/* Wallet Signer Info Card */}
            <div className="p-4 rounded-lg bg-[#050b0d] border border-[#132427] space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[#7e9994]">Lokaler Signer Status:</span>
                <span className={`font-bold flex items-center space-x-1 ${liveStatus?.ready ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}`}>
                  {liveStatus?.ready ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>SCHLÜSSEL GELADEN</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>KEIN KEY IN .ENV</span>
                    </>
                  )}
                </span>
              </div>
              {liveStatus?.ready ? (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-[#7e9994]">Signer Public Key:</span>
                    <span className="text-[#ecf9f6] font-semibold">
                      {liveStatus.public_key?.slice(0, 6)}...{liveStatus.public_key?.slice(-6)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#7e9994]">SOL Guthaben:</span>
                    <span className="text-[#00ffa3] font-bold text-sm">
                      {(liveStatus.balance_sol || 0).toFixed(4)} SOL
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-[#7e9994] pt-2 border-t border-[#132427]">
                  Trage <code className="text-[#00ffa3]">SOLANA_PRIVATE_KEY</code> in deine lokale{' '}
                  <code className="text-[#00ffa3]">.env</code> Datei ein. Der private Schlüssel verlässt
                  niemals deinen lokalen Serverprozess.
                </div>
              )}
            </div>

            {/* Risk Warnings */}
            <div className="p-3.5 rounded-lg bg-[#ff3b69]/10 border border-[#ff3b69]/30 text-[#ecf9f6] space-y-1.5 text-[11px]">
              <div className="font-bold text-[#ff3b69] flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>WICHTIGE SICHERHEITSHINWEISE</span>
              </div>
              <p className="text-[#7e9994] leading-relaxed">
                • HELIX führt Transaktionen mit echten SOL auf dem Solana Mainnet aus.<br />
                • Memecoins sind hochvolatil. Slippage und MEV-Sandwich-Risiken können auftreten.<br />
                • Die automatische Circuit-Breaker-Sicherung greift bei Überschreitung des Tagesverlustlimits.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-[#ff3b69]/20 border border-[#ff3b69] text-[#ff3b69] font-bold text-xs">
                {error}
              </div>
            )}

            {/* Terms checkbox */}
            <label className="flex items-start space-x-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={e => setAgreeTerms(e.target.checked)}
                className="mt-0.5 accent-[#ff3b69] w-4 h-4 rounded cursor-pointer"
              />
              <span className="text-[11px] text-[#7e9994] leading-snug">
                Ich bestätige, dass ich die Risiken verstehe und HELIX auf eigenes Risiko für Live-Handel autorisiere.
              </span>
            </label>

            {/* Actions */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg bg-[#050b0d] hover:bg-[#0c1a1d] border border-[#132427] text-[#7e9994] font-bold transition"
              >
                ABBRECHEN
              </button>
              <button
                type="button"
                disabled={!agreeTerms || arming}
                onClick={handleArmLive}
                className={`flex-1 py-2.5 rounded-lg font-bold flex items-center justify-center space-x-2 transition ${
                  agreeTerms && !arming
                    ? 'bg-gradient-to-r from-[#ff3b69] to-[#d92550] text-white hover:brightness-110 shadow-[0_0_15px_rgba(255,59,105,0.4)]'
                    : 'bg-[#132427] text-[#7e9994] cursor-not-allowed'
                }`}
              >
                {arming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>JETZT LIVE SCHARFSCHALTEN</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
