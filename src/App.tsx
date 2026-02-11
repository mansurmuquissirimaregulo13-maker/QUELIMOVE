import * as React from 'react';
import { MobileFrame } from './components/MobileFrame';
import { HomePage } from './pages/HomePage';
import { RideRequestPage } from './pages/RideRequestPage';
import { DriverRegistrationPage } from './pages/DriverRegistrationPage';
import { ContactPage } from './pages/ContactPage';
import { DriverDashboardPage } from './pages/DriverDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

function AppContent() {
  const [currentPage, setCurrentPage] = React.useState('home');
  const [user, setUser] = React.useState<{ name: string; age: number } | null>(() => {
    const saved = localStorage.getItem('user_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const { theme, toggleTheme } = useTheme();

  const handleRegister = (userData: { name: string; age: number }) => {
    localStorage.setItem('user_profile', JSON.stringify(userData));
    setUser(userData);
    setCurrentPage('home');
  };

  const renderPage = () => {
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
    <div className="relative min-h-screen transition-colors duration-300">
      <div className="absolute top-6 right-6 z-[1000]">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] shadow-lg hover:scale-110 transition-all"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>
      <MobileFrame>{renderPage()}</MobileFrame>
    </div>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}