import { useEffect, useState } from 'react';
import { onSessionWarning } from '../hooks/useSessionTimeout';

export default function SessionWarningModal() {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    return onSessionWarning((s) => setSecondsLeft(s));
  }, []);

  // Extend session by simulating user activity
  const handleStayLoggedIn = () => {
    document.dispatchEvent(new MouseEvent('mousedown'));
    setSecondsLeft(0);
  };

  if (secondsLeft <= 0) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center border-2 border-amber-200">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Session Expiring Soon</h3>
        <p className="text-gray-500 text-sm mb-4">
          You'll be automatically logged out due to inactivity in
        </p>
        <div className="text-5xl font-black text-amber-500 mb-6">{secondsLeft}s</div>
        <button
          onClick={handleStayLoggedIn}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-md mb-3"
        >
          Stay Logged In
        </button>
        <p className="text-xs text-gray-400">Or move your mouse / press any key to stay logged in</p>
      </div>
    </div>
  );
}
