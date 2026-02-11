import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Calendar, ArrowRight, Shield, Clock } from 'lucide-react';
import { Button } from '../components/ui/Button';

interface OnboardingPageProps {
    onComplete: (data: { name: string; age: number }) => void;
}

const slides = [
    {
        id: 'splash',
        type: 'splash',
        title: 'Quelimove',
        subtitle: 'Sua mobilidade em Quelimane'
    },
    {
        id: 'value-1',
        type: 'content',
        icon: <Clock className="text-[#FBBF24]" size={48} />,
        title: 'Rapidez Total',
        description: 'Chegue ao seu destino em tempo recorde com nossos motoristas parceiros.'
    },
    {
        id: 'value-2',
        type: 'content',
        icon: <Shield className="text-[#FBBF24]" size={48} />,
        title: 'Segurança Primeiro',
        description: 'Viagens monitoradas e motoristas verificados para sua tranquilidade.'
    },
    {
        id: 'register',
        type: 'form',
        title: 'Vamos Começar?',
        description: 'Conte-nos um pouco sobre você para personalizar sua experiência.'
    }
];

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
    const [currentSlide, setCurrentSlide] = React.useState(0);
    const [name, setName] = React.useState('');
    const [age, setAge] = React.useState('');

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(prev => prev + 1);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (name && age) {
            onComplete({ name, age: parseInt(age) });
        }
    };

    const slide = slides[currentSlide];

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] overflow-hidden flex flex-col relative">
            {/* Background Glow */}
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#FBBF24]/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="flex-1 flex flex-col items-center justify-center p-8">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={slide.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="w-full max-w-sm flex flex-col items-center text-center space-y-8"
                    >
                        {slide.type === 'splash' && (
                            <div className="space-y-6">
                                <motion.div
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ delay: 0.2, duration: 0.6 }}
                                    className="w-48 h-24 flex items-center justify-center"
                                >
                                    <img
                                        src="/photo_5792046450345708772_x-removebg-preview.png"
                                        alt="Logo"
                                        className="w-full h-full object-contain"
                                    />
                                </motion.div>
                                <div className="space-y-2">
                                    <h1 className="text-4xl font-black text-[var(--text-primary)] uppercase tracking-tighter">Quelimove</h1>
                                    <p className="text-[var(--text-secondary)] font-medium">Sua mobilidade em Quelimane</p>
                                </div>
                            </div>
                        )}

                        {slide.type === 'content' && (
                            <div className="space-y-6">
                                <div className="w-24 h-24 bg-[var(--bg-secondary)] rounded-[32px] border border-[var(--border-color)] flex items-center justify-center mx-auto shadow-2xl">
                                    {slide.icon}
                                </div>
                                <div className="space-y-3">
                                    <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tighter leading-none">{slide.title}</h2>
                                    <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{slide.description}</p>
                                </div>
                            </div>
                        )}

                        {slide.type === 'form' && (
                            <div className="w-full space-y-8">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tighter">{slide.title}</h2>
                                    <p className="text-[var(--text-secondary)] text-sm">{slide.description}</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-[var(--text-secondary)] ml-1">Nome Completo</label>
                                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center focus-within:border-[#FBBF24] transition-all group">
                                            <User size={18} className="text-[#FBBF24] mr-3 group-focus-within:scale-110 transition-transform" />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="Como devemos te chamar?"
                                                className="bg-transparent border-none w-full focus:ring-0 text-sm font-medium outline-none text-[var(--text-primary)]"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-[var(--text-secondary)] ml-1">Idade</label>
                                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center focus-within:border-[#FBBF24] transition-all group">
                                            <Calendar size={18} className="text-[#FBBF24] mr-3 group-focus-within:scale-110 transition-transform" />
                                            <input
                                                type="number"
                                                value={age}
                                                onChange={(e) => setAge(e.target.value)}
                                                placeholder="Sua idade"
                                                className="bg-transparent border-none w-full focus:ring-0 text-sm font-medium outline-none text-[var(--text-primary)]"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <Button
                                        type="submit"
                                        className="w-full h-14 bg-[#FBBF24] text-black font-black uppercase tracking-tighter text-lg rounded-2xl shadow-xl shadow-[#FBBF24]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        Começar Viagem
                                    </Button>
                                </form>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer Navigation */}
            {slide.type !== 'form' && (
                <div className="p-8 flex items-center justify-between">
                    <div className="flex gap-2">
                        {slides.filter(s => s.id !== 'splash').map((_, i) => (
                            <div
                                key={i}
                                className={`h-1.5 rounded-full transition-all duration-300 ${i + 1 === currentSlide ? 'w-8 bg-[#FBBF24]' : 'w-2 bg-[var(--border-color)]'}`}
                            />
                        ))}
                    </div>
                    <button
                        onClick={nextSlide}
                        className="w-14 h-14 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full flex items-center justify-center text-[var(--text-primary)] shadow-xl active:scale-90 transition-all font-black"
                    >
                        <ArrowRight size={20} />
                    </button>
                </div>
            )}
        </div>
    );
}
