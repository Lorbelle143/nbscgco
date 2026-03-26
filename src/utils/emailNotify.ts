import { supabase } from '../lib/supabase';

const BREVO_API_KEY = import.meta.env.VITE_BREVO_API_KEY || '';

interface EmailPayload {
  to_email: string;
  to_name: string;
  subject: string;
  html: string;
}

async function sendBrevoEmail(payload: EmailPayload) {
  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: 'NBSC Guidance Office', email: 'gco@nbsc.edu.ph' },
        to: [{ email: payload.to_email, name: payload.to_name }],
        subject: payload.subject,
        htmlContent: payload.html,
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      console.error('Brevo email error:', err);
    }
  } catch (e) {
    console.error('Email send failed:', e);
  }
}

function baseTemplate(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">
<tr><td style="background:linear-gradient(135deg,#1a3a6b 0%,#2563eb 100%);padding:28px 40px;text-align:center;">
  <h1 style="color:#fff;margin:0 0 4px;font-size:20px;font-weight:bold;">Northern Bukidnon State College</h1>
  <p style="color:#93c5fd;margin:0;font-size:13px;">Guidance and Counseling Office</p>
</td></tr>
<tr><td style="padding:28px 40px;">${content}</td></tr>
<tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 40px;text-align:center;">
  <p style="color:#9ca3af;font-size:12px;margin:0;">Northern Bukidnon State College — Guidance and Counseling Office</p>
  <p style="color:#9ca3af;font-size:12px;margin:4px 0 0;">Manolo Fortich, 8703 Bukidnon</p>
  <p style="color:#d1d5db;font-size:11px;margin:6px 0 0;">This is an automated notification. Please do not reply.</p>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

async function getStudentEmail(studentId: string): Promise<{ email: string; full_name: string } | null> {
  const { data } = await supabase
    .from('profiles')
    .select('email, full_name')
    .eq('student_id', studentId)
    .maybeSingle();
  return data || null;
}

export async function notifySessionSaved(studentId: string, sessionNumber: number, sessionDate: string, status: string) {
  const student = await getStudentEmail(studentId);
  if (!student) return;

  const html = baseTemplate(`
    <p style="color:#374151;font-size:15px;margin:0 0 12px;">Dear <strong>${student.full_name}</strong>,</p>
    <p style="color:#374151;font-size:15px;margin:0 0 20px;">A counseling session record has been saved for you by the Guidance and Counseling Office.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;">
    <tr><td style="padding:18px 22px;">
      <table width="100%">
        <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;width:40%;">Session Number:</td>
            <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">Session #${sessionNumber}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Session Date:</td>
            <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">${new Date(sessionDate).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</td></tr>
        <tr><td style="padding:5px 0;color:#6b7280;font-size:13px;">Status:</td>
            <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">${status}</td></tr>
      </table>
    </td></tr></table>
    <p style="color:#9ca3af;font-size:13px;margin:0;">For questions, please visit the Guidance and Counseling Office.</p>
  `);

  await sendBrevoEmail({
    to_email: student.email,
    to_name: student.full_name,
    subject: `📝 Counseling Session #${sessionNumber} Record — NBSC Guidance Office`,
    html,
  });
}

export async function notifyConsentUpdated(_studentId: string, studentName: string, studentEmail: string, status: string) {
  const statusMessages: Record<string, string> = {
    signed: 'Your informed consent form has been marked as <strong>Signed</strong>. Thank you for your cooperation.',
    pending: 'Your informed consent form status has been updated to <strong>Pending</strong>. Please coordinate with the Guidance Office.',
    declined: 'Your informed consent form has been marked as <strong>Declined</strong>. If you have questions, please visit the Guidance Office.',
  };
  const statusColors: Record<string, string> = { signed: '#16a34a', pending: '#d97706', declined: '#dc2626' };
  const color = statusColors[status] || '#2563eb';
  const message = statusMessages[status] || 'Your consent status has been updated.';
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  const html = baseTemplate(`
    <p style="color:#374151;font-size:15px;margin:0 0 12px;">Dear <strong>${studentName}</strong>,</p>
    <div style="background:${color}20;border:2px solid ${color};border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center;">
      <p style="color:${color};font-weight:bold;font-size:15px;margin:0;">📋 Consent Status: ${label}</p>
    </div>
    <p style="color:#374151;font-size:15px;margin:0 0 20px;">${message}</p>
    <p style="color:#9ca3af;font-size:13px;margin:0;">For questions, please visit the Guidance and Counseling Office.</p>
  `);

  await sendBrevoEmail({
    to_email: studentEmail,
    to_name: studentName,
    subject: `📋 Consent Form Update — NBSC Guidance Office`,
    html,
  });
}

export async function notifyPasswordReset(studentEmail: string, studentName: string, newPassword: string) {
  const html = baseTemplate(`
    <p style="color:#374151;font-size:15px;margin:0 0 12px;">Dear <strong>${studentName}</strong>,</p>
    <p style="color:#374151;font-size:15px;margin:0 0 20px;">Your password reset request has been processed. Your new temporary password is:</p>
    <div style="background:#f0fdf4;border:2px solid #16a34a;border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center;">
      <p style="color:#15803d;font-weight:bold;font-size:22px;margin:0;letter-spacing:2px;">${newPassword}</p>
    </div>
    <p style="color:#374151;font-size:14px;margin:0 0 8px;">Please log in and change your password immediately after signing in.</p>
    <p style="color:#9ca3af;font-size:13px;margin:0;">If you did not request this, please contact the Guidance Office immediately.</p>
  `);

  await sendBrevoEmail({
    to_email: studentEmail,
    to_name: studentName,
    subject: `🔐 Password Reset — NBSC Guidance Office`,
    html,
  });
}

export async function notifySubmissionStatus(studentEmail: string, studentName: string, status: string, remarks?: string) {
  const statusConfig: Record<string, { label: string; color: string; icon: string; msg: string }> = {
    approved: { label: 'Approved', color: '#16a34a', icon: '✅', msg: 'Your inventory form has been approved by the Guidance Office.' },
    'needs-revision': { label: 'Needs Revision', color: '#d97706', icon: '✏️', msg: 'Your inventory form requires revision. Please update your submission.' },
    'under-review': { label: 'Under Review', color: '#2563eb', icon: '🔍', msg: 'Your inventory form is currently being reviewed by the Guidance Office.' },
  };
  const cfg = statusConfig[status] || { label: status, color: '#6b7280', icon: '📋', msg: 'Your form status has been updated.' };

  const html = baseTemplate(`
    <p style="color:#374151;font-size:15px;margin:0 0 12px;">Dear <strong>${studentName}</strong>,</p>
    <div style="background:${cfg.color}20;border:2px solid ${cfg.color};border-radius:12px;padding:16px 20px;margin-bottom:20px;text-align:center;">
      <p style="color:${cfg.color};font-weight:bold;font-size:15px;margin:0;">${cfg.icon} Form Status: ${cfg.label}</p>
    </div>
    <p style="color:#374151;font-size:15px;margin:0 0 12px;">${cfg.msg}</p>
    ${remarks ? `<p style="color:#374151;font-size:14px;margin:0 0 20px;"><strong>Remarks:</strong> ${remarks}</p>` : ''}
    <p style="color:#9ca3af;font-size:13px;margin:0;">For qu
estions, please visit the Guidance and Counseling Office.</p>
  `);

  await sendBrevoEmail({
    to_email: studentEmail,
    to_name: studentName,
    subject: `${cfg.icon} Form Status Update: ${cfg.label} — NBSC Guidance Office`,
    html,
  });
}
