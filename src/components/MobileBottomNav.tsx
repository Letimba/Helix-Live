import React from 'react';
import { TabId } from './Sidebar';
import { LayoutDashboard, Radar, Crosshair, Briefcase, Menu } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: TabId;
  onSelectTab: (tab: TabId) => void;
  onOpenMenu: () => void;
  openPositionsCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenMenu,
  openPositionsCount
}) => {
  const items = [
    { id: 'dashboard' as TabId, label: 'Dash', icon: LayoutDashboard },
    { id: 'scanner' as TabId, label: 'Scanner', icon: Radar },
    { id: 'sniper' as TabId, label: 'Sniper', icon: Crosshair, badgeText: 'HOT' },
    { id: 'positions' as TabId, label: 'Pos', icon: Briefcase, badge: openPositionsCount > 0 ? openPositionsCount : undefined }
  ];

  return (
    <nav className="md:hidden border-t border-[#132427] bg-[#050b0d] flex items-center justify-around px-1 z-30 shrink-0 select-none pb-safe pt-1">
      {items.map(item => {
        const Icon = item.icon;
        const active = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex-1 py-1.5 flex flex-col items-center justify-center space-y-0.5 text-[10px] font-mono transition relative min-h-[44px] ${
              active
                ? 'text-[#00ffa3] font-bold'
                : 'text-[#7e9994] hover:text-[#ecf9f6]'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2 px-1 py-0.2 rounded-full bg-[#00ffa3] text-[#030708] font-bold text-[8px] leading-tight">
                  {item.badge}
                </span>
              )}
              {item.badgeText && !item.badge && (
                <span className="absolute -top-1.5 -right-3 px-1 py-0.2 rounded-full bg-[#ff3b69]/20 text-[#ff3b69] border border-[#ff3b69]/30 font-bold text-[7px] leading-tight">
                  {item.badgeText}
                </span>
              )}
            </div>
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}

      {/* Menu Drawer Toggle */}
      <button
        onClick={onOpenMenu}
        className="flex-1 py-1.5 flex flex-col items-center justify-center space-y-0.5 text-[10px] font-mono text-[#7e9994] hover:text-[#ecf9f6] transition min-h-[44px]"
      >
        <Menu className="w-5 h-5" />
        <span>Menü</span>
      </button>
    </nav>
  );
};
