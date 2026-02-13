import { motion } from 'framer-motion';
import { ArrowRight, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { BottomNav } from '../components/BottomNav';

interface HomePageProps {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  const user = JSON.parse(localStorage.getItem('user_profile') || '{}');

  return (
    <div className="h-[100dvh] w-full flex flex-col relative bg-[var(--bg-primary)] overflow-hidden select-none">
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
          Olá, {user.name?.split(' ')[0] || 'Viajante'}!
        </motion.h1>

        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[var(--text-secondary)] text-lg mb-12"
        >
          Seu moto-táxi em Quelimane.
          <br />
          Rápido. Seguro. Confiável.
        </motion.p>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="w-full space-y-4"
        >
          <Button
            className="w-full h-14 text-lg shadow-lg shadow-[#FBBF24]/20"
            onClick={() => onNavigate('ride')}
          >
            Pedir Moto
            <ArrowRight className="ml-2" size={20} />
          </Button>

          <Button
            variant="outline"
            className="w-full h-14 text-lg border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6]/10 hover:border-[#3B82F6]"
            onClick={() => onNavigate('driver-reg')}
          >
            <UserPlus className="ml-2" size={20} />
            Sou Mototaxista
          </Button>

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