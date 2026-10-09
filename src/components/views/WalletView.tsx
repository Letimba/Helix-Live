import React, { useState, useEffect } from 'react';
import { helixApi } from '../../services/api';
import { Wallet, CheckCircle, AlertTriangle, ExternalLink, Copy, Key, ShieldCheck, Loader2 } from 'lucide-react';

export const WalletView: React.FC = () => {
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [verifyAddr, setVerifyAddr] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);

  useEffect(() => {
    helixApi
      .getLiveStatus()
      .then(res => setLiveStatus(res))
      .catch(err => console.error('Failed to get wallet status:', err))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = async () => {
    if (!verifyAddr) return;
    try {
      const res = await helixApi.verifyWallet(verifyAddr);
      setVerifyResult(res);
    } catch (e: any) {
      setVerifyResult({ valid: false, error: e?.message });
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto font-mono text-xs overflow-y-auto">
      {/* Wallet Overview */}
      <div className="bg-[#081113] border border-[#132427] rounded-xl p-5 shadow-sm">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#00ffa3]/15 border border-[#00ffa3]/30 flex items-center justify-center text-[#00ffa3]">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#ecf9f6]">
              SOLANA WALLET & LOCAL SIGNER MANAGER
            </h2>
            <p className="text-xs text-[#7e9994] mt-0.5">
              Non-custodial Architektur · Keine Schlüsselübermittlung an Externe
            </p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center items-center space-x-2 text-[#7e9994]">
            <Loader2 className="w-5 h-5 animate-spin text-[#00ffa3]" />
            <span>Lade Signer-Status...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[#050b0d] border border-[#132427] space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[#7e9994]">Lokaler Server Signer:</span>
                <span
                  className={`font-bold flex items-center space-x-1.5 ${
                    liveStatus?.ready ? 'text-[#00ffa3]' : 'text-[#ff3b69]'
                  }`}
                >
                  {liveStatus?.ready ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>BEREIT FÜR LIVE-TRADING</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      <span>NICHT KONFIGURIERT (PAPER-MODUS AKTIV)</span>
                    </>
                  )}
                </span>
              </div>

              {liveStatus?.ready ? (
                <>
                  <div className="flex justify-between items-center pt-2 border-t border-[#132427]">
                    <span className="text-[#7e9994]">Signer Adresse:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-[#ecf9f6] font-bold">
                        {liveStatus.public_key}
                      </span>
                      <button
                        onClick={() => handleCopy(liveStatus.public_key)}
                        className="p-1 rounded bg-[#081113] hover:text-[#00ffa3] text-[#7e9994]"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <a
                        href={`https://solscan.io/account/${liveStatus.public_key}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded bg-[#081113] hover:text-[#00ffa3] text-[#7e9994]"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-[#132427]">
                    <span className="text-[#7e9994]">On-Chain Guthaben:</span>
                    <span className="text-[#00ffa3] font-bold text-sm">
                      {(liveStatus.balance_sol || 0).toFixed(4)} SOL
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-[#7e9994] pt-2 border-t border-[#132427] leading-relaxed">
                  Trage deinen privaten Solana-Schlüssel in der lokalen Datei <code className="text-[#00ffa3]">.env</code> ein:<br />
                  <code className="text-[#00ffa3] mt-1 block p-2 bg-[#081113] rounded border border-[#132427]">
                    SOLANA_PRIVATE_KEY=DeinBase58SchlüsselOderByteArray
                  </code>
                </div>
              )}
            </div>

            {/* Address format validator */}
            <div className="p-4 rounded-lg bg-[#050b0d] border border-[#132427] space-y-3">
              <h3 className="font-bold text-[#ecf9f6] flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-[#00e5ff]" />
                <span>SOLANA ADRESS-VALIDATOR</span>
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Base58 Solana Adresse prüfen..."
                  value={verifyAddr}
                  onChange={e => setVerifyAddr(e.target.value)}
                  className="flex-1 bg-[#081113] border border-[#132427] rounded px-3 py-2 text-xs text-[#ecf9f6] outline-none focus:border-[#00ffa3]"
                />
                <button
                  onClick={handleVerify}
                  className="px-4 py-2 bg-[#081113] hover:bg-[#0c1a1d] border border-[#132427] text-[#ecf9f6] font-bold rounded"
                >
                  PRÜFEN
                </button>
              </div>
              {verifyResult && (
                <div
                  className={`p-2.5 rounded text-xs ${
                    verifyResult.valid
                      ? 'bg-[#00ffa3]/15 text-[#00ffa3] border border-[#00ffa3]/30'
                      : 'bg-[#ff3b69]/15 text-[#ff3b69] border border-[#ff3b69]/30'
                  }`}
                >
                  {verifyResult.valid
                    ? 'Gültige Solana Base58 Adresse.'
                    : `Ungültig: ${verifyResult.error || 'Ungültiges Format'}`}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
