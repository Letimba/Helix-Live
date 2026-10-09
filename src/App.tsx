import React, { useState, useEffect, useRef } from 'react';
import { EngineSnapshot, Coin, AppConfig } from './types/helix';
import { helixApi } from './services/api';
import { isSoundEnabled, setSoundEnabled, playTradeSound } from './utils/sound';
import { TopBar } from './components/TopBar';
import { Sidebar, TabId } from './components/Sidebar';
import { DashboardView } from './components/views/DashboardView';
import { ScannerView } from './components/views/ScannerView';
import { HeatmapView } from './components/views/HeatmapView';
import { SniperView } from './components/views/SniperView';
import { StrategiesView } from './components/views/StrategiesView';
import { PositionsView } from './components/views/PositionsView';
import { ActivityView } from './components/views/ActivityView';
import { AnalyticsView } from './components/views/AnalyticsView';
import { BacktestView } from './components/views/BacktestView';
import { RiskView } from './components/views/RiskView';
import { WalletView } from './components/views/WalletView';
import { TelegramView } from './components/views/TelegramView';
import { SettingsView } from './components/views/SettingsView';
import { DiagnosticsView } from './components/views/DiagnosticsView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { TradeModal } from './components/modals/TradeModal';
import { LiveArmModal } from './components/modals/LiveArmModal';
import { TokenDetailModal } from './components/modals/TokenDetailModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [snapshot, setSnapshot] = useState<EngineSnapshot | null>(null);
  const [wsConnected, setWsConnected] = useState<boolean>(false);
  const [currentTab, setCurrentTab] = useState<TabId>(() => {
    try {
      const saved = localStorage.getItem('helix.tab') as TabId;
      return saved || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('helix.theme');
      if (saved === 'light' || saved === 'dark') return saved;
      if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    } catch {}
    return 'dark';
  });
  const [soundOn, setSoundOn] = useState<boolean>(isSoundEnabled);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // Modals state
  const [selectedCoin, setSelectedCoin] = useState<Coin | null>(null);
  const [showTradeModal, setShowTradeModal] = useState<boolean>(false);
  const [showLiveModal, setShowLiveModal] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  // Tab persistence
  const handleSelectTab = (tab: TabId) => {
    setCurrentTab(tab);
    setMobileMenuOpen(false);
    try {
      localStorage.setItem('helix.tab', tab);
    } catch {}
  };

  // Theme synchronization and persistence
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('helix.theme', theme);
    } catch {}
  }, [theme]);

  // Theme toggle
  const handleToggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Sound toggle
  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  // Connect WebSocket & fallback polling
  useEffect(() => {
    let unmounted = false;

    function connectWs() {
      if (unmounted) return;
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (unmounted) return;
          setWsConnected(true);
        };

        ws.onmessage = event => {
          if (unmounted) return;
          try {
            const data: EngineSnapshot = JSON.parse(event.data);
            setSnapshot(data);
          } catch {}
        };

        ws.onclose = () => {
          if (unmounted) return;
          setWsConnected(false);
          reconnectTimeoutRef.current = setTimeout(connectWs, 2000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        reconnectTimeoutRef.current = setTimeout(connectWs, 3000);
      }
    }

    connectWs();

    // Initial state fetch
    helixApi
      .getState()
      .then(res => {
        if (!unmounted) setSnapshot(res);
      })
      .catch(() => {});

    // Polling fallback in case WS is down or blocked
    const pollInterval = setInterval(() => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        helixApi
          .getState()
          .then(res => {
            if (!unmounted) setSnapshot(res);
          })
          .catch(() => {});
      }
    }, 1500);

    return () => {
      unmounted = true;
      clearInterval(pollInterval);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  // Control handlers
  const handleControl = async (action: any, mode?: string) => {
    try {
      const res = await helixApi.control(action, mode);
      if (res?.state) setSnapshot(res.state);
    } catch (e: any) {
      alert(`Fehler: ${e?.message || 'Befehl fehlgeschlagen'}`);
    }
  };

  const handleTradeCoin = (coin: Coin) => {
    setSelectedCoin(coin);
    setShowTradeModal(true);
  };

  const handleInspectCoin = (coin: Coin) => {
    setSelectedCoin(coin);
    setShowDetailModal(true);
  };

  const handleSellPosition = async (posId: string) => {
    try {
      playTradeSound('tp');
      await helixApi.paperExit(posId, 'MANUAL_SELL_CLICK');
      const snap = await helixApi.getState();
      setSnapshot(snap);
    } catch (e: any) {
      alert(`Fehler beim Schließen: ${e?.message}`);
    }
  };

  const handleCloseAll = async () => {
    try {
      await helixApi.emergencyCloseAll();
      const snap = await helixApi.getState();
      setSnapshot(snap);
    } catch (e: any) {
      alert(`Fehler: ${e?.message}`);
    }
  };

  const handleUpdateConfig = async (newCfg: Partial<AppConfig>) => {
    try {
      const res = await helixApi.updateConfig(newCfg);
      if (res.config && snapshot) {
        setSnapshot({ ...snapshot, config: res.config });
      }
    } catch (e: any) {
      alert(`Fehler: ${e?.message}`);
    }
  };

  const handleUpdateStrategy = async (strat: string) => {
    try {
      await helixApi.setStrategy(strat);
      if (snapshot) setSnapshot({ ...snapshot, strategy: strat });
    } catch (e: any) {
      alert(`Fehler: ${e?.message}`);
    }
  };

  const handleUpdateActiveStrategies = async (strats: string[]) => {
    try {
      const res = await helixApi.toggleMultiStrategies(strats);
      if (res.active_strategies && snapshot) {
        setSnapshot({ ...snapshot, active_strategies: res.active_strategies });
      }
    } catch (e: any) {
      alert(`Fehler: ${e?.message}`);
    }
  };

  const handlePresetChange = async (preset: 'safe_slow' | 'normal' | 'aggressive') => {
    try {
      const res = await helixApi.setPreset(preset);
      if (res.config && snapshot) {
        setSnapshot({ ...snapshot, trading_preset: preset, config: res.config });
      }
    } catch (e: any) {
      alert(`Fehler: ${e?.message}`);
    }
  };

  const handleResetPaper = async () => {
    try {
      await helixApi.paperReset();
      const snap = await helixApi.getState();
      setSnapshot(snap);
    } catch (e: any) {
      alert(`Fehler: ${e?.message}`);
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#030708] text-[#ecf9f6]">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        snapshot={snapshot}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Bar */}
        <TopBar
          snapshot={snapshot}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          onOpenLiveModal={() => setShowLiveModal(true)}
          onOpenWalletModal={() => handleSelectTab('wallet')}
          onControl={handleControl}
          soundOn={soundOn}
          onToggleSound={handleToggleSound}
          wsConnected={wsConnected}
          onToggleMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* Tab View Content */}
        <main className="flex-1 overflow-y-auto">
          {!snapshot ? (
            <div className="h-full flex flex-col items-center justify-center space-y-3 font-mono text-xs text-[#7e9994]">
              <Loader2 className="w-8 h-8 text-[#00ffa3] animate-spin" />
              <span>Initialisiere Ultra-Low Latency Solana Pipeline…</span>
            </div>
          ) : (
            (() => {
              const tokenList = Array.isArray(snapshot?.candidates)
                ? snapshot.candidates
                : Array.isArray(snapshot?.coins)
                ? snapshot.coins
                : [];
              const positionsList = Array.isArray(snapshot?.positions) ? snapshot.positions : [];
              const fillsList = Array.isArray(snapshot?.fills) ? snapshot.fills : [];

              return (
                <>
                  {currentTab === 'dashboard' && (
                    <DashboardView
                      snapshot={snapshot}
                      onTradeCoin={handleTradeCoin}
                      onInspectCoin={handleInspectCoin}
                      onSellPosition={handleSellPosition}
                      onNavigateTab={handleSelectTab}
                    />
                  )}
                  {currentTab === 'scanner' && (
                    <ScannerView
                      candidates={tokenList}
                      onTradeCoin={handleTradeCoin}
                      onInspectCoin={handleInspectCoin}
                    />
                  )}
                  {currentTab === 'heatmap' && (
                    <HeatmapView
                      candidates={tokenList}
                      onTradeCoin={handleTradeCoin}
                      onInspectCoin={handleInspectCoin}
                    />
                  )}
                  {currentTab === 'sniper' && (
                    <SniperView
                      candidates={tokenList}
                      config={snapshot.config}
                      onTradeCoin={handleTradeCoin}
                      onInspectCoin={handleInspectCoin}
                      onUpdateConfig={handleUpdateConfig}
                    />
                  )}
                  {currentTab === 'strategies' && (
                    <StrategiesView
                      snapshot={snapshot}
                      onUpdateStrategy={handleUpdateStrategy}
                      onUpdateActiveStrategies={handleUpdateActiveStrategies}
                    />
                  )}
                  {currentTab === 'positions' && (
                    <PositionsView
                      positions={positionsList}
                      onSellPosition={handleSellPosition}
                      onCloseAll={handleCloseAll}
                    />
                  )}
                  {currentTab === 'activity' && <ActivityView fills={fillsList} />}
                  {currentTab === 'analytics' && <AnalyticsView />}
                  {currentTab === 'backtest' && <BacktestView />}
                  {currentTab === 'risk' && (
                    <RiskView snapshot={snapshot} onUpdateConfig={handleUpdateConfig} />
                  )}
                  {currentTab === 'wallet' && <WalletView />}
                  {currentTab === 'telegram' && (
                    <TelegramView config={snapshot.config} onUpdateConfig={handleUpdateConfig} />
                  )}
                  {currentTab === 'settings' && (
                    <SettingsView
                      snapshot={snapshot}
                      onUpdateConfig={handleUpdateConfig}
                      onPresetChange={handlePresetChange}
                      onResetPaper={handleResetPaper}
                      theme={theme}
                      onToggleTheme={handleToggleTheme}
                    />
                  )}
                  {currentTab === 'diagnostics' && <DiagnosticsView snapshot={snapshot} />}
                </>
              );
            })()
          )}
        </main>

        {/* Mobile Bottom Navigation Bar (visible on md:hidden screens) */}
        <MobileBottomNav
          currentTab={currentTab}
          onSelectTab={handleSelectTab}
          onOpenMenu={() => setMobileMenuOpen(true)}
          openPositionsCount={(snapshot?.positions || []).filter(p => p && p.status === 'OPEN').length}
        />
      </div>

      {/* Trade Modal */}
      {showTradeModal && selectedCoin && (
        <TradeModal
          coin={selectedCoin}
          mode={snapshot?.mode || 'paper'}
          activeStrategy={snapshot?.strategy || 'momentum'}
          onClose={() => {
            setShowTradeModal(false);
            setSelectedCoin(null);
          }}
          onSuccess={async () => {
            const snap = await helixApi.getState();
            setSnapshot(snap);
          }}
        />
      )}

      {/* 1-Click Live Modal */}
      {showLiveModal && (
        <LiveArmModal
          onClose={() => setShowLiveModal(false)}
          onArmed={async () => {
            const snap = await helixApi.getState();
            setSnapshot(snap);
          }}
        />
      )}

      {/* Token Detail Modal */}
      {showDetailModal && selectedCoin && (
        <TokenDetailModal
          coin={selectedCoin}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCoin(null);
          }}
          onTrade={coin => {
            setShowDetailModal(false);
            handleTradeCoin(coin);
          }}
        />
      )}
    </div>
  );
}
