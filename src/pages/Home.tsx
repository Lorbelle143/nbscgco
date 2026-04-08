import { Link } from 'react-router-dom';

const CAMPUS_IMG = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcROE3tdSJOhol7z2c9L5Y6Sawh5ZmEU7GT8Dg&s";

const services = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'Mental Health Assessment',
    desc: 'Structured screenings to identify student needs and provide timely, appropriate interventions.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    ),
    title: 'Counseling Sessions',
    desc: 'Confidential one-on-one sessions with licensed counselors in a safe, supportive environment.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Progress Tracking',
    desc: 'Monitor student growth, follow-up schedules, and counseling outcomes in one place.',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Secure & Confidential',
    desc: 'All records are protected with role-based access and strict data privacy standards.',
  },
];

const stats = [
  { value: '500+', label: 'Students Served' },
  { value: '100%', label: 'Confidential' },
  { value: '24/7', label: 'Record Access' },
  { value: '5★', label: 'Counselor Support' },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white font-sans">
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-10px); }
        }
        .fade-up { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) both; }
        .fade-up-d1 { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.1s both; }
        .fade-up-d2 { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.2s both; }
        .fade-up-d3 { animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) 0.3s both; }
        .float-img  { animation: float 5s ease-in-out infinite; }
        .nav-link   { position: relative; }
        .nav-link::after {
          content: ''; position: absolute; bottom: -3px; left: 0;
          width: 0; height: 2px; background: #60a5fa;
          transition: width 0.3s;
        }
        .nav-link:hover::after { width: 100%; }
        .card-hover { transition: transform 0.25s, box-shadow 0.25s; }
        .card-hover:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(59,130,246,0.15); }
      `}</style>

      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#0a0f1e]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/nbsc-logo.png" alt="NBSC" className="h-9 w-9 object-contain" />
            <div className="leading-tight">
              <p className="text-xs text-blue-400 font-medium tracking-widest uppercase">NBSC</p>
              <p className="text-sm font-bold text-white">Guidance &amp; Counseling</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <a href="#home"    className="nav-link hover:text-white transition-colors">Home</a>
            <a href="#about"   className="nav-link hover:text-white transition-colors">About Us</a>
            <a href="#services" className="nav-link hover:text-white transition-colors">Services</a>
            <a href="#contact" className="nav-link hover:text-white transition-colors">Contact</a>
          </div>
          <Link
            to="/login"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-blue-600/30"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Sign In
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section id="home" className="relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 py-24 md:py-32 flex flex-col md:flex-row items-center gap-16">
          {/* Left */}
          <div className="flex-1 text-center md:text-left">
            <div className="fade-up inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              Northern Bukidnon State College
            </div>
            <div className="fade-up-d1 flex justify-center md:justify-start mb-5">
              <img src="/nbsc-logo.png" alt="NBSC Logo" className="h-20 w-20 object-contain drop-shadow-2xl" />
            </div>
            <h1 className="fade-up-d1 text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-5 tracking-tight">
              Guidance &amp; Counseling<br />
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Office Management System
              </span>
            </h1>
            <p className="fade-up-d2 text-gray-400 text-lg max-w-lg mb-10 leading-relaxed mx-auto md:mx-0">
              A secure, centralized platform for student counseling, mental health assessments, and guidance services at NBSC.
            </p>
            <div className="fade-up-d3 flex gap-4 flex-wrap justify-center md:justify-start">
              <Link
                to="/login"
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-500/40"
              >
                Student Sign In
              </Link>
              <Link
                to="/register"
                className="bg-white/5 hover:bg-white/10 border border-white/15 text-white px-8 py-3.5 rounded-xl font-semibold text-sm transition-all"
              >
                Create Account
              </Link>
            </div>
          </div>

          {/* Right — campus image */}
          <div className="flex-shrink-0 hidden md:flex flex-col items-center gap-4">
            <div className="float-img relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-600/30 to-indigo-600/20 blur-xl" />
              <img
                src={CAMPUS_IMG}
                alt="NBSC Campus"
                className="relative w-[380px] h-[260px] object-cover rounded-2xl shadow-2xl border border-white/10"
              />
              {/* Badge */}
              <div className="absolute -bottom-4 -left-4 bg-[#111827] border border-white/10 rounded-xl px-4 py-2.5 shadow-xl flex items-center gap-2.5">
                <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-gray-400">System Status</p>
                  <p className="text-xs font-semibold text-green-400">Online &amp; Secure</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="border-y border-white/8 bg-white/3">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold text-blue-400">{s.value}</p>
              <p className="text-sm text-gray-400 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── About ── */}
      <section id="about" className="py-24 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-16 items-center">
          <div className="flex-1">
            <p className="text-blue-400 text-xs font-semibold tracking-widest uppercase mb-3">Who We Are</p>
            <h2 className="text-3xl md:text-4xl font-extrabold mb-5 leading-tight">
              Committed to Student<br />
              <span className="text-blue-400">Well-being &amp; Growth</span>
            </h2>
            <p className="text-gray-400 leading-relaxed mb-5">
              The NBSC Guidance and Counseling Office is dedicated to the holistic development of every student. We provide professional counseling, mental health assessments, and follow-up services to help students thrive academically, emotionally, and socially.
            </p>
            <p className="text-gray-400 leading-relaxed">
              Our team of licensed counselors works closely with students to address personal, academic, and career concerns in a safe and confidential setting.
            </p>
          </div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {services.map((s) => (
              <div key={s.title} className="card-hover bg-white/4 border border-white/8 rounded-2xl p-5">
                <div className="w-12 h-12 bg-blue-500/15 rounded-xl flex items-center justify-center text-blue-400 mb-4">
                  {s.icon}
                </div>
                <h3 className="font-semibold text-sm mb-1.5">{s.title}</h3>
                <p className="text-gray-400 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Services Banner ── */}
      <section id="services" className="py-16 px-6 bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-blue-600/10 border-y border-white/8">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-blue-400 text-xs font-semibold tracking-widest uppercase mb-3">Get Started</p>
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4">Ready to access your counseling portal?</h2>
          <p className="text-gray-400 mb-8">Sign in with your student account or register to get started.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link to="/login"    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-600/30">Student Sign In</Link>
            <Link to="/register" className="bg-white/5 hover:bg-white/10 border border-white/15 text-white px-8 py-3.5 rounded-xl font-semibold text-sm transition-all">Register Now</Link>
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section id="contact" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-blue-400 text-xs font-semibold tracking-widest uppercase mb-3">Get In Touch</p>
            <h2 className="text-3xl md:text-4xl font-extrabold">Contact the Guidance Office</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                label: 'Address',
                value: 'Kihare, Manolo Fortich, Bukidnon, Philippines',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                ),
                label: 'Email',
                value: 'gco@nbsc.edu.ph',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                ),
                label: 'Phone',
                value: '09360363915',
              },
              {
                icon: (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                label: 'Office Hours',
                value: 'Monday – Friday, 8:00 AM – 5:00 PM',
              },
            ].map((item) => (
              <div key={item.label} className="card-hover bg-white/4 border border-white/8 rounded-2xl p-6 flex flex-col gap-3">
                <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center text-blue-400">
                  {item.icon}
                </div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{item.label}</p>
                <p className="text-sm text-gray-200 leading-relaxed">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/8 bg-black/30">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/nbsc-logo.png" alt="NBSC" className="h-8 w-8 object-contain opacity-70" />
            <span className="text-sm text-gray-400">NBSC Guidance &amp; Counseling Office</span>
          </div>
          <p className="text-xs text-gray-600">© {new Date().getFullYear()} Northern Bukidnon State College. All rights reserved.</p>
          <div className="flex gap-5 text-xs text-gray-500">
            <a href="#home"    className="hover:text-gray-300 transition-colors">Home</a>
            <a href="#about"   className="hover:text-gray-300 transition-colors">About</a>
            <a href="#contact" className="hover:text-gray-300 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
