import React from 'react';
import { supabase } from './lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Profile, UserProfile } from './types';
import { HomePage } from './pages/HomePage';
import { RideRequestPage } from './pages/RideRequestPage';
import { DriverRegistrationPage } from './pages/DriverRegistrationPage';
import { ContactPage } from './pages/ContactPage';
import { DriverDashboardPage } from './pages/DriverDashboardPage';
import { DriverRidesPage } from './pages/DriverRidesPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { InstallPrompt } from './components/InstallPrompt';
import { SplashScreen } from './components/SplashScreen';

function AppContent() {
  /* Splash Screen State */
  const [showSplash, setShowSplash] = React.useState(true);

  /* App State */
  const [currentPage, setCurrentPage] = React.useState<string>('home');
  const [user, setUser] = React.useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('user_profile');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error('Failed to parse user_profile', e);
      localStorage.removeItem('user_profile');
      return null;
    }
  });

  const isInitialized = React.useRef(false);

  React.useEffect(() => {
    let subscription: RealtimeChannel | null = null;

    const initializeAuth = async () => {
      try {
        // 1. Initial auth check
        const { data: authData, error: sessionError } = await supabase.auth.getSession();
        const session = authData?.session;

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
            setUser(userData);
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
                  const updated = payload.new as Profile;
                  const newUserData = {
                    ...updated,
                    name: updated.full_name
                  };

                  setUser(prev => {
                    const prevStatus = prev?.status;
                    if (updated.status === 'active' && prevStatus === 'pending') {
                      // Use a direct update - AppContent's stable structure will handle this better
                      setCurrentPage('driver-dash');
                    }
                    return newUserData;
                  });
                  localStorage.setItem('user_profile', JSON.stringify(newUserData));
                }
              )
              .subscribe();
          } else {
            // Session exists but NO Profile (Broken state or Sync issue)
            console.warn('Session active but Profile missing. Improving robustness...');

            // Create a temporary user object from Session checks
            const tempUser = {
              id: session.user.id,
              full_name: session.user.user_metadata?.full_name || 'Usuário',
              name: session.user.user_metadata?.full_name || 'Usuário',
              role: (session.user.user_metadata?.role || 'user') as 'user' | 'driver' | 'admin',
              phone: session.user.user_metadata?.phone || session.user.phone,
              email: session.user.email,
              status: 'active' as const
            };

            // Allow them to proceed as "user" (passenger) if generic, or force onboarding if critical data missing
            setUser(tempUser as UserProfile);

            // Use role from metadata if available to route
            if (tempUser.role === 'driver') {
              setCurrentPage('driver-dash');
            } else {
              // Default to ride, but Onboarding might intercept if we invoke handleRegister logic
              setCurrentPage('ride');
            }
          }
        } else {
          // No session
          setUser(null);
          localStorage.removeItem('user_profile');
        }
      } finally {
        // Ensure atomic update of splash screen state
        if (!isInitialized.current) {
          isInitialized.current = true;
          // Use a requestAnimationFrame to delay splash removal until after next paint
          requestAnimationFrame(() => {
            setTimeout(() => {
              // Component might have unmounted during the timeout
              setShowSplash(false);
            }, 800);
          });
        }
      }
    };

    initializeAuth();

    // 3. Listen for Auth State Changes (Login/Logout)
    const { data: authData } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);
      if (event === 'SIGNED_IN' && session) {
        // Re-run initialization to fetch profile and setup listeners
        initializeAuth();
      } else if (event === 'SIGNED_OUT') {
        // Cleanup: Set driver offline if possible (best effort)
        const profileStr = localStorage.getItem('user_profile');
        if (profileStr) {
          try {
            const profile = JSON.parse(profileStr);
            if (profile.role === 'driver' && profile.id) {
              // Attempt to set offline logic handled in components usually
            }
          } catch (e) {
            console.error('Failed to parse profile for cleanup', e);
          }
        }

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
      if (authData?.subscription) {
        authData.subscription.unsubscribe();
      }
      if (subscription) supabase.removeChannel(subscription);
    };
  }, []);


  const handleRegister = async (userData: { name: string; age?: number; role?: string }) => {
    // Persist user with role
    const profile = { ...userData, role: userData.role || 'user' };
    localStorage.setItem('user_profile', JSON.stringify(profile));

    // CRITICAL FIX: Ensure this profile exists in Supabase
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        const { error } = await supabase.from('profiles').upsert({
          id: session.user.id,
          full_name: userData.name,
          role: userData.role || 'user',
          phone: session.user.user_metadata?.phone || session.user.phone, // Fallback to session phone
          status: (userData.role === 'driver') ? 'pending' : 'active',
          updated_at: new Date().toISOString()
        });

        if (error) console.error('Failed to sync profile to DB:', error);
      }
    } catch (err) {
      console.error('Error syncing profile:', err);
    }

    setUser(profile as UserProfile);

    if (profile.role === 'driver') {
      setCurrentPage('driver-dash');
    } else {
      setCurrentPage('ride');
    }
  };

  const renderPage = () => {
    // Verificação de Admin
    const isAdminAuthenticated = localStorage.getItem('admin_session') === 'true';

    // Se estiver autenticado, aplica redirecionamento automático estrito
    if (user) {
      const userProfile = user;
      if (userProfile.role === 'driver') {
        // Motoristas aprovados ou em análise serão redirecionados para o dashboard
        // O Dashboard controlará a exibição de "Em Análise" internamente com cache local para evitar flash
        if (currentPage !== 'driver-dash' && currentPage !== 'profile' && currentPage !== 'contact' && currentPage !== 'earnings') {
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
        // Também permitimos acesso ao registo de motorista caso queiram fazer upgrade
        if ((currentPage === 'home') && !currentPage.startsWith('admin')) {
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
              const newProfile = { ...currentProfile, role: 'admin', email: adminEmail } as UserProfile;
              localStorage.setItem('user_profile', JSON.stringify(newProfile));
              setUser(newProfile);
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
      case 'earnings':
        return <DriverRidesPage onNavigate={setCurrentPage} />;
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
    <div
      className="relative h-[100dvh] w-screen overflow-hidden bg-[var(--bg-primary)] notranslate"
      translate="no"
    >
      <AnimatePresence mode="wait">
        {showSplash ? (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-[9999]"
          >
            <SplashScreen />
          </motion.div>
        ) : (
          <motion.div
            key="main-content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full relative"
          >
            <InstallPrompt />
            <div className="w-full h-full overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPage}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.3 }}
                  className="w-full h-full"
                >
                  {renderPage()}
                </motion.div>
              </AnimatePresence>
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