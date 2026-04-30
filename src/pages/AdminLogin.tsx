import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

const LOCKOUT_KEY = 'admin_lockout';
const ATTEMPTS_KEY = 'admin_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutes

function getLockout() {
  const v = localStorage.getItem(LOCKOUT_KEY);
  return v ? parseInt(v) : null;
}
function getAttempts() {
  const v = localStorage.getItem(ATTEMPTS_KEY);
  return v ? parseInt(v) : 0;
}
function setLockoutStorage(until: number) {
  localStorage.setItem(LOCKOUT_KEY, String(until));
  localStorage.setItem(ATTEMPTS_KEY, '0');
}
function incrementAttempts() {
  const n = getAttempts() + 1;
  localStorage.setItem(ATTEMPTS_KEY, String(n));
  return n;
}
function clearAttempts() {
  localStorage.removeItem(LOCKOUT_KEY);
  localStorage.removeItem(ATTEMPTS_KEY);
}

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(getLockout);
  const [countdown, setCountdown] = useState(0);
  const navigate = useNavigate();
  const { setUser, setIsAdmin } = useAuthStore();

  useEffect(() => {
    if (!lockoutUntil) return;
    const tick = () => {
      const left = Math.ceil((lockoutUntil - Date.now()) / 1000);
      if (left <= 0) { setLockoutUntil(null); clearAttempts(); setError(''); }
      else setCountdown(left);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockoutUntil]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const currentLockout = getLockout();
    if (currentLockout && Date.now() < currentLockout) {
      setError(`Too many failed attempts. Try again in ${Math.ceil((currentLockout - Date.now()) / 1000)}s.`);
      return;
    }

    setLoading(true);

    // Artificial delay to slow brute force
    await new Promise(r => setTimeout(r, 600));

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        const n = incrementAttempts();
        if (n >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_DURATION;
          setLockoutStorage(until);
          setLockoutUntil(until);
          setError('Too many failed attempts. Please wait 5 minutes.');
        } else {
          setError('Incorrect email or password. Please try again.');
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // Check if this account has admin/staff access
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('is_admin, full_name')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError || !profile) {
          await supabase.auth.signOut();
          setError('Account not found. Please contact the administrator.');
          setLoading(false);
          return;
        }

        if (!profile.is_admin) {
          // Not an admin — sign them out and reject
          await supabase.auth.signOut();
          const n = incrementAttempts();
          if (n >= MAX_ATTEMPTS) {
            const until = Date.now() + LOCKOUT_DURATION;
            setLockoutStorage(until);
            setLockoutUntil(until);
            setError('Too many failed attempts. Please wait 5 minutes.');
          } else {
            setError('Access denied. This portal is for authorized staff only.');
          }
          setLoading(false);
          return;
        }

        // Valid admin/staff — allow in
        clearAttempts();
        await supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', data.user.id);
        setUser(data.user);
        setIsAdmin(true);
        navigate('/admin');
      }
    } catch (err: any) {
      setError('Login failed: ' + (err.message || 'Unknown error'));
    }

    setLoading(false);
  };

  const isLocked = lockoutUntil !== null && Date.now() < lockoutUntil;

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcROE3tdSJOhol7z2c9L5Y6Sawh5ZmEU7GT8Dg&s')" }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes scanLine {
          0%   { top: 0%; opacity: 0.6; }
          50%  { opacity: 1; }
          100% { top: 100%; opacity: 0.6; }
        }
        .fade-up    { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        .fade-up-d1 { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .fade-up-d2 { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both; }
        .fade-up-d3 { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.3s both; }
        .rotate-slow { animation: rotateSlow 12s linear infinite; }
        .scan-line {
          position: absolute; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(251,146,60,0.8), transparent);
          animation: scanLine 2.5s ease-in-out infinite;
        }
        .admin-input {
          width: 100%; padding: 11px 14px 11px 42px;
          border: 1.5px solid rgba(255,255,255,0.15);
          border-radius: 12px; font-size: 14px;
          background: rgba(255,255,255,0.07);
          color: #fff; outline: none;
          transition: all 0.2s;
        }
        .admin-input::placeholder { color: rgba(255,255,255,0.35); }
        .admin-input:focus {
          border-color: rgba(251,146,60,0.7);
          background: rgba(255,255,255,0.12);
          box-shadow: 0 0 0 3px rgba(251,146,60,0.15);
        }
        .btn-admin {
          width: 100%; padding: 12px;
          background: linear-gradient(135deg, #f97316 0%, #ea580c 50%, #dc2626 100%);
          background-size: 200% auto;
          color: #fff; border: none; border-radius: 12px;
          font-size: 15px; font-weight: 600; cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(249,115,22,0.4);
        }
        .btn-admin:hover:not(:disabled) {
          background-position: right center;
          box-shadow: 0 6px 22px rgba(249,115,22,0.55);
          transform: translateY(-1px);
        }
        .btn-admin:active:not(:disabled) { transform: translateY(0); }
        .btn-admin:disabled { opacity: 0.55; cursor: not-allowed; }
      `}</style>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-gray-900/72 to-slate-900/80 backdrop-blur-[2px]" />

      {/* Decorative blobs */}
      <div className="absolute top-[-100px] right-[-100px] w-96 h-96 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] left-[-80px] w-80 h-80 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />

      {/* Rotating ring decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-orange-500/8 rotate-slow pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-orange-500/6 pointer-events-none" style={{ animation: 'rotateSlow 18s linear infinite reverse' }} />

      <div className="relative w-full max-w-md mx-auto">
        <div className="bg-white/8 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/12 overflow-hidden">

          {/* Top accent bar */}
          <div className="h-1 bg-gradient-to-r from-orange-500 via-red-500 to-orange-400" />

          <div className="p-8 md:p-10">

            {/* Header */}
            <div className="flex flex-col items-center mb-8 fade-up">
              <div className="relative w-20 h-20 mb-5">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center justify-center overflow-hidden">
                  <div className="scan-line" />
                  <svg className="w-9 h-9 text-orange-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-1">
                <img src="/nbsc-logo.png" alt="NBSC" className="w-6 h-6 object-contain opacity-80" />
                <span className="text-orange-300 text-xs font-medium tracking-wider uppercase">NBSC — GCO</span>
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">Staff Access</h1>
              <p className="text-gray-400 text-sm">Sign in with your staff email to continue</p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 bg-red-500/15 border border-red-500/30 text-red-300 rounded-xl text-sm flex items-start gap-2.5 fade-up">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div className="fade-up-d1">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Staff Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="admin-input"
                    placeholder="gco@nbsc.edu.ph"
                    disabled={isLocked}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="fade-up-d1">
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="admin-input"
                    style={{ paddingRight: '42px' }}
                    placeholder="Enter your password"
                    disabled={isLocked}
                    required
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                    {showPw ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {isLocked && (
                <div className="fade-up text-center p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl">
                  <p className="text-orange-300 text-sm font-semibold">🔒 Access locked</p>
                  <p className="text-orange-400/70 text-xs mt-1">Try again in <span className="font-bold text-orange-300">{countdown}s</span></p>
                </div>
              )}

              <div className="fade-up-d2">
                <button type="submit" disabled={loading || isLocked} className="btn-admin">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Access Admin Panel
                    </span>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-6 text-center fade-up-d3">
              <Link to="/login" className="text-sm text-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Student Login
              </Link>
            </div>

          </div>
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          © {new Date().getFullYear()} Northern Bukidnon State College — Guidance & Counseling Office
        </p>
      </div>
    </div>
  );
}
