import React from 'react';
import { ChevronLeft, MoreVertical } from 'lucide-react';
import { motion } from 'framer-motion';
interface HeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}
export function Header({ title, onBack, rightAction }: HeaderProps) {
  return (
    <motion.header
      initial={{
        y: -20,
        opacity: 0
      }}
      animate={{
        y: 0,
        opacity: 1
      }}
      className="flex items-center justify-between px-4 py-4 sticky top-0 bg-[#0a0a0a]/90 backdrop-blur-md z-40 border-b border-[#1a1a1a]">

      <div className="flex items-center gap-4">
        {onBack &&
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-[#1a1a1a] text-white transition-colors">

            <ChevronLeft size={24} />
          </button>
        }
        <h1 className="text-xl font-bold text-white">{title}</h1>
      </div>
      <div className="flex items-center gap-2">
        {rightAction ||
          <button
            onClick={() => alert('Opções: \n- Ajuda \n- Termos e Condições')}
            className="p-2 rounded-full hover:bg-[#1a1a1a] text-[#9CA3AF] transition-colors"
          >
            <MoreVertical size={24} />
          </button>
        }
      </div>
    </motion.header>);

}