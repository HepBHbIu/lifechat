let permission: NotificationPermission = 'default';

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') {
    permission = 'granted';
    return 'granted';
  }
  if (Notification.permission === 'denied') {
    permission = 'denied';
    return 'denied';
  }
  const result = await Notification.requestPermission();
  permission = result;
  return result;
}

export function getNotificationPermission(): NotificationPermission {
  if ('Notification' in window) {
    permission = Notification.permission;
  }
  return permission;
}

export function showNotification(title: string, body: string, icon?: string, onClick?: () => void) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const notif = new Notification(title, {
    body,
    icon: icon || '/favicon.svg',
    badge: '/favicon.svg',
    tag: 'chat-message',
    renotify: true,
    silent: false,
  } as NotificationOptions);

  if (onClick) {
    notif.onclick = () => {
      window.focus();
      onClick();
      notif.close();
    };
  }

  setTimeout(() => notif.close(), 8000);
}
