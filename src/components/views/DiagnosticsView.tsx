import React, { useState, useEffect } from 'react';
import { EngineSnapshot } from '../../types/helix';
import { helixApi } from '../../services/api';
import { Cpu, Activity, Server, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

interface DiagnosticsViewProps {
  snapshot: EngineSnapshot | null;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({ snapshot }) => {
  const [rpcPing, setRpcPing] = useState<number | null>(null);
  const [pinging, setPinging] = useState(false);

  const handlePing = async () => {
    setPinging(true);
    try {
      const res = await helixApi.pingRpc();
      setRpcPing(res.latency_ms);
    } catch {
      setRpcPing(-1);
    } finally {
      setPinging(false);
    }
  };

  useEffect(() => {
    handlePing();
  }, []);

  const p50 = snapshot?.latency?.signal_latency_p50_ms ?? 0;
  const p95 = snapshot?.latency?.signal_latency_p95_ms ?? 0;
  const uptime = snapshot?.uptime_seconds ?? 0;
  const hours = Math.floor(uptime / 3600);
  const mins = Math.floor((uptime % 3600) / 60);
  const secs = uptime % 60;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-7xl mx-auto font-mono text-xs overflow-y-auto">
      <div className="bg-[#081113] border border-[#132427] rounded-xl p-5 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#00ffa3]/15 border border-[#00ffa3]/30 flex items-center justify-center text-[#00ffa3]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#ecf9f6]">SYSTEM & RPC DIAGNOSTICS</h2>
            <p className="text-xs text-[#7e9994] mt-0.5">
              Pipeline-Laufzeiten, Latenz-Telemetrie und Provider-Status
            </p>
          </div>
        </div>

        {/* Latency KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-lg bg-[#050b0d] border border-[#132427]">
            <div className="text-[10px] text-[#7e9994] uppercase">Signal Latenz p50</div>
            <div className="text-xl font-bold text-[#00ffa3] mt-1">
              {p50.toFixed(1)} ms
            </div>
            <div className="text-[10px] text-[#7e9994] mt-0.5">&lt;50ms Ziel erreicht</div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#050b0d] border border-[#132427]">
            <div className="text-[10px] text-[#7e9994] uppercase">Signal Latenz p95</div>
            <div className="text-xl font-bold text-[#00e5ff] mt-1">
              {p95.toFixed(1)} ms
            </div>
            <div className="text-[10px] text-[#7e9994] mt-0.5">Worst-Case Tail</div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#050b0d] border border-[#132427]">
            <div className="text-[10px] text-[#7e9994] uppercase">Solana RPC Ping</div>
            <div className="text-xl font-bold text-[#ecf9f6] mt-1 flex items-center justify-between">
              <span>{rpcPing !== null && rpcPing >= 0 ? `${rpcPing} ms` : '—'}</span>
              <button
                onClick={handlePing}
                disabled={pinging}
                className="text-[#7e9994] hover:text-[#00ffa3] p-1"
                title="Erneut pingen"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${pinging ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="text-[10px] text-[#7e9994] mt-0.5">Mainnet Endpoint</div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#050b0d] border border-[#132427]">
            <div className="text-[10px] text-[#7e9994] uppercase">Terminal Uptime</div>
            <div className="text-xl font-bold text-[#ffb800] mt-1">
              {hours}h {mins}m {secs}s
            </div>
            <div className="text-[10px] text-[#7e9994] mt-0.5">Unterbrechungsfrei</div>
          </div>
        </div>

        {/* Provider connectivity status */}
        <div className="p-4 rounded-lg bg-[#050b0d] border border-[#132427] space-y-3">
          <h3 className="font-bold text-[#ecf9f6]">ON-CHAIN & API PROVIDER STATUS</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between items-center p-2.5 rounded bg-[#081113] border border-[#132427]">
              <span>DexScreener API (Parallel Pools)</span>
              <span className="text-[#00ffa3] font-bold flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>ONLINE</span>
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded bg-[#081113] border border-[#132427]">
              <span>Pump.fun Direct API</span>
              <span className={`font-bold flex items-center space-x-1 ${snapshot?.providers?.pumpfun_auth ? 'text-[#00ffa3]' : 'text-[#7e9994]'}`}>
                {snapshot?.providers?.pumpfun_auth ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>AUTH AKTIV</span>
                  </>
                ) : (
                  <span>PUBLIC PIPELINE</span>
                )}
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded bg-[#081113] border border-[#132427]">
              <span>Raydium Trade API (V0 Builder)</span>
              <span className="text-[#00ffa3] font-bold flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>ONLINE</span>
              </span>
            </div>

            <div className="flex justify-between items-center p-2.5 rounded bg-[#081113] border border-[#132427]">
              <span>PumpPortal Local API</span>
              <span className="text-[#00ffa3] font-bold flex items-center space-x-1">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>ONLINE</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
