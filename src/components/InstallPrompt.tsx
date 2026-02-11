import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            // Check if already installed or dismissed recently
            const hasDismissed = localStorage.getItem('install_dismissed');
            if (!hasDismissed) {
                setIsVisible(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsVisible(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('install_dismissed', 'true');
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-0 left-0 right-0 z-[1000] p-4 safe-area-bottom"
                >
                    <div className="bg-white rounded-2xl shadow-2xl p-4 border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-black text-white p-3 rounded-xl">
                                <Download size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Instalar QUELIMOVE</h3>
                                <p className="text-xs text-gray-500">Acesso rápido e sem internet</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleDismiss}
                                className="p-2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={20} />
                            </button>
                            <button
                                onClick={handleInstall}
                                className="bg-black text-white px-4 py-2 rounded-lg text-sm font-bold"
                            >
                                Instalar
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
