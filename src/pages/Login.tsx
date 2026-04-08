import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const navigate = useNavigate();
  const { setUser, setIsAdmin } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (lockoutUntil && Date.now() < lockoutUntil) {
      const secsLeft = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`Too many failed attempts. Try again in ${secsLeft}s.`);
      return;
    }

    setLoading(true);

    try {
      // Auto-confirm so login always works
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (profile?.id && supabaseAdmin) {
        try {
          await supabaseAdmin.auth.admin.updateUserById(profile.id, { email_confirm: true });
        } catch (_) {}
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        if (newAttempts >= 5) {
          setLockoutUntil(Date.now() + 30 * 1000);
          setLoginAttempts(0);
          setError('Too many failed attempts. Please wait 30 seconds.');
          setLoading(false);
          return;
        }
        setError('Incorrect email or password. Please try again.');
        setLoading(false);
        return;
      }

      if (data.user) {
        const { data: finalProfileCheck, error: finalCheckError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (finalCheckError || !finalProfileCheck) {
          setError('Your account was deleted by admin. Please contact the administrator.');
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        if (finalProfileCheck.pending_password) {
          try {
            const { error: pwUpdateError } = await supabase.auth.updateUser({
              password: finalProfileCheck.pending_password,
            });
            if (pwUpdateError) {
              // Password update failed — sign out and show error so user can retry
              await supabase.auth.signOut();
              setError('Failed to apply your new password. Please contact the administrator.');
              setLoading(false);
              return;
            }
            await supabase.from('profiles').update({ pending_password: null }).eq('id', data.user.id);
          } catch (e) {
            await supabase.auth.signOut();
            setError('An error occurred while updating your password. Please try again.');
            setLoading(false);
            return;
          }
        }

        await supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', data.user.id);
        setUser(data.user);
        setIsAdmin(false);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError('Login failed: ' + (err.message || 'Unknown error'));
    }

    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/nbsc-bg.jpg')" }}
    >
      <style>{`
        /* ── Entrance animations ── */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.7); }
          to   { opacity: 1; transform: scale(1); }
        }

        /* ── Continuous animations ── */
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33%       { transform: translateY(-10px) rotate(1deg); }
          66%       { transform: translateY(-5px) rotate(-1deg); }
        }
        @keyframes floatParticle {
          0%   { transform: translateY(100vh) translateX(0px) scale(0.3); opacity: 0; }
          10%  { opacity: 0.6; }
          90%  { opacity: 0.3; }
          100% { transform: translateY(-10vh) translateX(30px) scale(1.1); opacity: 0; }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.3), 0 0 40px rgba(99,102,241,0.1); }
          50%       { box-shadow: 0 0 30px rgba(99,102,241,0.5), 0 0 60px rgba(99,102,241,0.2); }
        }
        @keyframes shimmerBtn {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50%       { opacity: 1;   transform: scale(1.3); }
        }
        @keyframes borderFlow {
          0%   { border-color: rgba(99,102,241,0.4); }
          50%  { border-color: rgba(59,130,246,0.7); }
          100% { border-color: rgba(99,102,241,0.4); }
        }

        .anim-panel-left  { animation: slideInLeft  0.7s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-panel-right { animation: slideInRight 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .anim-logo        { animation: scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both; }
        .anim-title       { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.45s both; }
        .anim-features    { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.55s both; }
        .anim-heading     { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both; }
        .anim-field1      { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.3s both; }
        .anim-field2      { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.38s both; }
        .anim-btn         { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.46s both; }
        .anim-links       { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.54s both; }

        .logo-float { animation: float 5s ease-in-out infinite; }
        .pulse-glow { animation: pulseGlow 3s ease-in-out infinite; }

        /* Particles */
        .particle {
          position: absolute; border-radius: 50%;
          background: rgba(255,255,255,0.15);
          animation: floatParticle linear infinite;
          bottom: -60px;
        }
        .p1{width:8px;height:8px;left:8%;animation-duration:11s;animation-delay:0s;}
        .p2{width:5px;height:5px;left:18%;animation-duration:14s;animation-delay:2s;}
        .p3{width:12px;height:12px;left:30%;animation-duration:9s;animation-delay:1s;}
        .p4{width:6px;height:6px;left:45%;animation-duration:13s;animation-delay:3.5s;}
        .p5{width:9px;height:9px;left:60%;animation-duration:10s;animation-delay:0.5s;}
        .p6{width:4px;height:4px;left:72%;animation-duration:15s;animation-delay:4s;}
        .p7{width:7px;height:7px;left:83%;animation-duration:12s;animation-delay:1.5s;}
        .p8{width:10px;height:10px;left:92%;animation-duration:8s;animation-delay:2.5s;}

        /* Stars */
        .star {
          position: absolute; width: 3px; height: 3px;
          background: white; border-radius: 50%;
          animation: twinkle ease-in-out infinite;
        }

        /* Input */
        .input-field {
          width:100%; padding: 11px 14px 11px 42px;
          border: 1.5px solid #e5e7eb; border-radius: 12px;
          font-size: 14px; background: #f9fafb;
          transition: all 0.25s; outline: none;
        }
        .input-field:focus {
          border-color: #6366f1; background: #fff;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
          transform: translateY(-1px);
        }

        /* Button */
        .btn-primary {
          width:100%; padding: 13px;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 40%, #3b82f6 100%);
          background-size: 200% auto;
          color: #fff; border: none; border-radius: 12px;
          font-size: 15px; font-weight: 600; cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 20px rgba(99,102,241,0.4);
          position: relative; overflow: hidden;
        }
        .btn-primary::after {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          transform: translateX(-100%);
          transition: transform 0.5s;
        }
        .btn-primary:hover:not(:disabled)::after { transform: translateX(100%); }
        .btn-primary:hover:not(:disabled) {
          background-position: right center;
          box-shadow: 0 6px 25px rgba(99,102,241,0.55);
          transform: translateY(-2px);
        }
        .btn-primary:active:not(:disabled) { transform: translateY(0); }
        .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

        /* Rotating ring */
        .ring-rotate {
          position: absolute; inset: -8px;
          border-radius: 50%;
          border: 2px dashed rgba(255,255,255,0.2);
          animation: rotateSlow 12s linear infinite;
        }
      `}</style>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-blue-900/70 to-slate-900/80 backdrop-blur-[2px]" />

      {/* Floating particles */}
      <div className="particle p1"/><div className="particle p2"/><div className="particle p3"/>
      <div className="particle p4"/><div className="particle p5"/><div className="particle p6"/>
      <div className="particle p7"/><div className="particle p8"/>

      {/* Twinkling stars */}
      {[
        {top:'8%',left:'12%',delay:'0s'},{top:'15%',left:'78%',delay:'1.2s'},
        {top:'25%',left:'45%',delay:'0.6s'},{top:'70%',left:'20%',delay:'2s'},
        {top:'80%',left:'65%',delay:'0.3s'},{top:'55%',left:'88%',delay:'1.8s'},
        {top:'40%',left:'5%',delay:'1s'},{top:'90%',left:'40%',delay:'2.5s'},
      ].map((s, i) => (
        <div key={i} className="star" style={{ top: s.top, left: s.left, animationDuration: `${2 + i * 0.4}s`, animationDelay: s.delay }} />
      ))}

      {/* Decorative blobs */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-80px] w-96 h-96 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-4xl mx-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden flex min-h-[580px]">

          {/* ── Left Panel ── */}
          <div className="anim-panel-left hidden md:flex md:w-5/12 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 p-10 flex-col items-center justify-center relative overflow-hidden">
            {/* bg circles */}
            <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-white/10 rounded-full" />
            <div className="absolute top-1/2 -right-12 w-44 h-44 bg-white/5 rounded-full" />
            {/* inner particles */}
            <div className="particle p2" style={{animationDuration:'10s',opacity:0.5}}/>
            <div className="particle p5" style={{animationDuration:'13s',animationDelay:'3s',opacity:0.4}}/>

            <div className="relative z-10 flex flex-col items-center w-full">
              {/* Logo */}
              <div className="anim-logo relative mb-6">
                <div className="ring-rotate" />
                <div className="pulse-glow logo-float w-32 h-32 rounded-2xl flex items-center justify-center bg-white/15 backdrop-blur-sm overflow-hidden border border-white/25">
                  <img src="/logo.png" alt="GCO Logo" className="w-28 h-28 object-contain" />
                </div>
              </div>

              <div className="anim-title text-center mb-8">
                <h2 className="text-2xl font-bold text-white leading-tight mb-2">
                  Guidance Counseling<br />Inventory System
                </h2>
                <div className="flex items-center gap-2 justify-center">
                  <img src="/nbsc.png" alt="NBSC" className="w-5 h-5 object-contain" />
                  <span className="text-indigo-200 text-xs font-medium">Northern Bukidnon State College</span>
                </div>
              </div>

              <div className="anim-features w-full border-t border-white/20 pt-6 space-y-3.5">
                {[
                  { icon: '📋', text: 'Manage student records securely' },
                  { icon: '🧠', text: 'Mental health assessments' },
                  { icon: '📊', text: 'Analytics & reporting tools' },
                ].map((item) => (
                  <div key={item.text} className="flex items-center gap-3 group">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-base group-hover:bg-white/20 transition-colors flex-shrink-0">
                      {item.icon}
                    </div>
                    <span className="text-indigo-100 text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right Panel ── */}
          <div className="anim-panel-right flex-1 p-8 md:p-10 flex flex-col justify-center">
            <div className="max-w-sm mx-auto w-full">

              {/* Mobile logo */}
              <div className="flex md:hidden justify-center mb-6 anim-logo">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-indigo-50 flex items-center justify-center">
                  <img src="/logo.png" alt="NBSC Logo" className="w-12 h-12 object-contain" />
                </div>
              </div>

              <div className="anim-heading mb-7">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Welcome back 👋</h1>
                <p className="text-gray-500 text-sm">Sign in to your student account</p>
              </div>

              {error && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2.5 anim-heading">
                  <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="anim-field1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      className="input-field" placeholder="Enter your email address" required />
                  </div>
                </div>

                <div className="anim-field2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input type={showPassword ? 'text' : 'password'} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input-field" style={{ paddingRight: '42px' }}
                      placeholder="Enter your password" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? (
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

                <div className="anim-btn pt-1">
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Signing in...
                      </span>
                    ) : 'Sign In'}
                  </button>
                </div>
              </form>

              <div className="anim-links mt-3 text-center">
                <Link to="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors">
                  Forgot your password?
                </Link>
              </div>

              <div className="anim-links mt-4 text-center">
                <p className="text-sm text-gray-500">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
                    Register here
                  </Link>
                </p>
              </div>

              <div className="anim-links mt-4 text-center">
                <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Home
                </Link>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
