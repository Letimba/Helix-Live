import React from 'react';
import { EngineSnapshot } from '../types/helix';
import {
  LayoutDashboard,
  Radar,
  Grid,
  Crosshair,
  Sliders,
  Briefcase,
  ListOrdered,
  BarChart3,
  FlaskConical,
  ShieldCheck,
  Wallet,
  Send,
  Settings,
  Cpu,
  ChevronLeft,
  ChevronRight,
  X,
  Sun,
  Moon
} from 'lucide-react';

export type TabId =
  | 'dashboard'
  | 'scanner'
  | 'heatmap'
  | 'sniper'
  | 'strategies'
  | 'positions'
  | 'activity'
  | 'analytics'
  | 'backtest'
  | 'risk'
  | 'wallet'
  | 'telegram'
  | 'settings'
  | 'diagnostics';

interface SidebarProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  snapshot: EngineSnapshot | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

const NAV_ITEMS: Array<{ id: TabId; label: string; icon: React.ElementType; badge?: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'scanner', label: 'Scanner', icon: Radar },
  { id: 'heatmap', label: 'Heatmap', icon: Grid },
  { id: 'sniper', label: 'Sniper', icon: Crosshair, badge: 'HOT' },
  { id: 'strategies', label: 'Strategies', icon: Sliders },
  { id: 'positions', label: 'Positions', icon: Briefcase },
  { id: 'activity', label: 'Activity', icon: ListOrdered },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'backtest', label: 'Backtest', icon: FlaskConical },
  { id: 'risk', label: 'Risk Gate', icon: ShieldCheck },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'telegram', label: 'Telegram Alert', icon: Send },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'diagnostics', label: 'System', icon: Cpu }
];

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  snapshot,
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile,
  theme = 'dark',
  onToggleTheme
}) => {
  const regime = snapshot?.market_regime?.macro_regime || 'UNKNOWN';
  const tradable = snapshot?.market_regime?.tradable_regime ?? true;
  const cb = snapshot?.circuit_breaker;
  const openPosCount = snapshot?.positions?.filter(p => p && p.status === 'OPEN').length ?? 0;

  const getRegimeColor = (r: string) => {
    switch (r) {
      case 'ACCELERATION': return 'text-[#00ffa3] bg-[#00ffa3]/15 border-[#00ffa3]/30';
      case 'TREND': return 'text-[#00e5ff] bg-[#00e5ff]/15 border-[#00e5ff]/30';
      case 'BLOW_OFF': return 'text-[#ffb800] bg-[#ffb800]/15 border-[#ffb800]/30';
      case 'PANIC': return 'text-[#ff3b69] bg-[#ff3b69]/20 border-[#ff3b69]/40';
      case 'DEAD': return 'text-[#7e9994] bg-[#7e9994]/15 border-[#7e9994]/30';
      case 'ILLIQUID': return 'text-[#ff3b69] bg-[#ff3b69]/15 border-[#ff3b69]/30';
      default: return 'text-[#7e9994] bg-[#7e9994]/10 border-[#132427]';
    }
  };

  const renderNavContent = (isMobile = false) => (
    <>
      {/* Brand Header */}
      <div className="h-14 px-3 flex items-center justify-between border-b border-[#132427]">
        <div className="flex items-center space-x-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00ffa3] to-[#00a86b] flex items-center justify-center font-mono font-extrabold text-[#030708] text-base shadow-[0_0_12px_rgba(0,255,163,0.3)] shrink-0">
            H
          </div>
          {(!collapsed || isMobile) && (
            <div className="truncate">
              <div className="font-extrabold text-sm tracking-wider text-[#ecf9f6] flex items-center space-x-1">
                <span>HELIX</span>
                <span className="text-[10px] text-[#00ffa3] font-mono bg-[#00ffa3]/10 px-1 rounded">5.5</span>
              </div>
              <div className="text-[10px] font-mono text-[#7e9994] tracking-tight truncate">SOLANA SPEED ENGINE</div>
            </div>
          )}
        </div>
        {isMobile ? (
          <button
            onClick={onCloseMobile}
            className="text-[#7e9994] hover:text-[#ecf9f6] p-1.5 rounded hover:bg-[#081113] transition"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={onToggleCollapse}
            className="text-[#7e9994] hover:text-[#ecf9f6] p-1 rounded hover:bg-[#081113] transition"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Market Regime Card */}
      {(!collapsed || isMobile) ? (
        <div className="p-3 mx-2 my-2 rounded-lg bg-[#081113] border border-[#132427]">
          <div className="text-[10px] uppercase font-mono text-[#7e9994] tracking-wider mb-1">
            Market Regime
          </div>
          <div className={`px-2 py-1 rounded text-xs font-mono font-bold border inline-block ${getRegimeColor(regime)}`}>
            {regime}
          </div>
          <div className="mt-1.5 text-[11px] flex items-center justify-between font-mono">
            <span className={tradable ? 'text-[#00ffa3]' : 'text-[#ff3b69]'}>
              {tradable ? '● Entries open' : '⛔ Blocked'}
            </span>
            {cb?.active && (
              <span className="text-[10px] text-[#ff3b69] font-bold">CIRCUIT ON</span>
            )}
          </div>
        </div>
      ) : (
        <div className="py-2 flex justify-center border-b border-[#132427]">
          <span
            className={`w-3 h-3 rounded-full ${
              tradable ? 'bg-[#00ffa3] shadow-[0_0_8px_#00ffa3]' : 'bg-[#ff3b69]'
            }`}
            title={`Regime: ${regime} (${tradable ? 'Trading active' : 'Suspended'})`}
          />
        </div>
      )}

      {/* Navigation list */}
      <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto scrollbar-none">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                if (isMobile && onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center space-x-2.5 px-2.5 py-2.5 sm:py-2 rounded-md text-xs font-medium transition ${
                active
                  ? 'bg-[#00ffa3]/15 text-[#00ffa3] border border-[#00ffa3]/30 font-semibold'
                  : 'text-[#7e9994] hover:text-[#ecf9f6] hover:bg-[#081113]'
              } ${collapsed && !isMobile ? 'justify-center px-0' : ''}`}
              title={item.label}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#00ffa3]' : ''}`} />
              {(!collapsed || isMobile) && (
                <div className="flex-1 flex items-center justify-between text-left truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#ff3b69]/20 text-[#ff3b69] font-bold border border-[#ff3b69]/30">
                      {item.badge}
                    </span>
                  ) : item.id === 'positions' && openPosCount > 0 ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#00ffa3]/20 text-[#00ffa3] font-bold">
                      {openPosCount}
                    </span>
                  ) : null}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick stats bottom */}
      {(!collapsed || isMobile) && (
        <div className="p-3 border-t border-[#132427] bg-[#050b0d] text-[11px] font-mono text-[#7e9994]">
          <div className="flex justify-between items-center mb-1">
            <span>Positions</span>
            <span className="text-[#ecf9f6] font-semibold">{openPosCount} active</span>
          </div>
          <div className="flex justify-between items-center">
            <span>Cash</span>
            <span className="text-[#00ffa3] font-semibold">
              {(snapshot?.stats?.cash_sol ?? 10).toFixed(2)} SOL
            </span>
          </div>

          {/* Theme switch inside mobile drawer */}
          {isMobile && onToggleTheme && (
            <div className="mt-3 pt-2.5 border-t border-[#132427] flex items-center justify-between">
              <span className="text-[#7e9994]">Modus:</span>
              <button
                onClick={onToggleTheme}
                className={`px-2.5 py-1 rounded border text-[11px] font-semibold flex items-center space-x-1.5 transition ${
                  theme === 'light'
                    ? 'bg-[#00ffa3]/20 border-[#00ffa3]/50 text-[#00ffa3]'
                    : 'bg-[#081113] border-[#132427] text-[#ecf9f6]'
                }`}
              >
                {theme === 'light' ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-[#ffb800]" />
                    <span>HELL-MODUS</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-[#00e5ff]" />
                    <span>DUNKEL-MODUS</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex border-r border-[#132427] bg-[#050b0d] flex-col transition-all duration-200 select-none shrink-0 ${
          collapsed ? 'w-16' : 'w-56'
        }`}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
          />

          {/* Slide-in drawer */}
          <div className="relative w-64 max-w-[80vw] bg-[#050b0d] border-r border-[#132427] h-full flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderNavContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
