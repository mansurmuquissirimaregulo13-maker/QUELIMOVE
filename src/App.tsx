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
import { Clock } from 'lucide-react';
import { Button } from './components/ui/Button';

function AppContent() {
  /* Splash Screen State */
  const [showSplash, setShowSplash] = React.useState(true);

  /* App State */
  const [currentPage, setCurrentPage] = React.useState('home');
  const [user, setUser] = React.useState<{ name: string; age?: number; role?: string; status?: string; phone?: string; avatar_url?: string } | null>(() => {
    const saved = localStorage.getItem('user_profile');
    return saved ? JSON.parse(saved) : null;
  });

  React.useEffect(() => {
    // 1. Initial auth check
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Fetch latest profile to ensure local storage is fresh
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          const userData = {
            name: profile.full_name,
            role: profile.role,
            status: profile.status,
            phone: profile.phone,
            avatar_url: profile.avatar_url
          };
          setUser(userData);
          localStorage.setItem('user_profile', JSON.stringify(userData));
        }
      }
    };

    checkAuth();

    // 2. Real-time profile listener
    let subscription: any;

    const setupSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
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
              const userData = {
                name: updated.full_name,
                role: updated.role,
                status: updated.status,
                phone: updated.phone,
                avatar_url: updated.avatar_url
              };
              setUser(userData);
              localStorage.setItem('user_profile', JSON.stringify(userData));

              if (updated.status === 'active' && user?.status === 'pending') {
                alert('Sua conta foi aprovada! Bem-vindo ao Quelimove. 🚀');
                setCurrentPage('driver-dash'); // Force immediate redirect
              }
            }
          )
          .subscribe();
      }
    };

    setupSubscription();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  React.useEffect(() => {
    // 2. Check for active Supabase Session (Drivers & Persistent Users)
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profile) {
            if (profile.role === 'driver') {
              console.log('Restoring Driver Session:', profile);
              setCurrentPage('driver-dash');
              localStorage.setItem('user_profile', JSON.stringify({
                ...profile,
                name: profile.full_name || session.user.email
              }));
              setUser({ ...profile, role: 'driver' } as any);
            } else if (profile.role === 'user') {
              // Passenger Auto-Redirect
              console.log('Restoring User Session:', profile);
              setCurrentPage('ride'); // Go directly to map
              localStorage.setItem('user_profile', JSON.stringify({
                ...profile,
                name: profile.full_name || session.user.email
              }));
              setUser({ ...profile, role: 'user' } as any);
            }
          }
        }
      } catch (error) {
        console.error('Session check failed', error);
      } finally {
        // FAST STARTUP: Remove splash immediately after check
        setShowSplash(false);
      }
    };

    checkSession();

    // 3. Listen for Auth Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'driver') {
          setCurrentPage('driver-dash');
        } else if (profile?.role === 'user') {
          setCurrentPage('ride');
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentPage('home');
        localStorage.removeItem('user_profile');
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
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
      } else if (userProfile.role === 'user') {
        // Passageiros não devem ver a HomePage de escolha se já estiverem logados
        if (currentPage === 'home' || currentPage === 'driver-reg') {
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
      <AnimatePresence>
        {showSplash && <SplashScreen key="splash" />}
      </AnimatePresence>

      {!showSplash && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full h-full"
        >
          <InstallPrompt />
          <div className="w-full h-full overflow-hidden">
            {renderPage()}
          </div>
        </motion.div>
      )}
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