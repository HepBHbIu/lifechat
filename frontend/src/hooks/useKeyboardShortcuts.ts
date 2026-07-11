import { useEffect } from 'react';

interface KeyboardShortcuts {
  onSearch?: () => void;
  onEscape?: () => void;
  onNewChat?: () => void;
  onToggleSidebar?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K = Search
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        shortcuts.onSearch?.();
      }
      // Escape = Close panels
      if (e.key === 'Escape') {
        shortcuts.onEscape?.();
      }
      // Ctrl/Cmd + N = New chat
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        shortcuts.onNewChat?.();
      }
      // Ctrl/Cmd + B = Toggle sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        shortcuts.onToggleSidebar?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
