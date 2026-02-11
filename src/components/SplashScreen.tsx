import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Bike } from 'lucide-react'; // Using Bike as a proxy for Moto if Moto isn't available, or we can use a custom SVG

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
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center overflow-hidden"
        >
            <div className="flex flex-col items-center relative z-10">

                {/* Moto Animation Container */}
                <div className="w-64 h-24 relative mb-4 overflow-hidden">
                    <motion.div
                        initial={{ x: -100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 1.5, type: "spring", bounce: 0.2 }}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                    >
                        {/* Simple Moto Representation using Lucide Bike (or custom SVG path for a more distinct moto look if desired) */}
                        <div className="relative">
                            <Bike className="w-16 h-16 text-yellow-500" strokeWidth={1.5} />
                            <motion.div
                                className="absolute -bottom-1 left-0 w-full h-1 bg-gray-200 rounded-full opacity-50 blur-[2px]"
                                animate={{ scaleX: [0.8, 1.2, 0.8] }}
                                transition={{ repeat: Infinity, duration: 0.5 }}
                            />
                        </div>
                    </motion.div>

                    {/* Speed lines effect */}
                    <motion.div
                        className="absolute top-1/2 left-0 w-full h-full pointer-events-none"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        {[...Array(3)].map((_, i) => (
                            <motion.div
                                key={i}
                                className="absolute h-[2px] bg-gray-100 rounded-full"
                                style={{ top: `${40 + i * 20}%`, left: -50 }}
                                animate={{ x: [0, 300], opacity: [0, 1, 0] }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 0.8,
                                    delay: i * 0.2,
                                    ease: "linear"
                                }}
                            />
                        ))}
                    </motion.div>
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
                            className="text-4xl font-extrabold text-black tracking-widest"
                        >
                            {letter}
                        </motion.span>
                    ))}
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1, duration: 0.5 }}
                    className="text-gray-500 mt-2 text-sm tracking-[0.3em] font-semibold uppercase"
                >
                    Taxi & Moto
                </motion.p>
            </div>
        </motion.div>
    );
}
