import * as React from 'react';
import {
  Home,
  Map,
  User,
  Settings,
  LayoutDashboard,
  Car,
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  userType?: 'client' | 'driver' | 'admin';
}

export function BottomNav({
  activeTab,
  onTabChange,
  userType = 'client'
}: BottomNavProps) {
  const clientTabs = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'ride', icon: Map, label: 'Pedir' },
    { id: 'profile', icon: User, label: 'Perfil' }
  ];

  const driverTabs = [
    { id: 'driver-dash', icon: LayoutDashboard, label: 'Início' },
    { id: 'earnings', icon: Car, label: 'Viagens' },
    { id: 'profile', icon: User, label: 'Perfil' }
  ];

  const adminTabs = [
    { id: 'metrics', icon: LayoutDashboard, label: 'Geral' },
    { id: 'rides', icon: Car, label: 'Viagens' },
    { id: 'drivers', icon: Users, label: 'Motoristas' },
    { id: 'settings', icon: Settings, label: 'Config' }
  ];

  const tabs =
    userType === 'driver'
      ? driverTabs
      : userType === 'admin'
        ? adminTabs
        : clientTabs;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-primary)]/90 backdrop-blur-lg border-t border-[var(--border-color)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-2 px-6 z-50">
      <div className="flex items-center justify-between">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-1 p-2 relative flex-1"
            >
              <tab.icon
                size={24}
                className={`transition-colors ${isActive ? 'text-[#FBBF24]' : 'text-[var(--text-secondary)]'}`}
              />
              <span
                className={`text-[10px] font-medium transition-colors ${isActive ? 'text-[#FBBF24]' : 'text-[var(--text-secondary)]'}`}
              >
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-2 w-1 h-1 rounded-full bg-[#FBBF24]"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}