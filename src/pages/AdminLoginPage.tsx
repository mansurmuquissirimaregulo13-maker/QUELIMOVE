import * as React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Header } from '../components/Header';
import { supabase } from '../lib/supabase';

interface AdminLoginPageProps {
    onLogin: (success: boolean) => void;
    onNavigate: (page: string) => void;
}

export function AdminLoginPage({ onLogin, onNavigate }: AdminLoginPageProps) {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [isLoading, setIsLoading] = React.useState(false);

    // Credenciais Hardcoded conforme solicitado pelo utilizador
    const ADMIN_EMAIL = 'mansurmuquissirimaregulo13@gmail.com';
    const ADMIN_PASSWORD = 'Mansurregulo11@';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // 1. Tentar Login Real no Supabase
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (authError) throw authError;

            // 2. Verificar se é realmente Admin (Opcional, mas bom para segurança no frontend)
            // A RLS já vai bloquear os dados se não for, mas aqui damos feedback visual
            /* 
               Nota: Se o utilizador não tiver a role 'admin' nos metadados, 
               ele não verá nada no dashboard devido às RLS Policies atualizadas.
            */

            localStorage.setItem('admin_session', 'true');
            localStorage.setItem('admin_email', email);
            onLogin(true);

        } catch (err: any) {
            console.error('Admin Login Error:', err);
            // Se falhar login (ex: user não existe), tentar validar hardcoded APENAS para emergência
            // mas sem acesso ao Supabase real isso não ajuda muito com os dados.
            if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
                alert("Aviso: A entrar em modo offline/hardcoded. Dados reais podem não carregar.");
                localStorage.setItem('admin_session', 'true');
                onLogin(true);
            } else {
                setError('Login falhou: ' + err.message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
            <Header title="Acesso Restrito" onBack={() => onNavigate('home')} />

            <div className="flex-1 flex flex-col items-center justify-center p-6 pb-24">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-sm space-y-8"
                >
                    <div className="text-center space-y-2">
                        <div className="w-20 h-20 bg-[#FBBF24]/10 rounded-[28px] flex items-center justify-center mx-auto mb-6 border border-[#FBBF24]/20">
                            <Shield className="text-[#FBBF24]" size={40} />
                        </div>
                        <h1 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter">Área do Administrador</h1>
                        <p className="text-[var(--text-secondary)] text-sm">Insira suas credenciais exclusivas para aceder ao painel de controlo.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-[var(--text-secondary)] ml-1">Email Administrativo</label>
                            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center focus-within:border-[#FBBF24] transition-all group">
                                <Mail size={18} className="text-[#FBBF24] mr-3 group-focus-within:scale-110 transition-transform" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@quelimove.com"
                                    className="bg-transparent border-none w-full focus:ring-0 text-sm font-medium outline-none text-[var(--text-primary)]"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] uppercase font-black tracking-widest text-[var(--text-secondary)] ml-1">Senha Mestra</label>
                            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-4 flex items-center focus-within:border-[#FBBF24] transition-all group">
                                <Lock size={18} className="text-[#FBBF24] mr-3 group-focus-within:scale-110 transition-transform" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="bg-transparent border-none w-full focus:ring-0 text-sm font-medium outline-none text-[var(--text-primary)]"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-2 text-red-500 bg-red-500/10 p-4 rounded-xl border border-red-500/20 text-xs font-bold"
                            >
                                <AlertCircle size={16} />
                                {error}
                            </motion.div>
                        )}

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-14 bg-[#FBBF24] text-black font-black uppercase tracking-tighter text-lg rounded-2xl shadow-xl shadow-[#FBBF24]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    Autenticar Admin
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </Button>
                    </form>

                    <p className="text-center text-[10px] text-[var(--text-tertiary)] uppercase font-bold tracking-widest opacity-50">
                        Acesso monitorado • Quelimove Security
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
