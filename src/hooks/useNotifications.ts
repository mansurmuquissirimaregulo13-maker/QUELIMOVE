import { useState, useCallback } from 'react';

interface NotificationOptions {
    title: string;
    body: string;
    type?: 'info' | 'success' | 'warning' | 'error';
}

export const useNotifications = () => {
    const [enabled, setEnabledState] = useState(() => {
        return localStorage.getItem('notifications_enabled') === 'true';
    });

    const setEnabled = useCallback((value: boolean) => {
        setEnabledState(value);
        localStorage.setItem('notifications_enabled', String(value));

        if (value && 'Notification' in window) {
            Notification.requestPermission();
        }
    }, []);

    const notify = useCallback(({ title, body, type = 'info' }: NotificationOptions) => {
        if (!enabled) return;

        // Simulação de Notificação de Sistema se tiver permissão
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body });
        }

        // Feedback visual na UI (poderia ser um Toast mais complexo)
        console.log(`[Notification] ${title}: ${body}`);
        // Aqui poderíamos disparar um evento global para um componente Toast
    }, [enabled]);

    return { enabled, setEnabled, notify };
};
