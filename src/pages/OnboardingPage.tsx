import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ArrowRight, Shield, Clock, Phone, Mail, Lock, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { Input } from '../components/ui/Input';

interface OnboardingPageProps {
    onComplete: (data: { name: string; role?: string }) => void;
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
        id: 'role-select',
        type: 'role',
        title: 'Como deseja usar o Quelimove?',
        description: 'Escolha seu perfil para continuarmos.'
    },
    {
        id: 'register',
        type: 'form',
        title: 'Criar Conta',
        description: 'Seus dados para iniciarmos.'
    }
];

export function OnboardingPage({ onComplete }: OnboardingPageProps) {
    const [currentSlide, setCurrentSlide] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(false);

    const [formData, setFormData] = React.useState({
        name: '',
        phone: '',
        email: '',
        password: '',
        age: '',
        role: 'user' as 'user' | 'driver'
    });

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(prev => prev + 1);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.email || !formData.password || !formData.phone || !formData.age) return;

        setIsLoading(true);
        try {
            // 1. Sign Up
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name,
                        phone: formData.phone,
                        age: formData.age
                    }
                }
            });

            if (error) throw error;

            if (data.user) {
                // 2. Update Profile with Role & Phone
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        role: formData.role,
                        phone: formData.phone,
                        full_name: formData.name
                    })
                    .eq('id', data.user.id);

                if (profileError) {
                    console.error('Profile update failed', profileError);
                }

                // 3. Complete
                onComplete({ name: formData.name, role: formData.role });
            }

        } catch (err: any) {
            console.error('Onboarding Error:', err);
            alert('Erro ao criar conta: ' + (err.message || 'Tente novamente.'));
        } finally {
            setIsLoading(false);
        }
    };

    const slide = slides[currentSlide];

    return (
        <div className="h-[100dvh] w-full bg-[var(--bg-primary)] overflow-hidden flex flex-col relative select-none">
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

                        {slide.type === 'role' && (
                            <div className="w-full space-y-6">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tighter">{slide.title}</h2>
                                    <p className="text-[var(--text-secondary)] text-sm">{slide.description}</p>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <button
                                        onClick={() => { setFormData({ ...formData, role: 'user' }); nextSlide(); }}
                                        className={`p-6 rounded-3xl border-2 transition-all text-left flex items-center gap-4 ${formData.role === 'user' ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-black' : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)]'}`}
                                    >
                                        <div className={`p-3 rounded-2xl ${formData.role === 'user' ? 'bg-black text-white' : 'bg-[var(--bg-primary)]'}`}>
                                            <User size={24} />
                                        </div>
                                        <div>
                                            <p className="font-black uppercase tracking-tight">Passageiro / Cliente</p>
                                            <p className="text-[10px] opacity-70">Quero pedir motas e viajar</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => { setFormData({ ...formData, role: 'driver' }); nextSlide(); }}
                                        className={`p-6 rounded-3xl border-2 transition-all text-left flex items-center gap-4 ${formData.role === 'driver' ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-black' : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)]'}`}
                                    >
                                        <div className={`p-3 rounded-2xl ${formData.role === 'driver' ? 'bg-black text-white' : 'bg-[var(--bg-primary)]'}`}>
                                            <Shield size={24} />
                                        </div>
                                        <div>
                                            <p className="font-black uppercase tracking-tight">Mototaxista / Parceiro</p>
                                            <p className="text-[10px] opacity-70">Quero trabalhar e ganhar dinheiro</p>
                                        </div>
                                    </button>
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
                                    <Input
                                        icon={User}
                                        label="Nome Completo"
                                        placeholder="Seu nome"
                                        value={formData.name}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                    <Input
                                        icon={Calendar}
                                        label="Idade"
                                        type="number"
                                        placeholder="Ex: 25"
                                        value={formData.age}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, age: e.target.value })}
                                        required
                                    />
                                    <Input
                                        icon={Phone}
                                        label="Telefone"
                                        placeholder="+258 84..."
                                        value={formData.phone}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })}
                                        required
                                    />
                                    <Input
                                        icon={Mail}
                                        label="Email"
                                        type="email"
                                        placeholder="email@exemplo.com"
                                        value={formData.email}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                    <Input
                                        icon={Lock}
                                        label="Palavra-passe"
                                        type="password"
                                        placeholder="******"
                                        value={formData.password}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                                        required
                                    />

                                    <Button
                                        type="submit"
                                        className="w-full h-14 bg-[#FBBF24] text-black font-black uppercase tracking-tighter text-lg rounded-2xl shadow-xl shadow-[#FBBF24]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        isLoading={isLoading}
                                    >
                                        Criar Conta
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
