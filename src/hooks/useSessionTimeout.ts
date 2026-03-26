import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const TIMEOUT_DURATION = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE = 60 * 1000;         // warn 1 minute before

// Global callback so components can subscribe to the warning
type WarningCallback = (secondsLeft: number) => void;
let warningListeners: WarningCallback[] = [];
export function onSessionWarning(cb: WarningCallback) {
  warningListeners.push(cb);
  return () => { warningListeners = warningListeners.filter(l => l !== cb); };
}

export function useSessionTimeout() {
  const navigate = useNavigate();
  const { signOut, user } = useAuthStore();
  const timeoutRef = useRef<number | null>(null);
  const warningRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);

  const clearAll = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const resetTimeout = useCallback(() => {
    clearAll();
    // Dismiss any active warning
    warningListeners.forEach(cb => cb(0));

    warningRef.current = window.setTimeout(() => {
      // Start countdown
      let secondsLeft = Math.round(WARNING_BEFORE / 1000);
      warningListeners.forEach(cb => cb(secondsLeft));
      countdownRef.current = window.setInterval(() => {
        secondsLeft -= 1;
        warningListeners.forEach(cb => cb(secondsLeft));
      }, 1000);
    }, TIMEOUT_DURATION - WARNING_BEFORE);

    timeoutRef.current = window.setTimeout(async () => {
      clearAll();
      warningListeners.forEach(cb => cb(0));
      if (user) {
        await signOut();
        navigate('/login');
      }
    }, TIMEOUT_DURATION);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(e => document.addEventListener(e, resetTimeout));
    resetTimeout();
    return () => {
      events.forEach(e => document.removeEventListener(e, resetTimeout));
      clearAll();
    };
  }, [user, resetTimeout]);
}
