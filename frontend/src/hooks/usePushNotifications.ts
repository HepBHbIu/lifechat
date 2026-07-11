import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

export function usePushNotifications(token: string | null) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (!token || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      return;
    }

    setSupported(true);
    setPermission(Notification.permission);

    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((subscription) => {
        setSubscribed(!!subscription);
      });
    });
  }, [token]);

  const subscribe = useCallback(async () => {
    if (!token || !supported) return false;

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') return false;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: import.meta.env.VITE_VAPID_PUBLIC_KEY,
      });

      const sub = subscription.toJSON();
      await api.request('/push/subscribe', {
        method: 'POST',
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: sub.keys,
        }),
      });

      setSubscribed(true);
      return true;
    } catch (err) {
      console.error('Push subscription failed:', err);
      return false;
    }
  }, [token, supported]);

  const unsubscribe = useCallback(async () => {
    if (!token) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        const sub = subscription.toJSON();
        await api.request('/push/subscribe', {
          method: 'DELETE',
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await subscription.unsubscribe();
      }

      setSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe failed:', err);
    }
  }, [token]);

  return { supported, permission, subscribed, subscribe, unsubscribe };
}
