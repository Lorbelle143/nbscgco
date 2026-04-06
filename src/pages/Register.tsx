import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, supabaseAdmin } from '../lib/supabase';
import PasswordStrength from '../components/PasswordStrength';
import { notifyAdminNewRegistration } from '../utils/emailNotify';

export default function Register() {
  const [formData, setFormData] = useState({
    email: '', password: '', confirmPassword: '', fullName: '', studentId: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');

    if (!formData.email.endsWith('@nbsc.edu.ph')) {
      setEmailError('Email must end with @nbsc.edu.ph');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const checkClient = supabaseAdmin || supabase;
      const { data: existingProfile } = await checkClient
        .from('profiles').select('id').eq('student_id', formData.studentId).maybeSingle();

      if (existingProfile) {
        setError('This Student ID is already registered. Please use a different ID or contact the administrator.');
        setLoading(false);
        return;
      }

      // Use admin client to create user (auto-confirmed, no email verification needed)
      let userId: string | null = null;

      if (supabaseAdmin) {
        const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
          email: formData.email,
          password: formData.password,
          email_confirm: true,
          user_metadata: { full_name: formData.fullName, student_id: formData.studentId },
        });
        if (adminError) { setError('Registration failed: ' + adminError.message); setLoading(false); return; }
        userId = adminData.user?.id || null;
      } else {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: { data: { full_name: formData.fullName, student_id: formData.studentId } },
        });
        if (signUpError) { setError('Registration failed: ' + signUpError.message); setLoading(false); return; }
        userId = authData.user?.id || null;
      }

      if (!userId) { setError('Registration failed: No user created'); setLoading(false); return; }

      await new Promise(resolve => setTimeout(resolve, 500));

      // Insert profile directly
      const { error: profileError } = await (supabaseAdmin || supabase)
        .from('profiles')
        .insert({
          id: userId,
          email: formData.email,
          full_name: formData.fullName,
          student_id: formData.studentId,
          is_admin: false,
        });

      if (profileError && !profileError.message.includes('duplicate')) {
        setError('Profile creation failed: ' + profileError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      // Notify admin silently
      try {
        const { data: adminProfile } = await supabase
          .from('profiles').select('email').eq('is_admin', true).limit(1).single();
        if (adminProfile?.email) {
          notifyAdminNewRegistration(adminProfile.email, formData.fullName, formData.studentId, formData.email);
        }
      } catch (_) {}
      // Auto-redirect to login after 2 seconds
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError('Unexpected error: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/nbsc-bg.jpg')" }}
    >
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
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
        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50%       { opacity: 1; transform: scale(1.3); }
        }

        .anim-panel-left  { animation: slideInLeft  0.7s cubic-bezier(0.22,1,0.36,1) both; }
        .anim-panel-right { animation: slideInRight 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .anim-logo        { animation: scaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.3s both; }
        .anim-title       { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.45s both; }
        .anim-features    { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.55s both; }
        .anim-heading     { animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both; }
        .anim-field1      { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.28s both; }
        .anim-field2      { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.34s both; }
        .anim-field3      { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.40s both; }
        .anim-field4      { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.46s both; }
        .anim-field5      { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.52s both; }
        .anim-btn         { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.58s both; }
        .anim-links       { animation: fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) 0.64s both; }

        .logo-float { animation: float 5s ease-in-out infinite; }
        .pulse-glow { animation: pulseGlow 3s ease-in-out infinite; }

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

        .star {
          position: absolute; width: 3px; height: 3px;
          background: white; border-radius: 50%;
          animation: twinkle ease-in-out infinite;
        }

        .input-field {
          width:100%; padding: 10px 14px 10px 42px;
          border: 1.5px solid #e5e7eb; border-radius: 12px;
          font-size: 14px; background: #f9fafb;
          transition: all 0.25s; outline: none;
        }
        .input-field:focus {
          border-color: #6366f1; background: #fff;
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
          transform: translateY(-1px);
        }

        .btn-primary {
          width:100%; padding: 12px;
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

        .ring-rotate {
          position: absolute; inset: -8px; border-radius: 50%;
          border: 2px dashed rgba(255,255,255,0.2);
          animation: rotateSlow 12s linear infinite;
        }
      `}</style>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 via-blue-900/70 to-slate-900/80 backdrop-blur-[2px]" />

      {/* Particles */}
      <div className="particle p1"/><div className="particle p2"/><div className="particle p3"/>
      <div className="particle p4"/><div className="particle p5"/><div className="particle p6"/>
      <div className="particle p7"/><div className="particle p8"/>

      {/* Stars */}
      {[
        {top:'8%',left:'12%',delay:'0s'},{top:'15%',left:'78%',delay:'1.2s'},
        {top:'25%',left:'45%',delay:'0.6s'},{top:'70%',left:'20%',delay:'2s'},
        {top:'80%',left:'65%',delay:'0.3s'},{top:'55%',left:'88%',delay:'1.8s'},
        {top:'40%',left:'5%',delay:'1s'},{top:'90%',left:'40%',delay:'2.5s'},
      ].map((s, i) => (
        <div key={i} className="star" style={{ top: s.top, left: s.left, animationDuration: `${2 + i * 0.4}s`, animationDelay: s.delay }} />
      ))}

      {/* Blobs */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-80px] right-[-80px] w-96 h-96 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-4xl mx-auto">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl overflow-hidden flex min-h-[580px]">

          {/* ── Left Panel — Form ── */}
          <div className="anim-panel-left flex-1 p-8 md:p-10 flex flex-col justify-center overflow-y-auto">
            <div className="max-w-sm mx-auto w-full">

              {/* Mobile logo */}
              <div className="flex md:hidden justify-center mb-5 anim-logo">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-indigo-50 flex items-center justify-center">
                  <img src="/logo.png" alt="NBSC Logo" className="w-12 h-12 object-contain" />
                </div>
              </div>

              <div className="anim-heading mb-5">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">Create account</h1>
                <p className="text-gray-500 text-sm">Register with your NBSC student credentials</p>
              </div>

              {success ? (
                <div className="space-y-5 anim-heading">
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-green-800 mb-2">Account created!</h3>
                    <p className="text-sm text-green-700">Redirecting you to login...</p>
                  </div>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2.5 anim-heading">
                      <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleRegister} className="space-y-3.5">
                    {/* Full Name */}
                    <div className="anim-field1">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <input type="text" name="fullName" value={formData.fullName} onChange={handleChange}
                          className="input-field" placeholder="Enter your full name" required />
                      </div>
                    </div>

                    {/* Student ID */}
                    <div className="anim-field2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Student ID</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                          </svg>
                        </div>
                        <input type="text" name="studentId" value={formData.studentId} onChange={handleChange}
                          className="input-field" placeholder="Enter your student ID" required />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="anim-field3">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">NBSC Institutional Email</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <input type="email" name="email" value={formData.email} onChange={handleChange}
                          placeholder="studentid@nbsc.edu.ph"
                          className={`input-field ${emailError ? 'border-red-400' : ''}`} required />
                      </div>
                      {emailError
                        ? <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>{emailError}</p>
                        : <p className="text-xs text-gray-400 mt-1">Must end with @nbsc.edu.ph</p>
                      }
                    </div>

                    {/* Password */}
                    <div className="anim-field4">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </div>
                        <input type={showPassword ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                          className="input-field" style={{ paddingRight: '42px' }} placeholder="Create a password" required />
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
                      <PasswordStrength password={formData.password} />
                    </div>

                    {/* Confirm Password */}
                    <div className="anim-field5">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <input type={showConfirmPassword ? 'text' : 'password'} name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                          className="input-field" style={{ paddingRight: '42px' }} placeholder="Confirm your password" required />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                          {showConfirmPassword ? (
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
                            Creating account...
                          </span>
                        ) : 'Create Account'}
                      </button>
                    </div>
                  </form>

                  <p className="anim-links mt-4 text-center text-sm text-gray-500">
                    Already have an account?{' '}
                    <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-semibold transition-colors">
                      Sign in here
                    </Link>
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ── Right Panel — Logo/Info ── */}
          <div className="anim-panel-right hidden md:flex md:w-5/12 bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 p-10 flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 rounded-full" />
            <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-white/10 rounded-full" />
            <div className="absolute top-1/2 -left-12 w-44 h-44 bg-white/5 rounded-full" />
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
                  { icon: '✅', text: 'Use your NBSC institutional email' },
                  { icon: '🔒', text: 'Your data is kept private & secure' },
                  { icon: '📝', text: 'Access counseling resources anytime' },
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

        </div>
      </div>
    </div>
  );
}
