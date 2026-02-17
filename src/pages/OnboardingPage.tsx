import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ArrowRight, Shield, Clock as LucideClock, Phone, Lock, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { Input } from '../components/ui/Input';
import { sanitizeAuthError } from '../lib/authSanitizer';

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
        icon: <LucideClock className="text-[#FBBF24]" size={48} />,
        title: 'Move-te sem stress',
        description: 'Chega ao teu destino com rapidez e o conforto que mereces. Em Quelimane, nós somos o teu parceiro.'
    },
    {
        id: 'value-2',
        type: 'content',
        icon: <Shield className="text-[#FBBF24]" size={48} />,
        title: 'Segurança & Confiança',
        description: 'Motoristas verificados e viagens monitoradas. A tua paz de espírito é o nosso compromisso.'
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
        password: '',
        age: '',
        role: 'user' as 'user' | 'driver'
    });
    const [error, setError] = React.useState<string | null>(null);

    const [isLoginMode, setIsLoginMode] = React.useState(false);

    // Unified Normalization (v4.0): Always 258 + 9 digits
    const normalizePhone = (phone: string) => {
        const clean = phone.replace(/\D/g, '');
        if (clean.length === 9 && clean.startsWith('8')) return '258' + clean;
        return clean;
    };

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(prev => prev + 1);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.phone || !formData.password) {
            setError('Por favor, preencha o telefone e a palavra-passe.');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const cleanPhone = normalizePhone(formData.phone);
            const patterns = [
                `${cleanPhone}@app.quelimove.com`,
                `${cleanPhone}@user.quelimove.com`,
                `${cleanPhone}@driver.quelimove.com`,
                `${cleanPhone.slice(-9)}@user.quelimove.com` // Deep fallback for older formats
            ];

            let lastError: any = null;
            let successUser: any = null;

            for (const email of patterns) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password: formData.password
                });

                if (!error && data.user) {
                    successUser = data.user;
                    break;
                }
                lastError = error;
            }

            if (!successUser) {
                const sanitized = sanitizeAuthError(lastError, formData.phone);
                throw new Error(sanitized);
            }

            if (successUser) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', successUser.id)
                    .single();

                if (profile) {
                    onComplete({ name: profile.full_name, role: profile.role });
                } else {
                    // Espera curta para o trigger processar se necessário
                    onComplete({ name: formData.name || 'Usuário', role: 'user' });
                }
            }
        } catch (err: any) {
            console.error('Login Error:', err);
            setError(sanitizeAuthError(err, formData.phone));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLoginMode) {
            return handleLogin(e);
        }

        if (!formData.name || !formData.password || !formData.phone || !formData.age) {
            setError('Por favor, preencha todos os campos.');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const cleanPhone = normalizePhone(formData.phone);
            const internalEmail = `${cleanPhone}@quelimove.mz`;

            // 1. Sign Up
            const { data, error } = await supabase.auth.signUp({
                email: internalEmail,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.name,
                        phone: cleanPhone,
                        age: formData.age,
                        role: formData.role,
                        raw_password: formData.password // Metadata para suporte admin
                    }
                }
            });

            if (error) {
                const sanitized = sanitizeAuthError(error, formData.phone);

                // Transição automática para login se a conta já existe
                const msg = error.message.toLowerCase();
                if (msg.includes('already registered') || msg.includes('already in use') || msg.includes('already exists')) {
                    setIsLoginMode(true);
                }

                throw new Error(sanitized);
            }

            if (data.user) {
                // Profile is now handled by the 'on_auth_user_created' database trigger
                // which captures 'full_name', 'phone', and 'role' from raw_user_meta_data
                onComplete({ name: formData.name, role: formData.role });
            }

        } catch (err: any) {
            console.error('Onboarding Error:', err);
            setError(err.message || 'Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    const slide = slides[currentSlide];

    return (
        <div className="h-[100dvh] w-full bg-[var(--bg-primary)] overflow-hidden flex flex-col relative select-none">
            {/* Premium Background Background Glow */}
            <div className="absolute top-[-20%] right-[-10%] w-[70%] h-[70%] bg-gradient-to-br from-[#FBBF24]/10 to-transparent blur-[140px] rounded-full pointer-events-none animate-pulse-slow" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-gradient-to-tr from-blue-500/5 to-transparent blur-[120px] rounded-full pointer-events-none" />

            <div className="flex-1 flex flex-col items-center justify-center p-8 w-full max-w-md mx-auto relative z-10 overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="w-full flex flex-col items-center text-center space-y-8 overflow-x-hidden"
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
                                <div className="space-y-3">
                                    <h1 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">Quelimove</h1>
                                    <p className="text-[#FBBF24] font-bold text-xs uppercase tracking-[0.2em] opacity-80">Qualidade e Movimento</p>
                                </div>
                            </div>
                        )}

                        {slide.type === 'content' && (
                            <div className="space-y-6">
                                <div className="w-24 h-24 bg-[var(--bg-secondary)] rounded-[32px] border border-[var(--border-color)] flex items-center justify-center mx-auto shadow-2xl">
                                    {slide.icon}
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-[0.9]">{slide.title}</h2>
                                    <p className="text-gray-400 text-sm font-medium leading-relaxed px-4">{slide.description}</p>
                                </div>
                            </div>
                        )}

                        {slide.type === 'role' && (
                            <div className="w-full space-y-6">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">{slide.title}</h2>
                                    <p className="text-gray-400 text-xs font-medium">{slide.description}</p>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <button
                                        onClick={() => { setFormData({ ...formData, role: 'user' }); nextSlide(); }}
                                        className={`p-6 rounded-[32px] border-2 transition-all text-left flex items-center gap-5 backdrop-blur-md ${formData.role === 'user' ? 'bg-[#FBBF24]/20 border-[#FBBF24] text-[#FBBF24] shadow-xl shadow-[#FBBF24]/10 ring-4 ring-[#FBBF24]/5' : 'bg-white/5 border-white/10 text-gray-400 opacity-80'}`}
                                    >
                                        <div className={`p-4 rounded-2xl ${formData.role === 'user' ? 'bg-[#FBBF24] text-black' : 'bg-gray-800'}`}>
                                            <User size={26} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <p className="font-black text-lg uppercase tracking-tight text-white group-hover:text-[var(--primary-color)]">Passageiro</p>
                                            <p className="text-[11px] font-bold text-gray-400">Quero pedir motas e viajar</p>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => { setFormData({ ...formData, role: 'driver' }); nextSlide(); }}
                                        className={`p-6 rounded-[32px] border-2 transition-all text-left flex items-center gap-5 backdrop-blur-md ${formData.role === 'driver' ? 'bg-[#FBBF24]/20 border-[#FBBF24] text-[#FBBF24] shadow-xl shadow-[#FBBF24]/10 ring-4 ring-[#FBBF24]/5' : 'bg-white/5 border-white/10 text-gray-400 opacity-80'}`}
                                    >
                                        <div className={`p-4 rounded-2xl ${formData.role === 'driver' ? 'bg-[#FBBF24] text-black' : 'bg-gray-800'}`}>
                                            <Shield size={26} strokeWidth={2.5} />
                                        </div>
                                        <div>
                                            <p className="font-black text-lg uppercase tracking-tight text-white group-hover:text-[var(--primary-color)]">Motorista</p>
                                            <p className="text-[11px] font-bold text-gray-400">Quero trabalhar e ganhar</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {slide.type === 'form' && (
                            <div className="w-full space-y-8">
                                <div className="space-y-2">
                                    <h2 className="text-3xl font-black text-[var(--text-primary)] uppercase tracking-tighter">{isLoginMode ? 'Bem-vindo de volta' : slide.title}</h2>
                                    <p className="text-[var(--text-secondary)] text-sm">{isLoginMode ? 'Insira seus dados para entrar' : slide.description}</p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                                    {error && (
                                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 mb-4">
                                            <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center text-red-500 flex-shrink-0 mt-0.5">
                                                <AlertCircle size={14} />
                                            </div>
                                            <p className="text-xs font-bold text-red-500 leading-relaxed">{error}</p>
                                        </div>
                                    )}

                                    {!isLoginMode && (
                                        <>
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
                                        </>
                                    )}
                                    <Input
                                        icon={Phone}
                                        label="Telefone"
                                        placeholder="+258 84..."
                                        value={formData.phone}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })}
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
                                        {isLoginMode ? 'Entrar Agora' : 'Criar Conta'}
                                    </Button>

                                    <div className="pt-4 text-center">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsLoginMode(!isLoginMode);
                                                setError(null);
                                            }}
                                            className="text-xs font-bold text-[#FBBF24] uppercase tracking-widest hover:opacity-80 transition-opacity"
                                        >
                                            {isLoginMode ? 'Criar uma nova conta →' : 'Já tenho uma conta →'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer Navigation */}
            {
                slide.type !== 'form' && (
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
                )
            }
        </div >
    );
}
