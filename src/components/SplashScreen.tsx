import React from 'react';
import { motion, Variants } from 'framer-motion';

interface SplashScreenProps {
    onComplete?: () => void;
}

const letterContainerVariants: Variants = {
    hidden: { transition: { staggerChildren: 0.1 } },
    visible: { transition: { staggerChildren: 0.1 } },
};

const letterVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 10, stiffness: 100 } },
};

export function SplashScreen({ onComplete }: SplashScreenProps) {
    const brandName = "QUELIMOVE".split("");

    return (
        <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden"
        >
            {/* Background Pulse */}
            <motion.div
                animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="absolute w-[500px] h-[500px] bg-yellow-400/10 rounded-full blur-[100px]"
            />

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 1, type: "spring" }}
                className="flex flex-col items-center relative z-10"
            >
                <div className="w-24 h-24 bg-yellow-400 rounded-3xl flex items-center justify-center mb-8 shadow-[0_0_30px_rgba(250,204,21,0.4)]">
                    <motion.span
                        initial={{ rotate: -180, opacity: 0 }}
                        animate={{ rotate: 0, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-5xl font-black text-black"
                    >
                        Q
                    </motion.span>
                </div>

                <motion.h1
                    variants={letterContainerVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex space-x-1"
                >
                    {brandName.map((letter, index) => (
                        <motion.span
                            key={index}
                            variants={letterVariants}
                            className="text-3xl font-bold text-white tracking-widest"
                        >
                            {letter}
                        </motion.span>
                    ))}
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2, duration: 0.5 }}
                    className="text-yellow-400/80 mt-3 text-sm tracking-[0.2em] font-medium"
                >
                    TAXI & MOTO
                </motion.p>
            </motion.div>

            {/* Loading Line */}
            <motion.div
                className="absolute bottom-16 h-1 bg-gradient-to-r from-yellow-600 to-yellow-300 rounded-full"
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 200, opacity: 1 }}
                transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
            />
        </motion.div>
    );
}
