import React from 'react';
import { EngineSnapshot } from '../types/helix';
import { playTradeSound } from '../utils/sound';
import {
  Activity,
  ShieldAlert,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Play,
  Pause,
  Zap,
  Power,
  Wallet,
  Menu
} from 'lucide-react';

interface TopBarProps {
  snapshot: EngineSnapshot | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenLiveModal: () => void;
  onOpenWalletModal: () => void;
  onControl: (action: any, mode?: string) => void;
  soundOn: boolean;
  onToggleSound: () => void;
  wsConnected: boolean;
  onToggleMobileMenu?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  snapshot,
  theme,
  onToggleTheme,
  onOpenLiveModal,
  onOpenWalletModal,
  onControl,
  soundOn,
  onToggleSound,
  wsConnected,
  onToggleMobileMenu
}) => {
  const p50 = snapshot?.latency?.signal_latency_p50_ms ?? 0;
  const isLive = snapshot?.mode === 'live';
  const isArmed = snapshot?.armed ?? false;
  const isPaused = snapshot?.paused ?? false;
  const isPanic = snapshot?.panic ?? false;
  const preset = snapshot?.trading_preset ?? 'normal';

  const handleKill = () => {
    if (confirm('ACHTUNG: Emergency KILL auslösen? Alle automatischen Trades stoppen sofort.')) {
      playTradeSound('kill');
      onControl('kill');
    }
  };

  return (
    <header className="h-14 border-b border-[#132427] bg-[#050b0d] px-2 sm:px-4 flex items-center justify-between text-xs select-none shrink-0 z-30">
      {/* Left status cluster */}
      <div className="flex items-center space-x-1.5 sm:space-x-2.5 overflow-x-auto py-1 scrollbar-none">
        {/* Mobile menu trigger */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded bg-[#081113] border border-[#132427] text-[#ecf9f6] hover:text-[#00ffa3] transition shrink-0"
            title="Hauptmenü öffnen"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {/* Live feed status */}
        <div
          className={`flex items-center space-x-1.5 px-2 py-1 rounded font-mono font-medium shrink-0 ${
            wsConnected
              ? 'bg-[#00ffa3]/10 text-[#00ffa3] border border-[#00ffa3]/25'
              : 'bg-[#ff3b69]/10 text-[#ff3b69] border border-[#ff3b69]/25'
          }`}
          title={wsConnected ? 'WebSocket Live-Stream aktiv' : 'Offline / Reconnecting'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              wsConnected ? 'bg-[#00ffa3] animate-pulse-live' : 'bg-[#ff3b69]'
            }`}
          />
          <span className="hidden sm:inline">
            {wsConnected ? 'LIVE FEED' : 'RECONNECTING'}
          </span>
          <span className="text-[10px] text-[#7e9994] font-normal hidden xs:inline">
            ({snapshot?.feed_quality || 'connecting'})
          </span>
        </div>

        {/* Execution Mode */}
        <div
          className={`px-2 py-1 rounded font-mono font-semibold flex items-center space-x-1 cursor-pointer transition shrink-0 ${
            isLive
              ? 'bg-[#ff3b69]/20 text-[#ff3b69] border border-[#ff3b69]/50 animate-pulse'
              : 'bg-[#00e5ff]/10 text-[#00e5ff] border border-[#00e5ff]/30'
          }`}
          onClick={isLive ? () => onControl('set_mode', 'paper') : onOpenLiveModal}
          title="Klicken zum Umschalten zwischen PAPER und LIVE"
        >
          {isLive ? <Zap className="w-3 h-3" /> : null}
          <span>{isLive ? '⚡ LIVE' : snapshot?.mode === 'dry_run' ? 'DRY-RUN' : 'PAPER'}</span>
        </div>

        {/* Armed status */}
        <button
          onClick={() => onControl('arm')}
          className={`px-2 py-1 rounded font-mono font-semibold border transition shrink-0 ${
            isArmed
              ? 'bg-[#00ffa3]/15 text-[#00ffa3] border-[#00ffa3]/30 hover:bg-[#00ffa3]/25'
              : 'bg-[#ff3b69]/10 text-[#ff3b69] border-[#ff3b69]/30 hover:bg-[#ff3b69]/20'
          }`}
        >
          {isArmed ? '● ARMED' : '○ DISARMED'}
        </button>

        {/* Preset indicator */}
        <div className="hidden lg:flex items-center space-x-1 px-2.5 py-1 rounded bg-[#081113] border border-[#132427] font-mono text-[#7e9994] shrink-0">
          <span>PRESET:</span>
          <span
            className={`font-semibold ${
              preset === 'safe_slow'
                ? 'text-[#00e5ff]'
                : preset === 'aggressive'
                ? 'text-[#ffb800]'
                : 'text-[#00ffa3]'
            }`}
          >
            {preset.toUpperCase()}
          </span>
        </div>

        {/* Signal Latency */}
        <div
          className="hidden xl:flex items-center space-x-1 px-2 py-1 rounded bg-[#081113] border border-[#132427] font-mono shrink-0"
          title="Signal Latency p50"
        >
          <Activity className="w-3.5 h-3.5 text-[#7e9994]" />
          <span
            className={`font-semibold ${
              p50 < 60 ? 'text-[#00ffa3]' : p50 < 200 ? 'text-[#ffb800]' : 'text-[#ff3b69]'
            }`}
          >
            {p50.toFixed(0)}ms
          </span>
        </div>

        {/* Emergency Kill Notice */}
        {isPanic && (
          <div className="flex items-center space-x-1 px-2 py-1 bg-[#ff3b69]/20 text-[#ff3b69] border border-[#ff3b69] rounded font-bold animate-pulse shrink-0">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">CIRCUIT BREAKER</span>
          </div>
        )}
      </div>

      {/* Right Action buttons */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0 ml-1">
        {/* 1-Click Live Trading button */}
        {!isLive ? (
          <button
            onClick={onOpenLiveModal}
            className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded bg-gradient-to-r from-[#00ffa3]/20 to-[#00ffa3]/30 hover:from-[#00ffa3]/30 hover:to-[#00ffa3]/40 border border-[#00ffa3]/50 text-[#00ffa3] font-mono font-bold tracking-wider transition shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-[#00ffa3]" />
            <span className="text-[11px]">1-CLICK LIVE</span>
          </button>
        ) : (
          <button
            onClick={() => onControl('set_mode', 'paper')}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded bg-[#ffb800]/20 hover:bg-[#ffb800]/30 border border-[#ffb800]/50 text-[#ffb800] font-mono font-bold transition text-[11px]"
          >
            <span>PAPER</span>
          </button>
        )}

        {/* Wallet status */}
        <div className="flex items-center space-x-1 bg-[#081113] hover:bg-[#0c1a1d] border border-[#132427] rounded px-2 py-1 transition shadow-sm">
          <button
            onClick={onOpenWalletModal}
            className="flex items-center space-x-1.5 text-[#ecf9f6] font-mono"
            title="Wallet Status & Guthaben"
          >
            <Wallet className="w-3.5 h-3.5 text-[#00ffa3]" />
            <span className="font-semibold">
              {snapshot?.live_signer?.ready && snapshot?.live_signer?.public_key
                ? `${(snapshot.live_signer.balance_sol || 0).toFixed(2)} SOL`
                : 'WALLET'}
            </span>
          </button>
          {snapshot?.live_signer?.ready && snapshot?.live_signer?.public_key && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(snapshot.live_signer!.public_key!);
                alert('Wallet-Adresse in Zwischenablage kopiert!');
              }}
              className="p-1 rounded text-[#7e9994] hover:text-[#00ffa3] transition"
              title="Wallet-Adresse kopieren"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            </button>
          )}
        </div>

        {/* Audio Toggle */}
        <button
          onClick={onToggleSound}
          className="p-1.5 sm:p-2 rounded bg-[#081113] hover:bg-[#0c1a1d] border border-[#132427] text-[#7e9994] hover:text-[#ecf9f6] transition"
          title={soundOn ? 'Ton ausschalten' : 'Ton einschalten'}
        >
          {soundOn ? <Volume2 className="w-3.5 h-3.5 text-[#00ffa3]" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* Theme Toggle (Hell/Dunkel Modus) */}
        <button
          onClick={onToggleTheme}
          className={`flex items-center space-x-1 px-2 py-1.5 rounded border font-mono font-semibold transition ${
            theme === 'light'
              ? 'bg-[#00ffa3]/20 border-[#00ffa3]/50 text-[#00ffa3]'
              : 'bg-[#081113] hover:bg-[#0c1a1d] border-[#132427] text-[#ecf9f6]'
          }`}
          title={theme === 'dark' ? 'Hell-Modus aktivieren' : 'Dunkel-Modus aktivieren'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-[#ffb800]" />
              <span className="hidden sm:inline text-[10px]">HELL</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span className="hidden sm:inline text-[10px]">DUNKEL</span>
            </>
          )}
        </button>

        {/* Pause/Resume */}
        <button
          onClick={() => onControl(isPaused ? 'resume' : 'pause')}
          className={`p-1.5 sm:p-2 rounded border transition ${
            isPaused
              ? 'bg-[#ffb800]/20 text-[#ffb800] border-[#ffb800]/40'
              : 'bg-[#081113] hover:bg-[#0c1a1d] text-[#ecf9f6] border-[#132427]'
          }`}
          title={isPaused ? 'Fortsetzen' : 'Pausieren'}
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>

        {/* Emergency Kill */}
        <button
          onClick={handleKill}
          className="flex items-center space-x-1 px-2 sm:px-2.5 py-1.5 rounded bg-[#ff3b69]/15 hover:bg-[#ff3b69]/30 border border-[#ff3b69]/40 text-[#ff3b69] font-mono font-bold transition"
          title="Notfall-Stop"
        >
          <Power className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[11px]">KILL</span>
        </button>
      </div>
    </header>
  );
};
