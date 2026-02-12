import { useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

interface NotificationOptions {
    title: string;
    body: string;
    type?: 'info' | 'success' | 'warning' | 'error';
}

export const useNotifications = () => {
    const isNative = Capacitor.isNativePlatform();

    const [enabled, setEnabledState] = useState(() => {
        return localStorage.getItem('notifications_enabled') === 'true';
    });

    const setEnabled = useCallback(async (value: boolean) => {
        setEnabledState(value);
        localStorage.setItem('notifications_enabled', String(value));

        if (value) {
            if (isNative) {
                const res = await LocalNotifications.requestPermissions();
                console.log('Local Notifications Permission:', res.display);
            } else if ('Notification' in window) {
                Notification.requestPermission();
            }
        }
    }, [isNative]);

    const notify = useCallback(async ({ title, body }: NotificationOptions) => {
        if (!enabled) return;

        if (isNative) {
            // Notificação Nativa (Barra do Sistema)
            await LocalNotifications.schedule({
                notifications: [
                    {
                        title,
                        body,
                        id: Math.floor(Math.random() * 10000),
                        schedule: { at: new Date(Date.now() + 100) },
                        sound: 'beep.wav',
                        attachments: [],
                        actionTypeId: '',
                        extra: null
                    }
                ]
            });
        } else {
            // Notificação Web
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(title, { body });
            }
        }

        console.log(`[Notification] ${title}: ${body}`);
    }, [enabled, isNative]);

    return { enabled, setEnabled, notify };
};
