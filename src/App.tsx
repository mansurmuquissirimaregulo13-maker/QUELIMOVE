import * as React from 'react';
import { supabase } from './lib/supabase';
import { HomePage } from './pages/HomePage';
import { RideRequestPage } from './pages/RideRequestPage';
import { DriverRegistrationPage } from './pages/DriverRegistrationPage';
import { ContactPage } from './pages/ContactPage';
import { DriverDashboardPage } from './pages/DriverDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { InstallPrompt } from './components/InstallPrompt';
import { SplashScreen } from './components/SplashScreen';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, XCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './components/ui/Button';

function AppContent() {
  /* Splash Screen State */
  const [showSplash, setShowSplash] = React.useState(true);

  /* App State */
  const [currentPage, setCurrentPage] = React.useState('home');
  const [user, setUser] = React.useState<{ name: string; age?: number; role?: string; status?: string; phone?: string; avatar_url?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse user_profile', e);
      localStorage.removeItem('user_profile');
      return null;
    }
  });

  React.useEffect(() => {
    let subscription: any;

    const initializeAuth = async () => {
      try {
        // 1. Initial auth check
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        if (session) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Profile fetch failed', profileError);
            // Profile might not exist yet, allow onboarding if so
            if (profileError.code !== 'PGRST116') {
              // If it's a real error (not "no rows"), we might want to alert or handle it
            }
          }

          if (profile) {
            const userData = {
              ...profile,
              name: profile.full_name || session.user.user_metadata?.full_name || (session.user.email ? session.user.email.split('@')[0] : 'Usuário')
            };
            setUser(userData as any);
            localStorage.setItem('user_profile', JSON.stringify(userData));

            // Set initial page based on role
            if (profile.role === 'driver') {
              setCurrentPage('driver-dash');
            } else {
              setCurrentPage('ride');
            }

            // 2. Setup Real-time profile listener
            subscription = supabase
              .channel(`profile-changes-${session.user.id}`)
              .on(
                'postgres_changes',
                {
                  event: 'UPDATE',
                  schema: 'public',
                  table: 'profiles',
                  filter: `id=eq.${session.user.id}`
                },
                (payload) => {
                  const updated = payload.new as any;
                  const newUserData = {
                    ...updated,
                    name: updated.full_name
                  };

                  setUser(prev => {
                    const prevStatus = prev?.status;
                    if (updated.status === 'active' && prevStatus === 'pending') {
                      alert('Sua conta foi aprovada! Bem-vindo ao Quelimove. 🚀');
                      setCurrentPage('driver-dash');
                    }
                    return newUserData as any;
                  });
                  localStorage.setItem('user_profile', JSON.stringify(newUserData));
                }
              )
              .subscribe();
          } else {
            // Logged in but no profile - should technically be onboarding
            setUser(null);
            localStorage.removeItem('user_profile');
          }
        } else {
          // No session
          setUser(null);
          localStorage.removeItem('user_profile');
        }
      } catch (err) {
        console.error('initializeAuth failure', err);
      } finally {
        // Ensure splash screen always hides eventually
        setShowSplash(false);
      }
    };

    initializeAuth();

    // 3. Listen for Auth State Changes (Login/Logout)
    const { data: { subscription: authListener } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      if (event === 'SIGNED_IN' && session) {
        // Re-run initialization to fetch profile and setup listeners
        initializeAuth();
      } else if (event === 'SIGNED_OUT') {
        setCurrentPage('home');
        localStorage.clear();
        setUser(null);
        if (subscription) {
          supabase.removeChannel(subscription);
          subscription = null;
        }
      }
    });

    return () => {
      authListener.unsubscribe();
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);


  const handleRegister = (userData: { name: string; age?: number; role?: string }) => {
    // Persist user with role
    const profile = { ...userData, role: userData.role || 'user' };
    localStorage.setItem('user_profile', JSON.stringify(profile));
    setUser(profile as any);

    if (profile.role === 'driver') {
      setCurrentPage('driver-dash');
    } else {
      // Force passenger to map
      setCurrentPage('ride');
    }
  };

  const renderPage = () => {
    // Verificação de Admin
    const isAdminAuthenticated = localStorage.getItem('admin_session') === 'true';

    // Se estiver autenticado, aplica redirecionamento automático estrito
    if (user) {
      const userProfile = user as any;
      if (userProfile.role === 'driver') {
        // Bloqueio de Motorista Pendente
        if (userProfile.status === 'pending' || userProfile.status === 'rejected') {
          return (
            <div className="h-[100dvh] w-full flex flex-col items-center justify-center p-8 text-center bg-[var(--bg-primary)]">
              <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center mb-6">
                <Clock size={48} className="text-orange-500 animate-pulse" />
              </div>
              <h2 className="text-2xl font-black text-[var(--text-primary)] uppercase tracking-tighter mb-2">Conta em Análise</h2>
              <p className="text-[var(--text-secondary)] text-sm mb-8">O seu cadastro foi enviado com sucesso. O administrador está a analisar os seus dados. Receberá uma notificação via WhatsApp assim que for aprovado.</p>
              <Button onClick={() => { localStorage.clear(); window.location.reload(); }} variant="ghost" className="text-red-500 font-bold uppercase tracking-tight">Sair e Entrar com outra conta</Button>
            </div>
          );
        }

        // Motoristas aprovados só podem ver dashboard, perfil e contacto
        // Se o motorista aprovado tentar acessar outra página, redireciona para o dashboard
        if (currentPage !== 'driver-dash' && currentPage !== 'profile' && currentPage !== 'contact') {
          return <DriverDashboardPage onNavigate={setCurrentPage} />;
        }
      } else if (userProfile.role === 'admin') {
        // Redirecionamento automático para o Painel Admin se for o administrador logado
        if (currentPage !== 'admin-dash' && currentPage !== 'profile') {
          return <AdminDashboardPage onNavigate={setCurrentPage} />;
        }
      } else if (userProfile.role === 'user') {
        // Passageiros não devem ver a HomePage de escolha se já estiverem logados
        // Mas se estiverem tentando aceder ao ADMIN (Mansur tentando com conta pessoal), permitimos seguir para o caso do switch
        if ((currentPage === 'home' || currentPage === 'driver-reg') && (currentPage !== 'admin' && currentPage !== 'admin-dash')) {
          return <RideRequestPage onNavigate={setCurrentPage} />;
        }
      }
    }

    // Se tentar aceder ao admin sem estar autenticado, mostra o Login de Admin
    if ((currentPage === 'admin' || currentPage === 'admin-dash') && !isAdminAuthenticated) {
      return (
        <AdminLoginPage
          onLogin={() => {
            const adminEmail = localStorage.getItem('admin_email');
            if (adminEmail === 'mansurmuquissirimaregulo13@gmail.com') {
              // Promove o usuário atual para Admin se as credenciais baterem
              const currentProfile = JSON.parse(localStorage.getItem('user_profile') || '{}');
              localStorage.setItem('user_profile', JSON.stringify({ ...currentProfile, role: 'admin', email: adminEmail }));
              setUser({ ...currentProfile, role: 'admin' } as any);
            }
            setCurrentPage('admin-dash');
          }}
          onNavigate={setCurrentPage}
        />
      );
    }

    // Se não houver usuário e tentar acessar páginas restritas, mostra o Onboarding
    if (!user && (currentPage === 'ride' || currentPage === 'profile')) {
      return <OnboardingPage onComplete={handleRegister} />;
    }

    switch (currentPage) {
      case 'home':
        return <HomePage onNavigate={setCurrentPage} />;
      case 'ride':
        return <RideRequestPage onNavigate={setCurrentPage} />;
      case 'driver-reg':
        return <DriverRegistrationPage onNavigate={setCurrentPage} />;
      case 'contact':
        return <ContactPage onNavigate={setCurrentPage} />;
      case 'driver-dash':
        return <DriverDashboardPage onNavigate={setCurrentPage} />;
      case 'admin':
      case 'admin-dash':
        return <AdminDashboardPage onNavigate={setCurrentPage} />;
      case 'profile':
        return <ProfilePage onNavigate={setCurrentPage} />;
      default:
        return <HomePage onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden transition-colors duration-300 bg-[var(--bg-primary)]">
      <AnimatePresence mode="wait">
        {showSplash ? (
          <SplashScreen key="splash" />
        ) : (
          <motion.div
            key="main-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full relative"
          >
            <InstallPrompt />
            <div className="w-full h-full overflow-hidden">
              {renderPage()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}