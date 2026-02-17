import * as React from 'react';
import { supabase } from './lib/supabase';
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
                      // Silently update and redirect - safer than alert()
                      setTimeout(() => setCurrentPage('driver-dash'), 500);
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
        // Delay extra para garantir que o DOM está pronto antes de remover o Splash
        setTimeout(() => setShowSplash(false), 800);
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
        // Cleanup: Set driver offline if possible (best effort)
        const profileStr = localStorage.getItem('user_profile');
        if (profileStr) {
          try {
            const profile = JSON.parse(profileStr);
            if (profile.role === 'driver' && profile.id) {
              // We can't use the session here as it's already gone, 
              // so we rely on RLS allowing the user to update their own profile 
              // or we might need an edge function. 
              // Actually, for "SIGNED_OUT", the session is null, so Supabase won't authenticate the request.
              // We should probably do this BEFORE calling signOut in the components.
              // However, as a failsafe, we can try to call an edge function or just rely on the component-level unmounts.
            }
          } catch (e) { }
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
        // Simplesmente verificamos se não é uma rota de admin
        if ((currentPage === 'home' || currentPage === 'driver-reg') && !currentPage.startsWith('admin')) {
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

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-[var(--bg-primary)]">
      <InstallPrompt />
      <div className="w-full h-full overflow-hidden">
        {renderPage()}
      </div>
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