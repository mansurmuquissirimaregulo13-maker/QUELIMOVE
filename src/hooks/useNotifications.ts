import { useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { PushNotifications, Token } from '@capacitor/push-notifications';
import { supabase } from '../lib/supabase';

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

    const updateFcmToken = useCallback(async (token: string) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
            const { error } = await supabase
                .from('profiles')
                .update({ fcm_token: token })
                .eq('id', session.user.id);

            if (error) console.error('Error updating FCM token:', error);
            else console.log('FCM token updated successfully');
        }
    }, []);

    const setupPushNotifications = useCallback(async () => {
        if (!isNative) return;

        console.log('Checking push permissions...');
        let permStatus = await PushNotifications.checkPermissions();

        if (permStatus.receive === 'prompt') {
            permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== 'granted') {
            alert('PERMISSÃO DE NOTIFICAÇÃO NEGADA: Por favor, ativa as notificações nas definições do teu iPhone para o Quelimove.');
            return;
        }

        console.log('Registering for push...');
        await PushNotifications.register();

        // On success, we should be able to receive notifications
        PushNotifications.addListener('registration', (token: Token) => {
            console.log('Push registration success, token: ' + token.value);
            alert('NOTIFICAÇÕES ATIVADAS: O teu código de envio foi registado com sucesso!');
            updateFcmToken(token.value);
        });

        // Some issue with our setup and push will not work
        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('Error on registration: ' + JSON.stringify(error));
            alert('ERRO DE REGISTO: ' + JSON.stringify(error));
        });

        // Show us the notification payload if the app is open on our device
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push received: ' + JSON.stringify(notification));
        });

        // Method called when tapping on a notification
        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
            console.log('Push action performed: ' + JSON.stringify(notification));
        });
    }, [isNative, updateFcmToken]);

    const setEnabled = useCallback(async (value: boolean) => {
        setEnabledState(value);
        localStorage.setItem('notifications_enabled', String(value));

        // Persistir no Supabase
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
            await supabase
                .from('profiles')
                .update({ notifications_enabled: value })
                .eq('id', session.user.id);
        }

        if (value) {
            if (isNative) {
                await setupPushNotifications();
            } else if ('Notification' in window) {
                Notification.requestPermission();
            }
        }
    }, [isNative, setupPushNotifications]);

    // Re-check registration on mount if enabled
    useEffect(() => {
        if (enabled && isNative) {
            setupPushNotifications();
        }
    }, [enabled, isNative, setupPushNotifications]);

    const notify = useCallback(async ({ title, body }: NotificationOptions) => {
        if (!enabled) return;

        if (isNative) {
            // Notificação Local (Fallback se o push falhar ou para feedback imediato)
            await LocalNotifications.schedule({
                notifications: [
                    {
                        title,
                        body,
                        id: Math.floor(Math.random() * 10000),
                        schedule: { at: new Date(Date.now() + 100) },
                        sound: 'beep.wav'
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
