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

function AppContent() {
  /* Splash Screen State */
  const [showSplash, setShowSplash] = React.useState(true);

  /* App State */
  const [currentPage, setCurrentPage] = React.useState('home');
  const [user, setUser] = React.useState<{ name: string; age?: number; role?: string } | null>(() => {
    const saved = localStorage.getItem('user_profile');
    return saved ? JSON.parse(saved) : null;
  });

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
      if (user.role === 'driver') {
        // Motoristas só podem ver dashboard, perfil e contacto
        if (currentPage !== 'driver-dash' && currentPage !== 'profile' && currentPage !== 'contact') {
          return <DriverDashboardPage onNavigate={setCurrentPage} />;
        }
      } else if (user.role === 'user') {
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
        return <HomePage onNavigate={setCurrentPage} user={user} />;
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
        return <HomePage onNavigate={setCurrentPage} user={user} />;
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