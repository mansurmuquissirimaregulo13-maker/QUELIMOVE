import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// CONFIGURAÇÃO DO FIREBASE (Necessário preencher com dados do console.firebase.google.com)
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "SEU_PROJETO.firebaseapp.com",
    projectId: "SEU_PROJETO_ID",
    storageBucket: "SEU_PROJETO.appspot.com",
    messagingSenderId: "SEU_SENDER_ID",
    appId: "SEU_APP_ID"
};

// Guard against unconfigured Firebase
const isFirebaseConfigured = firebaseConfig.apiKey !== "SUA_API_KEY";

let app;
let messaging: any = null;

if (isFirebaseConfigured) {
    try {
        app = initializeApp(firebaseConfig);
        messaging = typeof window !== 'undefined' ? getMessaging(app) : null;
    } catch (err) {
        console.error('Firebase initialization failed:', err);
    }
} else {
    console.warn('Firebase is not configured. Notifications will not work.');
}

export { messaging };

export const requestForToken = async () => {
    if (!messaging || !isFirebaseConfigured) return null;
    try {
        const currentToken = await getToken(messaging, {
            vapidKey: 'SUA_VAPID_KEY_DO_FIREBASE'
        });
        if (currentToken) {
            console.log('FCM Token:', currentToken);
            return currentToken;
        } else {
            console.log('No registration token available. Request permission to generate one.');
            return null;
        }
    } catch (err) {
        console.log('An error occurred while retrieving token. ', err);
        return null;
    }
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        if (!messaging) return;
        onMessage(messaging, (payload) => {
            resolve(payload);
        });
    });

