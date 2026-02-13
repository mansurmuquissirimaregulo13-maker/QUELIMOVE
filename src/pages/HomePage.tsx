import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, UserPlus, MapPin, Bike } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { BottomNav } from '../components/BottomNav';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const user = JSON.parse(localStorage.getItem('user_profile') || '{}');

  return (
    <div className="h-full flex flex-col relative bg-[var(--bg-primary)]">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-[#FBBF24]/5 to-transparent pointer-events-none" />

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center z-10 pb-20">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-48 h-24 flex items-center justify-center mb-8"
        >
          <img
            src="/photo_5792046450345708772_x-removebg-preview.png"
            alt="Quelimove Logo"
            className="w-full h-full object-contain"
          />
        </motion.div>

        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-black text-[var(--text-primary)] mb-2 uppercase tracking-tighter"
        >
          {user.name ? `Olá, ${user.name.split(' ')[0]}!` : 'Bem-vindo!'}
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[var(--text-secondary)] text-lg mb-12"
        >
          Como você quer usar o Quelimove?
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full space-y-4"
        >
          <AnimatePresence mode="wait">
            {/* Option 1: Passenger */}
            {(!user || user.role !== 'driver') && (
              <motion.button
                key="passenger-btn"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => onNavigate('ride')}
                className="w-full flex items-center justify-between p-6 bg-[#FBBF24] rounded-2xl shadow-lg shadow-[#FBBF24]/20 hover:scale-[1.02] active:scale-[0.98] transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-black/10 rounded-full flex items-center justify-center text-black">
                    <MapPin size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-black text-lg uppercase tracking-tight">Pedir Mota</p>
                    <p className="text-black/60 text-xs font-bold uppercase">Quero Viajar</p>
                  </div>
                </div>
                <ArrowRight className="text-black group-hover:translate-x-1 transition-transform" />
              </motion.button>
            )}

            {/* Option 2: Driver */}
            {(!user || user.role !== 'user') && (
              <motion.button
                key="driver-btn"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => onNavigate('driver-reg')}
                className="w-full flex items-center justify-between p-6 bg-[var(--bg-secondary)] border-2 border-[var(--border-color)] rounded-2xl hover:border-[#3B82F6] hover:bg-[#3B82F6]/5 transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[var(--bg-primary)] rounded-full flex items-center justify-center text-[var(--text-primary)] border border-[var(--border-color)]">
                    <Bike size={24} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[var(--text-primary)] text-lg uppercase tracking-tight">Sou Motorista</p>
                    <p className="text-[var(--text-secondary)] text-xs font-bold uppercase">Quero Trabalhar</p>
                  </div>
                </div>
                <ArrowRight className="text-[var(--text-secondary)] group-hover:translate-x-1 transition-transform" />
              </motion.button>
            )}
          </AnimatePresence>

          <div className="pt-8 flex justify-center gap-4">
            <button
              onClick={() => onNavigate('admin')}
              className="text-xs text-[var(--text-secondary)] hover:text-[#FBBF24] transition-colors"
            >
              Admin
            </button>
            <span className="text-[var(--border-color)]">•</span>
            <button
              onClick={() => onNavigate('contact')}
              className="text-xs text-[var(--text-secondary)] hover:text-[#FBBF24] transition-colors"
            >
              Suporte
            </button>
          </div>
        </motion.div>
      </div>

      <BottomNav activeTab="home" onTabChange={(tab) => onNavigate(tab)} />
    </div>
  );
}