import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-8 py-4 bg-black/20 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src="/nbsc-logo.png" alt="NBSC Logo" className="h-10 w-10 object-contain" />
          <span className="font-bold text-lg tracking-wide">NBSC Guidance</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#home" className="hover:text-blue-300 transition-colors">Home</a>
          <a href="#about" className="hover:text-blue-300 transition-colors">About Us</a>
          <a href="#contact" className="hover:text-blue-300 transition-colors">Contact</a>
        </div>
        <Link
          to="/login"
          className="bg-blue-500 hover:bg-blue-400 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero */}
      <section id="home" className="flex flex-col md:flex-row items-center justify-between text-left px-10 md:px-24 py-28 gap-12 max-w-6xl mx-auto">
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left">
          <img src="/nbsc-logo.png" alt="NBSC" className="h-24 w-24 object-contain drop-shadow-lg mb-5 mx-auto md:mx-0" />
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            NBSC Guidance &amp; Counseling<br />
            <span className="text-blue-300">Office Management System</span>
          </h1>
          <p className="text-blue-100 max-w-xl text-lg mb-8">
            A secure platform for students to access counseling services, mental health assessments, and guidance support at Northern Bukidnon State College.
          </p>
          <div className="flex gap-4 flex-wrap justify-center md:justify-start">
            <Link
              to="/login"
              className="bg-blue-500 hover:bg-blue-400 text-white px-8 py-3 rounded-xl font-semibold text-base transition-colors shadow-lg"
            >
              Student Sign In
            </Link>
            <Link
              to="/register"
              className="border border-blue-400 hover:bg-blue-800/40 text-white px-8 py-3 rounded-xl font-semibold text-base transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
        <div className="flex-shrink-0 hidden md:block">
          <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcROE3tdSJOhol7z2c9L5Y6Sawh5ZmEU7GT8Dg&s" alt="NBSC Campus" className="w-80 h-64 object-cover rounded-2xl shadow-2xl opacity-90" />
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-black/20 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 text-blue-200">About Us</h2>
          <p className="text-blue-100 text-base leading-relaxed mb-8">
            The NBSC Guidance and Counseling Office is dedicated to supporting the holistic development of every student. We provide professional counseling, mental health assessments, and follow-up services to help students thrive academically, emotionally, and socially at Northern Bukidnon State College.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
            {[
              { icon: '🧠', title: 'Mental Health', desc: 'Regular assessments and support for student well-being.' },
              { icon: '📋', title: 'Counseling Sessions', desc: 'Confidential one-on-one sessions with licensed counselors.' },
              { icon: '📊', title: 'Progress Tracking', desc: 'Monitor your growth and follow-up appointments easily.' },
            ].map((item) => (
              <div key={item.title} className="bg-white/10 rounded-2xl p-6 text-left hover:bg-white/15 transition-colors">
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                <p className="text-blue-200 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 text-blue-200">Contact Us</h2>
          <p className="text-blue-100 mb-8">Have questions? Reach out to the Guidance Office.</p>
          <div className="bg-white/10 rounded-2xl p-8 text-left space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📍</span>
              <span className="text-blue-100">Northern Bukidnon State College, Bukidnon, Philippines</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📧</span>
              <span className="text-blue-100">gco@nbsc.edu.ph</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">📞</span>
              <span className="text-blue-100">(038) 000-0000</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">🕐</span>
              <span className="text-blue-100">Monday – Friday, 8:00 AM – 5:00 PM</span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/30 text-center py-6 text-blue-300 text-sm">
        © {new Date().getFullYear()} NBSC Guidance &amp; Counseling Office. All rights reserved.
      </footer>
    </div>
  );
}
