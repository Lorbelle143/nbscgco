import { Link } from 'react-router-dom';
import { useState } from 'react';

const CAMPUS_IMG = "/nbsc-bg.jpg";
const CAMPUS_FALLBACK = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcROE3tdSJOhol7z2c9L5Y6Sawh5ZmEU7GT8Dg&s";

const NAV_LINKS = [
  { label: 'Home',     href: '#home' },
  { label: 'About',    href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Contact',  href: '#contact' },
];

const SERVICES = [
  { emoji: '🧠', title: 'Mental Health Assessment',  desc: 'Structured BSRS-5 screenings to identify student needs and provide timely, appropriate interventions.' },
  { emoji: '💬', title: 'Counseling Sessions',        desc: 'Confidential one-on-one sessions with licensed counselors in a safe, supportive environment.' },
  { emoji: '📊', title: 'Progress Tracking',          desc: 'Monitor student growth, follow-up schedules, and counseling outcomes all in one place.' },
  { emoji: '🔒', title: 'Secure & Confidential',      desc: 'All records are protected with role-based access and strict data privacy standards.' },
  { emoji: '📋', title: 'Inventory Form',             desc: 'Comprehensive student profiling with family background, health history, and personal data.' },
  { emoji: '📩', title: 'Instant Notifications',      desc: 'Real-time email and in-app alerts for counseling updates, approvals, and follow-ups.' },
];

const STATS = [
  { value: '500+', label: 'Students Served',    color: '#60a5fa' },
  { value: '100%', label: 'Confidential',        color: '#818cf8' },
  { value: '24/7', label: 'Record Access',       color: '#a78bfa' },
  { value: '5 ★',  label: 'Counselor Support',  color: '#38bdf8' },
];

const CONTACT = [
  { emoji: '📍', label: 'Address',      value: 'Kihare, Manolo Fortich\nBukidnon, Philippines' },
  { emoji: '📧', label: 'Email',        value: 'gco@nbsc.edu.ph' },
  { emoji: '📞', label: 'Phone',        value: '09360363915' },
  { emoji: '🕐', label: 'Office Hours', value: 'Mon – Fri\n8:00 AM – 5:00 PM' },
];

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white font-sans antialiased selection:bg-blue-500/30">
      <style>{`
        /* ── Animations ── */
        @keyframes fadeUp   { from{opacity:0;transform:translateY(32px)} to{opacity:1;transform:translateY(0)} }
        @keyframes floatY   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes shimmer  { 0%{background-position:-300% center} 100%{background-position:300% center} }
        @keyframes blink    { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes rotateSlow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes scaleIn  { from{opacity:0;transform:scale(.92)} to{opacity:1;transform:scale(1)} }

        .fu  { animation: fadeUp .75s cubic-bezier(.22,1,.36,1) both }
        .fu1 { animation: fadeUp .75s cubic-bezier(.22,1,.36,1) .12s both }
        .fu2 { animation: fadeUp .75s cubic-bezier(.22,1,.36,1) .24s both }
        .fu3 { animation: fadeUp .75s cubic-bezier(.22,1,.36,1) .36s both }
        .fu4 { animation: fadeUp .75s cubic-bezier(.22,1,.36,1) .48s both }
        .si  { animation: scaleIn .6s cubic-bezier(.34,1.56,.64,1) .2s both }

        .float { animation: floatY 7s ease-in-out infinite }

        .grad-text {
          background: linear-gradient(120deg,#93c5fd 0%,#818cf8 40%,#c4b5fd 80%,#93c5fd 100%);
          background-size: 300% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 6s linear infinite;
        }

        /* ── Nav underline ── */
        .nl { position:relative; padding-bottom:2px }
        .nl::after {
          content:''; position:absolute; bottom:0; left:0;
          width:0; height:1.5px;
          background: linear-gradient(90deg,#60a5fa,#a78bfa);
          transition: width .3s ease;
        }
        .nl:hover::after { width:100% }

        /* ── Glass card ── */
        .gc {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(16px);
          transition: transform .3s, border-color .3s, box-shadow .3s;
        }
        .gc:hover {
          transform: translateY(-6px);
          border-color: rgba(96,165,250,.22);
          box-shadow: 0 28px 56px rgba(96,165,250,.07), 0 0 0 1px rgba(96,165,250,.08);
        }

        /* ── Buttons ── */
        .btn-p {
          background: linear-gradient(135deg,#1d4ed8,#4338ca);
          box-shadow: 0 4px 24px rgba(67,56,202,.45);
          transition: all .25s;
        }
        .btn-p:hover {
          background: linear-gradient(135deg,#2563eb,#6366f1);
          box-shadow: 0 8px 32px rgba(99,102,241,.55);
          transform: translateY(-2px);
        }
        .btn-g {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.11);
          transition: all .25s;
        }
        .btn-g:hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(255,255,255,.22);
          transform: translateY(-2px);
        }

        /* ── Divider ── */
        .div-line {
          height:1px;
          background: linear-gradient(90deg,transparent,rgba(99,102,241,.25),rgba(139,92,246,.2),transparent);
        }

        /* ── Orbit ring ── */
        .orbit {
          position:absolute; border-radius:50%;
          border: 1px solid rgba(99,102,241,.12);
          animation: rotateSlow 20s linear infinite;
        }

        /* ── Blink dot ── */
        .blink { animation: blink 2s ease-in-out infinite }

        /* ── Noise overlay ── */
        .noise::before {
          content:''; position:absolute; inset:0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events:none; z-index:0;
        }
      `}</style>

      {/* ══════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-2xl border-b border-white/[0.055]">
        <div className="max-w-7xl mx-auto px-6 h-[62px] flex items-center justify-between">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-lg" />
              <img src="/nbsc-logo.png" alt="NBSC" className="relative w-9 h-9 object-contain" />
            </div>
            <div>
              <p className="text-[9px] text-blue-400/70 font-bold tracking-[.22em] uppercase leading-none">NBSC</p>
              <p className="text-[13px] font-bold text-white/90 leading-tight tracking-tight">Guidance &amp; Counseling</p>
            </div>
          </div>

          {/* Links */}
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href}
                className="nl text-sm font-medium text-white/70 hover:text-white transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA + Hamburger */}
          <div className="flex items-center gap-3">
            <Link to="/login"
              className="btn-p flex items-center gap-2 text-white text-[13px] font-semibold px-5 py-2 rounded-lg">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2}
                  d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
              </svg>
              Sign In
            </Link>
            <button onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle menu">
              {mobileOpen
                ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
              }
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/[0.055] bg-slate-900/95 backdrop-blur-2xl px-6 py-4 flex flex-col gap-3">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors py-1">
                {l.label}
              </a>
            ))}
          </div>
        )}
      </nav>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <section id="home" className="relative overflow-hidden noise">
        {/* Ambient blobs */}
        <div className="absolute -top-60 -left-60 w-[700px] h-[700px] bg-blue-700/6 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-10 right-[-10%] w-[550px] h-[550px] bg-indigo-700/7 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[30%] w-[450px] h-[450px] bg-violet-700/5 rounded-full blur-[110px] pointer-events-none" />

        {/* Orbit rings */}
        <div className="orbit w-[900px] h-[900px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-40" />
        <div className="orbit w-[650px] h-[650px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-30"
          style={{ animationDirection:'reverse', animationDuration:'14s' }} />

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-32 flex flex-col md:flex-row items-center gap-20">

          {/* ── Left ── */}
          <div className="flex-1 text-center md:text-left">

            {/* Badge */}
            <div className="fu inline-flex items-center gap-2.5 bg-gradient-to-r from-blue-500/10 to-indigo-500/10
              border border-blue-500/20 text-blue-300 text-[11px] font-bold px-4 py-1.5 rounded-full mb-8
              tracking-[.18em] uppercase shadow-lg shadow-blue-500/5">
              <span className="blink w-1.5 h-1.5 bg-blue-400 rounded-full" />
              Northern Bukidnon State College
            </div>

            {/* Logo */}
            <div className="fu1 flex justify-center md:justify-start mb-7">
              <div className="si relative">
                <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-2xl scale-125" />
                <div className="relative w-[76px] h-[76px] bg-white/[0.04] border border-white/10 rounded-2xl
                  flex items-center justify-center shadow-2xl">
                  <img src="/nbsc-logo.png" alt="NBSC" className="w-14 h-14 object-contain" />
                </div>
              </div>
            </div>

            {/* Headline */}
            <h1 className="fu1 font-black leading-[1.08] tracking-tight mb-4"
              style={{ fontSize: 'clamp(2.4rem, 5vw, 3.6rem)' }}>
              Guidance &amp; Counseling<br />
              <span className="grad-text">Office Management</span><br />
              <span className="grad-text">System</span>
            </h1>

            {/* Official portal notice */}
            <div className="fu2 inline-flex items-start gap-2 bg-green-500/10 border border-green-500/20 text-green-300 text-[12px] font-semibold px-4 py-2.5 rounded-xl mb-5 max-w-lg">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <span>This is the <strong>Official Guidance and Counseling Office</strong> of Northern Bukidnon State College. All student data is secured and confidential.</span>
            </div>

            {/* Ownership notice */}
            <div className="fu2 text-[12px] text-white/40 mb-5">
              This website is owned and managed by the <span className="text-white/60 font-medium">NBSC Guidance Office</span>.
            </div>

            {/* Sub */}
            <p className="fu2 text-white/60 text-[15px] md:text-base max-w-[440px] mb-10 leading-[1.75] mx-auto md:mx-0">
              A secure, centralized platform for student counseling, mental health assessments, and guidance services at NBSC.
            </p>

            {/* Buttons */}
            <div className="fu3 flex gap-3 flex-wrap justify-center md:justify-start mb-10">
              <Link to="/login"    className="btn-p text-white px-7 py-3 rounded-xl font-semibold text-sm">Student Sign In</Link>
              <Link to="/register" className="btn-g text-white px-7 py-3 rounded-xl font-semibold text-sm">Create Account</Link>
            </div>

            {/* Trust pills */}
            <div className="fu4 flex flex-wrap gap-3 justify-center md:justify-start">
              {['🔒 Secure & Private','✅ Licensed Counselors','📊 Real-time Tracking','🎓 NBSC Official'].map(t => (
                <span key={t}
                  className="text-[11px] text-white/50 bg-white/[0.06] border border-white/[0.1] px-3 py-1 rounded-full">
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* ── Right ── */}
          <div className="flex-shrink-0 hidden md:block">
            <div className="float relative">
              {/* Glow */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-blue-600/20 to-indigo-600/15 blur-3xl scale-110" />

              {/* Image */}
              <img src={CAMPUS_IMG} alt="NBSC Campus"
                onError={e => { (e.target as HTMLImageElement).src = CAMPUS_FALLBACK; }}
                className="relative w-[420px] h-[280px] object-cover rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,.6)] border border-white/[0.07]" />

              {/* Overlay gradient */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-[#05080f]/40 via-transparent to-transparent" />

              {/* Badge — bottom left */}
              <div className="absolute -bottom-5 -left-6 bg-[#0d1526]/95 border border-white/[0.12] rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl backdrop-blur-sm">
                <div className="w-9 h-9 bg-green-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">System Status</p>
                  <p className="text-sm font-bold text-white">Online &amp; Secure</p>
                </div>
              </div>

              {/* Badge — top right */}
              <div className="absolute -top-5 -right-6 bg-[#0d1526]/95 border border-white/[0.12] rounded-2xl px-4 py-3 flex items-center gap-3 shadow-2xl backdrop-blur-sm">
                <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-medium">Students Served</p>
                  <p className="text-sm font-bold text-white">500+</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="div-line" />

      {/* ══════════════════════════════════════════
          STATS
      ══════════════════════════════════════════ */}
      <section className="bg-white/[0.018]">
        <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(s => (
            <div key={s.label} className="text-center group">
              <p className="text-[2.6rem] font-black mb-1 group-hover:scale-110 transition-transform"
                style={{ color: s.color }}>{s.value}</p>
              <p className="text-[11px] text-white/50 font-semibold tracking-widest uppercase">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="div-line" />

      {/* ══════════════════════════════════════════
          ABOUT
      ══════════════════════════════════════════ */}
      <section id="about" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-700/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-20 items-center relative z-10">

          {/* Text */}
          <div className="flex-1">
            <p className="text-[11px] text-blue-400/80 font-bold tracking-[.25em] uppercase mb-4">Who We Are</p>
            <h2 className="font-black leading-tight mb-6" style={{ fontSize:'clamp(2rem,4vw,2.8rem)' }}>
              Committed to Student<br />
              <span className="grad-text">Well-being &amp; Growth</span>
            </h2>
            <p className="text-white/60 leading-[1.8] mb-5 text-[15px]">
              The NBSC Guidance and Counseling Office is dedicated to the holistic development of every student. We provide professional counseling, mental health assessments, and follow-up services to help students thrive academically, emotionally, and socially.
            </p>
            <p className="text-white/50 leading-[1.8] text-[14px] mb-10">
              Our team of licensed counselors works closely with students to address personal, academic, and career concerns in a safe and confidential setting at Northern Bukidnon State College.
            </p>
            <div className="flex gap-3 flex-wrap">
              <Link to="/login"    className="btn-p text-white px-6 py-2.5 rounded-xl font-semibold text-sm">Get Started</Link>
              <a href="#contact"   className="btn-g text-white px-6 py-2.5 rounded-xl font-semibold text-sm">Contact Us</a>
            </div>
          </div>

          {/* Cards */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SERVICES.map((s, i) => (
              <div key={s.title} className="gc rounded-2xl p-5"
                style={{ animationDelay: `${i * 0.07}s` }}>
                <div className="text-[28px] mb-3">{s.emoji}</div>
                <h3 className="font-bold text-[13px] text-white mb-2">{s.title}</h3>
                <p className="text-white/50 text-[12px] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="div-line" />

      {/* ══════════════════════════════════════════
          CTA BANNER
      ══════════════════════════════════════════ */}
      <section id="services" className="py-24 px-6 relative overflow-hidden">
        {/* Gradient bg */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-indigo-900/12 to-violet-900/8 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-px bg-gradient-to-r from-transparent via-indigo-500/35 to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-px bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20
            text-indigo-300 text-[11px] font-bold px-4 py-1.5 rounded-full mb-6 tracking-widest uppercase">
            <span className="blink w-1.5 h-1.5 bg-indigo-400 rounded-full" />
            Get Started Today
          </div>
          <h2 className="font-black leading-tight mb-5" style={{ fontSize:'clamp(2rem,4vw,2.8rem)' }}>
            Ready to access your<br />
            <span className="grad-text">counseling portal?</span>
          </h2>
          <p className="text-white/60 text-[15px] mb-10 max-w-lg mx-auto leading-[1.75]">
            Sign in with your student account or create a new account to begin your counseling journey with NBSC.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/login"    className="btn-p text-white px-8 py-3.5 rounded-xl font-semibold text-sm">Student Sign In</Link>
            <Link to="/register" className="btn-g text-white px-8 py-3.5 rounded-xl font-semibold text-sm">Register Now</Link>
          </div>
        </div>
      </section>

      <div className="div-line" />

      {/* ══════════════════════════════════════════
          CONTACT
      ══════════════════════════════════════════ */}
      <section id="contact" className="py-32 px-6 relative overflow-hidden">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-700/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <p className="text-[11px] text-blue-400/80 font-bold tracking-[.25em] uppercase mb-4">Get In Touch</p>
            <h2 className="font-black mb-4" style={{ fontSize:'clamp(2rem,4vw,2.8rem)' }}>
              Contact the Guidance Office
            </h2>
            <p className="text-white/60 text-[15px] max-w-md mx-auto leading-relaxed">
              We're here to help. Reach out anytime during office hours and we'll get back to you.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {CONTACT.map(c => (
              <div key={c.label} className="gc rounded-2xl p-6 flex flex-col gap-4">
                <div className="w-12 h-12 bg-white/[0.04] border border-white/[0.08] rounded-2xl
                  flex items-center justify-center text-2xl shadow-inner">
                  {c.emoji}
                </div>
                <div>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2">{c.label}</p>
                  <p className="text-[14px] text-white leading-relaxed whitespace-pre-line">{c.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════ */}
      <footer className="border-t border-white/[0.055] bg-black/25">
        {/* Official badge bar */}
        <div className="border-b border-white/[0.04] bg-white/[0.02]">
          <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] text-green-400 font-semibold">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              Official Website — Northern Bukidnon State College
            </div>
            <p className="text-[11px] text-white/30 text-center">
              Student data is securely stored and used only for official purposes of Northern Bukidnon State College.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-3">
            <img src="/nbsc-logo.png" alt="NBSC" className="h-8 w-8 object-contain opacity-60" />
            <div>
              <p className="text-[12px] text-white/60 font-semibold">NBSC Guidance &amp; Counseling Office</p>
              <p className="text-[11px] text-white/30">Kihare, Manolo Fortich, Bukidnon · 09360363915</p>
              <a href="https://www.nbsc.edu.ph" target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-blue-400/70 hover:text-blue-300 transition-colors">
                ✉ www.nbsc.edu.ph
              </a>
            </div>
          </div>
          <p className="text-[11px] text-white/30">
            © {new Date().getFullYear()} Northern Bukidnon State College. All rights reserved.
          </p>
          <div className="flex gap-6">
            {NAV_LINKS.map(l => (
              <a key={l.label} href={l.href}
                className="text-[11px] text-white/40 hover:text-white transition-colors">{l.label}</a>
            ))}
            <Link to="/privacy-policy" className="text-[11px] text-white/40 hover:text-white transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
