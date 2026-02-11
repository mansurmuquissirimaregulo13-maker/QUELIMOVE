import * as React from 'react';
import { Header } from '../components/Header';
import { BottomNav } from '../components/BottomNav';
import {
  User,
  Star,
  Clock,
  ChevronRight,
  Settings,
  CreditCard,
  LogOut,
  Camera
} from 'lucide-react';
import { Button } from '../components/ui/Button';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const user = JSON.parse(localStorage.getItem('user_profile') || '{}');

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      <Header title="Meu Perfil" onBack={() => onNavigate('home')} />

      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* Profile Header */}
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-24 h-24 rounded-full bg-[var(--bg-secondary)] border-2 border-[#FBBF24] flex items-center justify-center overflow-hidden">
              <User size={40} className="text-[#FBBF24]" />
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-[#FBBF24] rounded-full text-black shadow-lg">
              <Camera size={16} />
            </button>
          </div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">{user.name || 'Usuário Quelimove'}</h2>
          <p className="text-[var(--text-secondary)]">{user.age ? `${user.age} anos` : 'Moçambique'}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)] text-center">
            <p className="text-xs text-[var(--text-secondary)] mb-1">Viagens</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">0</p>
          </div>
          <div className="bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)] text-center">
            <p className="text-xs text-[var(--text-secondary)] mb-1">Avaliação</p>
            <div className="flex items-center justify-center gap-1 text-[#FBBF24]">
              <span className="text-lg font-bold">5.0</span>
              <Star size={12} fill="currentColor" />
            </div>
          </div>
          <div className="bg-[var(--bg-secondary)] p-3 rounded-xl border border-[var(--border-color)] text-center">
            <p className="text-xs text-[var(--text-secondary)] mb-1">Membro</p>
            <p className="text-lg font-bold text-[var(--text-primary)]">2026</p>
          </div>
        </div>

        {/* Menu Items */}
        <div className="space-y-2">
          {[
            { icon: User, label: 'Editar Perfil' },
            { icon: Clock, label: 'Histórico de Viagens' },
            { icon: CreditCard, label: 'Métodos de Pagamento' },
            { icon: Settings, label: 'Configurações' }
          ].map((item, i) => (
            <button
              key={i}
              className="w-full p-4 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl flex items-center justify-between hover:opacity-80 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--bg-primary)] rounded-lg text-[#FBBF24]">
                  <item.icon size={20} />
                </div>
                <span className="text-[var(--text-primary)] font-medium">{item.label}</span>
              </div>
              <ChevronRight size={20} className="text-[var(--text-secondary)]" />
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          className="w-full border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 hover:border-[#EF4444]"
        >
          <LogOut className="mr-2" size={20} />
          Sair da Conta
        </Button>
      </div>

      <BottomNav activeTab="profile" onTabChange={(tab) => onNavigate(tab)} />
    </div>
  );
}