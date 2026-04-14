import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#05080f] text-white font-sans antialiased">
      <div className="max-w-3xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="flex items-center gap-3 mb-10">
          <img src="/nbsc-logo.png" alt="NBSC" className="h-10 w-10 object-contain" />
          <div>
            <p className="text-[10px] text-blue-400/70 font-bold tracking-widest uppercase">NBSC</p>
            <p className="text-sm font-bold text-white/90">Guidance &amp; Counseling Office</p>
          </div>
        </div>

        <h1 className="text-3xl font-black text-white mb-2">Privacy Policy</h1>
        <p className="text-white/40 text-sm mb-10">
          Northern Bukidnon State College — Guidance and Counseling Office<br/>
          Kihare, Manolo Fortich, Bukidnon, Philippines<br/>
          Last updated: {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>

        <div className="space-y-8 text-[15px] leading-relaxed text-white/70">

          <section>
            <h2 className="text-lg font-bold text-white mb-3">1. Introduction</h2>
            <p>
              This Privacy Policy explains how the Northern Bukidnon State College (NBSC) Guidance and Counseling Office collects, uses, and protects the personal information of students who use this Official Enrollment Portal. By using this system, you agree to the terms described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">2. Information We Collect</h2>
            <p className="mb-3">We collect student information for official enrollment and counseling purposes only, including:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-white/60">
              <li>Full name, date of birth, gender, and civil status</li>
              <li>Contact information (email address, mobile number)</li>
              <li>Family background and educational history</li>
              <li>Health and medical history</li>
              <li>Mental health assessment responses (BSRS-5, WHODAS 2.0, PID-5-BF)</li>
              <li>Counseling session notes and records</li>
              <li>Profile photo (1x1 ID picture)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">All collected data is used exclusively for:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-white/60">
              <li>Student enrollment and profiling</li>
              <li>Guidance and counseling services</li>
              <li>Mental health assessment and follow-up</li>
              <li>Official school records and reporting</li>
              <li>Communication regarding counseling appointments and updates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">4. Data Security</h2>
            <p>
              All student data is securely stored and protected using industry-standard encryption and access controls. Only authorized NBSC Guidance Office personnel have access to student records. We implement strict security measures to prevent unauthorized access, disclosure, or misuse of personal information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">5. No Third-Party Sharing</h2>
            <p>
              We do not share, sell, rent, or disclose personal student data to any third parties. Your information is used solely for official purposes of Northern Bukidnon State College. Exceptions apply only when required by law or court order.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">6. Confidentiality</h2>
            <p>
              All counseling records and mental health assessment results are strictly confidential. Information shared during counseling sessions will not be disclosed without the student's written consent, except in cases where there is an immediate risk of harm to the student or others, as required by ethical and legal obligations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">7. Access to Your Data</h2>
            <p>
              Students may request to view, update, or correct their personal information by visiting the NBSC Guidance and Counseling Office in person or by contacting us at <span className="text-blue-400">gco@nbsc.edu.ph</span>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">8. Data Subject Rights (Republic Act No. 10173)</h2>
            <p className="mb-3">Under the Data Privacy Act of 2012 (RA 10173), you have the following rights:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-white/60">
              <li><span className="text-white/80 font-medium">Right to be Informed</span> — You have the right to know how your personal data is collected and processed.</li>
              <li><span className="text-white/80 font-medium">Right to Access</span> — You may request a copy of your personal data held by the Guidance Office.</li>
              <li><span className="text-white/80 font-medium">Right to Rectification</span> — You may request correction of inaccurate or incomplete personal data.</li>
              <li><span className="text-white/80 font-medium">Right to Erasure</span> — You may request deletion of your personal data, subject to legal and institutional retention requirements.</li>
              <li><span className="text-white/80 font-medium">Right to Object</span> — You may object to the processing of your personal data in certain circumstances.</li>
              <li><span className="text-white/80 font-medium">Right to Data Portability</span> — You may request a copy of your data in a structured, commonly used format.</li>
              <li><span className="text-white/80 font-medium">Right to Lodge a Complaint</span> — You may file a complaint with the National Privacy Commission (NPC) at <span className="text-blue-400">privacy.gov.ph</span>.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">9. Data Retention</h2>
            <p>
              Student records are retained for the duration of enrollment and for a period required by CHED, NBSC institutional policies, and applicable laws. Records may be retained longer if required for legal, audit, or accreditation purposes. Upon request, personal data may be anonymized or deleted in accordance with RA 10173.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">10. Data Protection Officer</h2>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 text-white/60">
              <p>For data privacy concerns, you may contact the NBSC Data Protection Officer:</p>
              <p className="mt-2">📧 gco@nbsc.edu.ph</p>
              <p>📍 Kihare, Manolo Fortich, Bukidnon, Philippines</p>
              <p className="mt-2 text-white/40 text-xs">You may also file a complaint with the National Privacy Commission: <span className="text-blue-400">privacy.gov.ph</span></p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white mb-3">11. Contact Us</h2>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-5 space-y-2 text-white/60">
              <p>📍 Kihare, Manolo Fortich, Bukidnon, Philippines</p>
              <p>📧 gco@nbsc.edu.ph</p>
              <p>📞 09360363915</p>
              <p>🌐 <a href="https://www.nbsc.edu.ph" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">www.nbsc.edu.ph</a></p>
              <p>🕐 Monday – Friday, 8:00 AM – 5:00 PM</p>
            </div>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-white/[0.07] flex items-center justify-between">
          <p className="text-[11px] text-white/30">© {new Date().getFullYear()} Northern Bukidnon State College. All rights reserved.</p>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
            </svg>
            Back to Home
          </Link>
        </div>

      </div>
    </div>
  );
}
