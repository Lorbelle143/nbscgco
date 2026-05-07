import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] bg-red-600 text-white text-center text-sm font-semibold py-2 px-4 flex items-center justify-center gap-2">
      <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M8.464 15.536a5 5 0 010-7.072M5.636 18.364a9 9 0 010-12.728" />
      </svg>
      You are offline. Some features may not work until your connection is restored.
    </div>
  );
}
