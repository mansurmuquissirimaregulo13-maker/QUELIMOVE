import React from 'react';
import { motion } from 'framer-motion';
import { Bike } from 'lucide-react';

interface SplashScreenProps {
    onComplete?: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
    const brandName = "QUELIMOVE".split("");

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-[var(--bg-primary)] flex flex-col items-center justify-center overflow-hidden"
        >
            <div className="flex flex-col items-center relative z-10">

                {/* Logo Simples e Organizado */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="mb-6"
                >
                    <div className="p-4 bg-[var(--bg-secondary)] rounded-2xl shadow-sm border border-[var(--border-color)]">
                        <Bike className="w-16 h-16 text-[#FBBF24]" strokeWidth={2} />
                    </div>
                </motion.div>

                {/* Nome da Marca Limpo */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="flex space-x-1"
                >
                    {brandName.map((letter, index) => (
                        <span
                            key={index}
                            className="text-4xl font-black text-[var(--text-primary)] tracking-widest"
                        >
                            {letter}
                        </span>
                    ))}
                </motion.div>

                {/* Subtítulo Discreto */}
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.4 }}
                    transition={{ delay: 1, duration: 0.8 }}
                    className="text-[var(--text-primary)] mt-4 text-[10px] tracking-[0.4em] font-bold uppercase"
                >
                    Mobilidade & Confiança
                </motion.p>
            </div>
        </motion.div>
    );
}
