import React, { createContext, useContext, useState } from 'react';

type Language = 'pt' | 'en';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const translations = {
    pt: {
        'profile.title': 'Meu Perfil',
        'profile.edit': 'Editar Perfil',
        'profile.history': 'Histórico de Viagens',
        'profile.payments': 'Métodos de Pagamento',
        'profile.settings': 'Configurações',
        'settings.darkMode': 'Modo Escuro',
        'settings.darkModeDesc': 'Alternar tema do App',
        'settings.language': 'Idioma',
        'settings.notifications': 'Notificações',
        'settings.deleteAccount': 'Apagar Conta',
        'common.save': 'Salvar Alterações',
        'common.back': 'Voltar'
    },
    en: {
        'profile.title': 'My Profile',
        'profile.edit': 'Edit Profile',
        'profile.history': 'Ride History',
        'profile.payments': 'Payment Methods',
        'profile.settings': 'Settings',
        'settings.darkMode': 'Dark Mode',
        'settings.darkModeDesc': 'Toggle app theme',
        'settings.language': 'Language',
        'settings.notifications': 'Notifications',
        'settings.deleteAccount': 'Delete Account',
        'common.save': 'Save Changes',
        'common.back': 'Back'
    }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(() => {
        return (localStorage.getItem('app_language') as Language) || 'pt';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem('app_language', lang);
    };

    const t = (key: string) => {
        return translations[language][key as keyof typeof translations['pt']] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
    return context;
};
