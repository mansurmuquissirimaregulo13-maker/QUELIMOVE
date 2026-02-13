import * as React from 'react';
import { supabase } from '../lib/supabase';
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
  Camera,
  Globe,
  Bell,
  Trash2,
  Moon,
  Sun
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useNotifications } from '../hooks/useNotifications';
import { motion, AnimatePresence } from 'framer-motion';

interface ProfilePageProps {
  onNavigate: (page: string) => void;
}

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const [activeView, setActiveView] = React.useState<'main' | 'edit' | 'history' | 'payments' | 'settings'>('main');
  const user = JSON.parse(localStorage.getItem('user_profile') || '{}');
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const { enabled: notificationsEnabled, setEnabled: setNotificationsEnabled } = useNotifications();
  const [isLoading, setIsLoading] = React.useState(false);
  const [rideHistory, setRideHistory] = React.useState<any[]>([]);
  const [editForm, setEditForm] = React.useState({
    name: user.name || '',
    age: user.age || '',
    phone: user.phone || ''
  });

  React.useEffect(() => {
    if (activeView === 'history') {
      fetchHistory();
    }
  }, [activeView]);

  const fetchHistory = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data, error } = await supabase
      .from('rides')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (data) setRideHistory(data);
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.name,
          age: editForm.age,
          phone: editForm.phone
        })
        .eq('id', session.user.id);

      if (error) throw error;

      // Update local storage
      const newProfile = { ...user, name: editForm.name, age: editForm.age, phone: editForm.phone };
      localStorage.setItem('user_profile', JSON.stringify(newProfile));

      alert('Perfil atualizado com sucesso!');
      setActiveView('main');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Erro ao atualizar perfil.');
    } finally {
      setIsLoading(false);
    }
  };

  const menuItems = [
    { id: 'edit', icon: User, label: t('profile.edit') },
    { id: 'history', icon: Clock, label: t('profile.history') },
    { id: 'payments', icon: CreditCard, label: t('profile.payments') },
    { id: 'settings', icon: Settings, label: t('profile.settings') }
  ];

  const renderContent = () => {
    switch (activeView) {
      case 'edit':
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative mb-6">
                <div className="w-28 h-28 rounded-full bg-[var(--bg-secondary)] border-4 border-[#FBBF24] flex items-center justify-center overflow-hidden shadow-xl">
                  <User size={48} className="text-[#FBBF24]" />
                </div>
                <button className="absolute bottom-1 right-1 p-2.5 bg-[#FBBF24] rounded-full text-black shadow-lg hover:scale-110 transition-all">
                  <Camera size={18} />
                </button>
              </div>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-60">Nome Completo</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full h-14 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl px-4 text-[var(--text-primary)] font-bold focus:ring-2 focus:ring-[#FBBF24]/50 outline-none"
                />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-60">Idade</label>
                <input
                  type="number"
                  value={editForm.age}
                  onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                  className="w-full h-14 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl px-4 text-[var(--text-primary)] font-bold focus:ring-2 focus:ring-[#FBBF24]/50 outline-none"
                />
              </div>
              <div className="space-y-1.5 px-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-60">Telefone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full h-14 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl px-4 text-[var(--text-primary)] font-bold focus:ring-2 focus:ring-[#FBBF24]/50 outline-none"
                />
              </div>
            </div>
            <Button
              className="w-full h-14 rounded-2xl"
              onClick={handleSaveProfile}
              isLoading={isLoading}
            >
              Salvar Alterações
            </Button>
          </div>
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--bg-secondary)] rounded-[28px] border border-[var(--border-color)] overflow-hidden">
              <div className="p-5 border-b border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[var(--bg-primary)] rounded-xl text-[#FBBF24]">
                    {theme === 'light' ? <Sun size={20} /> : <Moon size={20} />}
                  </div>
                  <div>
                    <p className="font-black text-[var(--text-primary)] text-sm uppercase tracking-tight">{t('settings.darkMode')}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase opacity-50">{t('settings.darkModeDesc')}</p>
                  </div>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${theme === 'dark' ? 'bg-[#FBBF24]' : 'bg-[var(--border-color)]'}`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 transform ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div
                className="p-5 border-b border-[var(--border-color)] flex items-center justify-between hover:opacity-80 transition-all cursor-pointer"
                onClick={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[var(--bg-primary)] rounded-xl text-blue-500">
                    <Globe size={20} />
                  </div>
                  <div>
                    <p className="font-black text-[var(--text-primary)] text-sm uppercase tracking-tight">{t('settings.language')}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase opacity-50">{language === 'pt' ? 'Português (MZ)' : 'English (US)'}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-[var(--text-secondary)]" />
              </div>

              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[var(--bg-primary)] rounded-xl text-orange-500">
                    <Bell size={20} />
                  </div>
                  <div>
                    <p className="font-black text-[var(--text-primary)] text-sm uppercase tracking-tight">{t('settings.notifications')}</p>
                    <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase opacity-50">{notificationsEnabled ? (language === 'pt' ? 'Ativado' : 'Enabled') : (language === 'pt' ? 'Desativado' : 'Disabled')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${notificationsEnabled ? 'bg-[#FBBF24]' : 'bg-[var(--border-color)]'}`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            <button
              onClick={async () => {
                if (window.confirm('Tem certeza que deseja apagar sua conta? Esta ação não pode ser desfeita.')) {
                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                      // Mark as deleted in profiles (Soft Delete) or just sign out for now if strict delete is blocked
                      // For this MVP, we will sign out and clear local storage to simulate deletion from the user perspective
                      // In a real app, you'd call a Supabase Edge Function to delete the user from Auth
                      await supabase.from('profiles').update({ is_available: false, full_name: 'DELETED USER' }).eq('id', user.id);
                      await supabase.auth.signOut();
                      localStorage.clear();
                      window.location.href = '/';
                    }
                  } catch (error) {
                    console.error('Error deleting account:', error);
                    alert('Erro ao apagar conta. Tente novamente.');
                  }
                }
              }}
              className="w-full p-5 bg-red-500/10 border border-red-500/20 rounded-[28px] flex items-center justify-center gap-2 text-red-500 font-bold hover:bg-red-500/20 transition-all"
            >
              <Trash2 size={18} />
              {t('settings.deleteAccount')}
            </button>
          </div>
        );
      case 'history':
        return (
          <div className="space-y-4">
            {rideHistory.length === 0 ? (
              <div className="text-center py-20 opacity-50">
                <Clock size={48} className="mx-auto mb-4 text-[var(--text-tertiary)]" />
                <p className="font-black text-[var(--text-primary)] uppercase tracking-widest text-sm">Sem Viagens Recentes</p>
                <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase mt-1">Tuas viagens aparecerão aqui</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rideHistory.map((ride) => (
                  <div key={ride.id} className="bg-[var(--bg-secondary)] p-4 rounded-2xl border border-[var(--border-color)] flex justify-between items-center">
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">{new Date(ride.created_at).toLocaleDateString()}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        {ride.status === 'completed' ? 'Concluída' : ride.status === 'cancelled' ? 'Cancelada' : 'Em andamento'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-[#FBBF24]">{ride.price} MT</p>
                      <p className="text-[10px] text-[var(--text-secondary)] uppercase">
                        {ride.distance?.toFixed(1)} km
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button onClick={() => onNavigate('ride')} className="w-full">Pedir {rideHistory.length > 0 ? 'Nova' : 'Primeira'} Viagem</Button>
          </div>
        );
      case 'payments':
        return (
          <div className="space-y-6">
            <div className="bg-[var(--bg-secondary)] rounded-[28px] border border-[var(--border-color)] p-6 space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">Métodos Ativos</p>
              <div className="flex items-center justify-between p-4 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-500 font-black italic">M</div>
                  <p className="font-bold text-[var(--text-primary)]">M-Pesa</p>
                </div>
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
            </div>
            <Button variant="outline" className="w-full border-dashed">Adicionar Método</Button>
          </div>
        );
      default:
        return (
          <div className="space-y-6">
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
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id as any)}
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

            <button
              className="w-full flex items-center justify-center h-14 rounded-2xl border border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors font-bold"
              onClick={async (e) => {
                e.preventDefault();
                console.log('Logging out...');
                try {
                  await supabase.auth.signOut();
                } catch (err) {
                  console.error('SignOut error:', err);
                }
                localStorage.clear();
                window.location.href = '/'; // Hard redirect
                window.location.reload();
              }}
            >
              <LogOut className="mr-2" size={20} />
              Sair da Conta
            </button>
          </div>
        );
    }
  };

  const getTitle = () => {
    switch (activeView) {
      case 'edit': return t('profile.edit');
      case 'settings': return t('profile.settings');
      case 'history': return t('profile.history');
      case 'payments': return t('profile.payments');
      default: return t('profile.title');
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)] transition-colors duration-300">
      <Header
        title={getTitle()}
        onBack={activeView === 'main' ? () => onNavigate('home') : () => setActiveView('main')}
      />

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {activeView === 'main' && (
              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-4">
                  <div className="w-24 h-24 rounded-full bg-[var(--bg-secondary)] border-2 border-[#FBBF24] flex items-center justify-center overflow-hidden shadow-lg">
                    <User size={40} className="text-[#FBBF24]" />
                  </div>
                  <button onClick={() => setActiveView('edit')} className="absolute bottom-0 right-0 p-2 bg-[#FBBF24] rounded-full text-black shadow-lg">
                    <Camera size={16} />
                  </button>
                </div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{user.name || 'Usuário Quelimove'}</h2>
                <p className="text-[var(--text-secondary)]">{user.age ? `${user.age} anos` : 'Moçambique'}</p>
              </div>
            )}

            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNav activeTab="profile" onTabChange={(tab) => onNavigate(tab)} />
    </div>
  );
}