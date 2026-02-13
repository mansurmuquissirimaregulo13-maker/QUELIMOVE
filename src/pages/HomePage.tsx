import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, UserPlus, MapPin, Bike } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { BottomNav } from '../components/BottomNav';

interface HomePageProps {
  onNavigate: (page: string) => void;
  user?: { name: string; role?: string } | null;
}

export function HomePage({ onNavigate, user }: HomePageProps) {
  // Use prop if provided, fallback to localStorage for safety (though App should handle it)
  const currentUser = user || JSON.parse(localStorage.getItem('user_profile') || '{}');

  return (
    <div className="h-full flex flex-col relative bg-[var(--bg-primary)]">
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center z-10 pb-20">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-40 h-20 mb-10"
        >
          <img
            src="/photo_5792046450345708772_x-removebg-preview.png"
            alt="Quelimove Logo"
            className="w-full h-full object-contain"
          />
        </motion.div>

        <h1 className="text-3xl font-black text-[var(--text-primary)] mb-2 uppercase">
          {currentUser.name ? `Olá, ${currentUser.name.split(' ')[0]}!` : 'Quelimove'}
        </h1>

        <p className="text-[var(--text-secondary)] text-base mb-12">
          {currentUser.role ? 'Selecione uma opção' : 'Como você quer usar o app?'}
        </p>

        <div className="w-full space-y-4">
          <AnimatePresence mode="wait">
            {/* Option 1: Passenger - HIDDEN if user is a driver */}
            {(!currentUser || currentUser.role !== 'driver') && (
              <motion.button
                key="passenger-btn"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => onNavigate('ride')}
                className="w-full flex items-center justify-between p-5 bg-[#FBBF24] rounded-xl font-bold text-black group active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-black/5 rounded-full flex items-center justify-center">
                    <MapPin size={22} />
                  </div>
                  <span className="uppercase tracking-tight text-lg">Pedir Mota</span>
                </div>
                <ArrowRight size={20} />
              </motion.button>
            )}

            {/* Option 2: Driver - HIDDEN if user is a passenger */}
            {(!currentUser || currentUser.role !== 'user') && (
              <motion.button
                key="driver-btn"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => onNavigate('driver-reg')}
                className="w-full flex items-center justify-between p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl font-bold text-[var(--text-primary)] group active:scale-[0.98] transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-[var(--bg-primary)] rounded-full flex items-center justify-center border border-[var(--border-color)]">
                    <Bike size={22} />
                  </div>
                  <span className="uppercase tracking-tight text-lg">Sou Motorista</span>
                </div>
                <ArrowRight size={20} />
              </motion.button>
            )}
          </AnimatePresence>

          <div className="pt-10 flex justify-center gap-6">
            <button onClick={() => onNavigate('admin')} className="text-xs font-bold text-[var(--text-secondary)] uppercase underline decoration-[#FBBF24]/30">Admin</button>
            <button onClick={() => onNavigate('contact')} className="text-xs font-bold text-[var(--text-secondary)] uppercase underline decoration-[#FBBF24]/30">Suporte</button>
          </div>
        </div>
      </div>

      <BottomNav activeTab="home" onTabChange={(tab) => onNavigate(tab)} />
    </div>
  );
}