import React from 'react';
import { motion } from 'framer-motion';

interface SplashScreenProps {
    onComplete?: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center"
        >
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, type: "spring" }}
                className="flex flex-col items-center"
            >
                <div className="w-24 h-24 bg-yellow-400 rounded-2xl flex items-center justify-center mb-6 shadow-glow">
                    <span className="text-4xl font-black text-black">Q</span>
                </div>
                <h1 className="text-3xl font-bold text-white tracking-widest">QUELIMOVE</h1>
                <p className="text-gray-400 mt-2 text-sm tracking-wider">TAXI & MOTO</p>
            </motion.div>

            <motion.div
                initial={{ width: 0 }}
                animate={{ width: 200 }}
                transition={{ duration: 1.5, delay: 0.5 }}
                className="h-1 bg-yellow-400 mt-8 rounded-full"
            />
        </motion.div>
    );
}
