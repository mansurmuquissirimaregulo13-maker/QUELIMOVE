import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Detect iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(isIOSDevice);

        // Detect if already installed (standalone mode)
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        setIsStandalone(isStandaloneMode);

        const handler = (e: any) => {
            const hasDismissed = localStorage.getItem('install_dismissed');
            if (!hasDismissed && !isStandaloneMode) {
                e.preventDefault();
                setDeferredPrompt(e);
                setIsVisible(true);
            }
        };

        window.addEventListener('beforeinstallprompt', handler);

        // For iOS: show prompt if not dismissed and not already installed
        if (isIOSDevice && !isStandaloneMode) {
            const hasDismissed = localStorage.getItem('install_dismissed');
            if (!hasDismissed) {
                // Show after a small delay to not annoy user immediately
                const timer = setTimeout(() => setIsVisible(true), 3000);
                return () => clearTimeout(timer);
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (isIOS) {
            // iOS manual instruction alert or custom UI
            alert('Para instalar o QUELIMOVE no iOS:\n\n1. Clique no botão de compartilhamento (quadrado com seta)\n2. Role para baixo e selecione "Adicionar à Tela de Início"');
            setIsVisible(false);
            return;
        }

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

    if (isStandalone) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-0 left-0 right-0 z-[1001] p-4 safe-area-bottom pb-8"
                >
                    <div className="bg-[#1a1a1a] rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-5 border border-white/10 flex items-center justify-between backdrop-blur-xl">
                        <div className="flex items-center gap-4">
                            <div className="bg-[#FBBF24] text-black p-3 rounded-2xl shadow-lg shadow-[#FBBF24]/20 flex items-center justify-center">
                                <Download size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h3 className="font-black text-white text-sm uppercase tracking-tight">Instalar App</h3>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Acesso rápido em Quelimane</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleDismiss}
                                className="p-2 text-gray-500 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                            <button
                                onClick={handleInstall}
                                className="bg-[#FBBF24] text-black px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-[#FBBF24]/20 hover:bg-[#F59E0B] transition-all active:scale-95"
                            >
                                {isIOS ? 'Como Instalar' : 'Instalar'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
