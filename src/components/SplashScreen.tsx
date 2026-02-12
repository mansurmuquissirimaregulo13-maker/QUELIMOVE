import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Bike } from 'lucide-react';

interface SplashScreenProps {
    onComplete?: () => void;
}

const containerVariants: Variants = {
    exit: {
        opacity: 0,
        transition: { duration: 0.8, ease: "easeInOut" }
    }
};

const letterContainerVariants: Variants = {
    hidden: { transition: { staggerChildren: 0.08 } },
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.5 } },
};

const letterVariants: Variants = {
    hidden: { y: 40, opacity: 0, scale: 0.8 },
    visible: {
        y: 0,
        opacity: 1,
        scale: 1,
        transition: { type: 'spring', damping: 12, stiffness: 120 }
    },
};

const logoVariants: Variants = {
    hidden: { scale: 0, opacity: 0, rotate: -20 },
    visible: {
        scale: 1,
        opacity: 1,
        rotate: 0,
        transition: {
            type: 'spring',
            damping: 15,
            stiffness: 100,
            delay: 0.2
        }
    }
};

export function SplashScreen({ onComplete }: SplashScreenProps) {
    const brandName = "QUELIMOVE".split("");

    return (
        <motion.div
            variants={containerVariants}
            initial="initial"
            exit="exit"
            className="fixed inset-0 z-[9999] bg-[#050505] flex flex-col items-center justify-center overflow-hidden"
        >
            {/* Premium Background Elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        x: [0, 50, 0],
                        y: [0, -30, 0],
                    }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-[10%] -left-[10%] w-[50%] h-[50%] bg-[#FBBF24] opacity-[0.05] blur-[120px] rounded-full"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.3, 1],
                        x: [0, -40, 0],
                        y: [0, 60, 0],
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-[#FBBF24] opacity-[0.03] blur-[150px] rounded-full"
                />
            </div>

            <div className="flex flex-col items-center relative z-10">
                {/* Animated Icon Container */}
                <motion.div
                    variants={logoVariants}
                    initial="hidden"
                    animate="visible"
                    className="relative mb-8"
                >
                    <div className="p-6 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-3xl border border-white/5 shadow-2xl relative group">
                        <Bike className="w-16 h-16 text-[#FBBF24] drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]" strokeWidth={1.5} />

                        {/* Pulsing Glow */}
                        <motion.div
                            animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.1, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-[#FBBF24] blur-2xl rounded-full opacity-20 -z-10"
                        />
                    </div>

                    {/* Speed Lines */}
                    <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-3">
                        {[...Array(3)].map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ width: 0, opacity: 0 }}
                                animate={{ width: [0, 40, 0], opacity: [0, 0.8, 0], x: [-10, 20, 50] }}
                                transition={{
                                    duration: 1.2,
                                    repeat: Infinity,
                                    delay: i * 0.2,
                                    ease: "easeOut"
                                }}
                                className="h-[1.5px] bg-[#FBBF24]/30 rounded-full"
                            />
                        ))}
                    </div>
                </motion.div>

                {/* Brand Name with Staggered Animation */}
                <motion.h1
                    variants={letterContainerVariants}
                    initial="hidden"
                    animate="visible"
                    className="flex space-x-[2px]"
                >
                    {brandName.map((letter, index) => (
                        <motion.span
                            key={index}
                            variants={letterVariants}
                            className="text-5xl font-black text-white tracking-widest relative"
                            style={{
                                textShadow: '0 0 20px rgba(255,255,255,0.1)'
                            }}
                        >
                            {letter}
                            {/* Shine Effect Overlay */}
                            <motion.span
                                animate={{
                                    left: ['-100%', '200%'],
                                }}
                                transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    repeatDelay: 3,
                                    delay: 1.5
                                }}
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] pointer-events-none"
                            />
                        </motion.span>
                    ))}
                </motion.h1>

                {/* Subtitle */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.5, duration: 0.8 }}
                    className="flex items-center gap-4 mt-6"
                >
                    <div className="h-[1px] w-8 bg-gradient-to-r from-transparent to-[#FBBF24]/50" />
                    <p className="text-[#FBBF24] text-[10px] tracking-[0.5em] font-bold uppercase">
                        Mobilidade & Excelência
                    </p>
                    <div className="h-[1px] w-8 bg-gradient-to-l from-transparent to-[#FBBF24]/50" />
                </motion.div>
            </div>

            {/* Progress Line Bottom */}
            <div className="absolute bottom-0 left-0 w-full h-[2px] bg-white/5">
                <motion.div
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2.5, ease: "easeInOut" }}
                    className="h-full bg-gradient-to-r from-transparent via-[#FBBF24] to-transparent shadow-[0_0_10px_#FBBF24]"
                />
            </div>
        </motion.div>
    );
}
