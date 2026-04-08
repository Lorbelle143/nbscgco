import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';

const CAMPUS = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcROE3tdSJOhol7z2c9L5Y6Sawh5ZmEU7GT8Dg&s";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockout, setLockout] = useState<number | null>(null);
  const navigate = useNavigate();
  const { setUser, setIsAdmin } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (lockout && Date.now() < lockout) {
      setError(`Too many failed attempts. Try again in ${Math.ceil((lockout - Date.now()) / 1000)}s.`);
      return;
    }
    setLoading(true);
    try {
      const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle();
      if (profile?.id && supabaseAdmin) {
        try { await supabaseAdmin.auth.admin.updateUserById(profile.id, { email_confirm: true }); } catch (_) {}
      }
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        const n = attempts + 1; setAttempts(n);
        if (n >= 5) { setLockout(Date.now() + 30000); setAttempts(0); setError('Too many failed attempts. Please wait 30 seconds.'); setLoading(false); return; }
        setError('Incorrect email or password. Please try again.'); setLoading(false); return;
      }
      if (data.user) {
        const { data: fp, error: fe } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle();
        if (fe || !fp) { setError('Your account was deleted. Please contact the administrator.'); await supabase.auth.signOut(); setLoading(false); return; }
        if (fp.pending_password) {
          try {
            const { error: pe } = await supabase.auth.updateUser({ password: fp.pending_password });
            if (pe) { await supabase.auth.signOut(); setError('Failed to apply your new password. Please contact the administrator.'); setLoading(false); return; }
            await supabase.from('profiles').update({ pending_password: null }).eq('id', data.user.id);
          } catch { await supabase.auth.signOut(); setError('An error occurred. Please try again.'); setLoading(false); return; }
        }
        await supabase.from('profiles').update({ last_login: new Date().toISOString() }).eq('id', data.user.id);
        setUser(data.user); setIsAdmin(false); navigate('/dashboard');
      }
    } catch (err: any) { setError('Login failed: ' + (err.message || 'Unknown error')); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#05080f] flex antialiased">
      <style>{`
        @keyframes fu{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shimmer{0%{background-position:-300% center}100%{background-position:300% center}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        .a0{animation:fu .6s cubic-bezier(.22,1,.36,1) both}
        .a1{animation:fu .6s cubic-bezier(.22,1,.36,1) .08s both}
        .a2{animation:fu .6s cubic-bezier(.22,1,.36,1) .16s both}
        .a3{animation:fu .6s cubic-bezier(.22,1,.36,1) .24s both}
        .a4{animation:fu .6s cubic-bezier(.22,1,.36,1) .32s both}
        .a5{animation:fu .6s cubic-bezier(.22,1,.36,1) .40s both}
        .gt{
          background:linear-gradient(120deg,#93c5fd,#818cf8,#c4b5fd,#93c5fd);
          background-size:300% auto;
          -webkit-background-clip:text;-webkit-text-fill-color:transparent;
          background-clip:text;animation:shimmer 5s linear infinite;
        }
        .blink{animation:blink 2.5s ease-in-out infinite}
        .float{animation:floatY 6s ease-in-out infinite}
        .inp{
          width:100%;padding:12px 14px 12px 44px;
          border:1px solid rgba(255,255,255,.1);border-radius:12px;
          font-size:14px;background:rgba(255,255,255,.05);color:#fff;outline:none;
          transition:all .2s;
        }
        .inp::placeholder{color:rgba(255,255,255,.3)}
        .inp:focus{
          border-color:rgba(99,102,241,.6);
          background:rgba(99,102,241,.08);
          box-shadow:0 0 0 3px rgba(99,102,241,.15);
        }
        .sbtn{
          width:100%;padding:13px;border:none;border-radius:12px;
          font-size:15px;font-weight:700;color:#fff;cursor:pointer;
          background:linear-gradient(135deg,#4f46e5,#2563eb);
          box-shadow:0 4px 24px rgba(79,70,229,.5);
          transition:all .25s;position:relative;overflow:hidden;
        }
        .sbtn::before{
          content:'';position:absolute;inset:0;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);
          transform:translateX(-100%);transition:transform .5s;
        }
        .sbtn:hover:not(:disabled)::before{transform:translateX(100%)}
        .sbtn:hover:not(:disabled){box-shadow:0 8px 32px rgba(79,70,229,.65);transform:translateY(-2px)}
        .sbtn:disabled{opacity:.5;cursor:not-allowed}
      `}</style>

      {/* ── Left: Campus image panel ── */}
      <div className="hidden lg:flex lg:w-[52%] relative overflow-hidden flex-col">
        {/* Campus image */}
        <img src={CAMPUS} alt="NBSC Campus" className="absolute inset-0 w-full h-full object-cover"/>
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#05080f]/85 via-blue-950/70 to-indigo-950/80"/>
        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-2/3 bg-gradient-to-t from-[#05080f] via-[#05080f]/60 to-transparent"/>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full p-12">
          {/* Top: brand */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/30 rounded-xl blur-lg"/>
              <img src="/nbsc-logo.png" alt="NBSC" className="relative w-10 h-10 object-contain"/>
            </div>
            <div>
              <p className="text-[10px] text-blue-400/70 font-bold tracking-[.2em] uppercase">NBSC</p>
              <p className="text-sm font-bold text-white/90">Guidance &amp; Counseling</p>
            </div>
          </div>

          {/* Middle: headline */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20
              text-blue-300 text-[11px] font-bold px-3 py-1 rounded-full mb-6 w-fit tracking-widest uppercase">
              <span className="blink w-1.5 h-1.5 bg-blue-400 rounded-full"/>
              Student Portal
            </div>
            <h1 className="text-4xl font-black leading-tight mb-4">
              Your Guidance<br/>
              <span className="gt">Journey Starts</span><br/>
              <span className="gt">Here</span>
            </h1>
            <p className="text-gray-400 text-[15px] leading-relaxed max-w-sm">
              Access counseling services, mental health assessments, and guidance support at Northern Bukidnon State College.
            </p>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-2 mt-8">
              {['🧠 Mental Health','💬 Counseling','📊 Progress Tracking','🔒 Secure'].map(f=>(
                <span key={f} className="text-[12px] text-gray-400 bg-white/[0.05] border border-white/[0.08] px-3 py-1.5 rounded-full">
                  {f}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom: logo */}
          <div className="flex items-center gap-3 mt-auto">
            <div className="float w-12 h-12 bg-white/[0.06] border border-white/[0.1] rounded-xl flex items-center justify-center">
              <img src="/logo.png" alt="GCO" className="w-9 h-9 object-contain"/>
            </div>
            <div>
              <p className="text-xs font-semibold text-white/70">GCO Management System</p>
              <p className="text-[11px] text-gray-600">Kihare, Manolo Fortich, Bukidnon</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right: Form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative">
        {/* Subtle blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600/8 rounded-full blur-3xl pointer-events-none"/>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-600/6 rounded-full blur-3xl pointer-events-none"/>

        <div className="relative w-full max-w-[380px]">

          {/* Mobile brand */}
          <div className="flex lg:hidden items-center gap-3 mb-8 a0">
            <img src="/nbsc-logo.png" alt="NBSC" className="w-9 h-9 object-contain"/>
            <div>
              <p className="text-[10px] text-blue-400/70 font-bold tracking-widest uppercase">NBSC</p>
              <p className="text-sm font-bold text-white/90">Guidance &amp; Counseling</p>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-8 a0">
            <h2 className="text-[28px] font-black text-white mb-1.5">Welcome back</h2>
            <p className="text-gray-500 text-[14px]">Sign in to your student account to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="a0 mb-5 flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-[13px]">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div className="a1">
              <label className="block text-[13px] font-semibold text-gray-400 mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                </div>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
                  className="inp" placeholder="yourname@gmail.com" required/>
              </div>
            </div>

            {/* Password */}
            <div className="a2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] font-semibold text-gray-400">Password</label>
                <Link to="/forgot-password" className="text-[12px] text-indigo-400 hover:text-indigo-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                  </svg>
                </div>
                <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)}
                  className="inp" style={{paddingRight:'44px'}} placeholder="Enter your password" required/>
                <button type="button" onClick={()=>setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-300 transition-colors p-1">
                  {showPw
                    ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Submit */}
            <div className="a3 pt-1">
              <button type="submit" disabled={loading} className="sbtn">
                {loading
                  ? <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Signing in...
                    </span>
                  : 'Sign In'
                }
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="a4 flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/[0.07]"/>
            <span className="text-[11px] text-gray-700 font-medium">OR</span>
            <div className="flex-1 h-px bg-white/[0.07]"/>
          </div>

          {/* Register link */}
          <div className="a4 text-center">
            <p className="text-[13px] text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                Create one now
              </Link>
            </p>
          </div>

          {/* Back to home */}
          <div className="a5 text-center mt-6 pt-5 border-t border-white/[0.06]">
            <Link to="/" className="inline-flex items-center gap-1.5 text-[12px] text-gray-700 hover:text-gray-400 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              Back to Home
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
