/// <reference path="../deno.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') || '';

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Scheduled',
  'in-progress': 'In Progress',
  completed: 'Completed',
  pending: 'Pending',
};
const STATUS_COLORS: Record<string, string> = {
  scheduled: '#2563eb',
  'in-progress': '#d97706',
  completed: '#16a34a',
  pending: '#6b7280',
};
const STATUS_ICONS: Record<string, string> = {
  scheduled: '📅',
  'in-progress': '🔄',
  completed: '✅',
  pending: '⏳',
};
const STATUS_MESSAGES: Record<string, string> = {
  scheduled: 'Your counseling session has been scheduled. Please visit the Guidance and Counseling Office at your earliest convenience.',
  'in-progress': 'Your counseling session is currently in progress. Please continue to cooperate with your counselor.',
  completed: 'Your counseling session has been completed. Thank you for participating. The Guidance Office is always here if you need further support.',
  pending: 'Your follow-up status has been updated.',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json() as { student_email: string; student_name: string; student_id: string; status: string; notes?: string };
    const { student_email, student_name, student_id, status, notes } = body;

    if (!student_email || !status) {
      return new Response(JSON.stringify({ error: 'Missing student_email or status' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!BREVO_API_KEY) {
      return new Response(JSON.stringify({ error: 'BREVO_API_KEY not configured in Edge Function secrets' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const statusLabel = STATUS_LABELS[status] || status;
    const color = STATUS_COLORS[status] || '#1a3a6b';
    const icon = STATUS_ICONS[status] || '📋';
    const statusMessage = STATUS_MESSAGES[status] || '';

    const htmlBody = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">

<tr><td style="background:linear-gradient(135deg,#1a3a6b 0%,#2563eb 100%);padding:28px 40px;text-align:center;">
  <h1 style="color:#fff;margin:0 0 4px;font-size:20px;font-weight:bold;">Northern Bukidnon State College</h1>
  <p style="color:#93c5fd;margin:0;font-size:13px;">Guidance and Counseling Office</p>
</td></tr>

<tr><td style="padding:24px 40px 0;text-align:center;">
  <div style="display:inline-block;background:${color}20;border:2px solid ${color};border-radius:999px;padding:8px 28px;">
    <span style="color:${color};font-weight:bold;font-size:15px;">${icon} Counseling Status: ${statusLabel}</span>
  </div>
</td></tr>

<tr><td style="padding:24px 40px 28px;">
  <p style="color:#374151;font-size:15px;margin:0 0 12px;">Dear <strong>${student_name}</strong>,</p>
  <p style="color:#374151;font-size:15px;margin:0 0 20px;">${statusMessage}</p>

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin-bottom:20px;">
  <tr><td style="padding:18px 22px;">
    <table width="100%">
      <tr>
        <td style="padding:5px 0;color:#6b7280;font-size:13px;width:38%;">Student Name:</td>
        <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">${student_name}</td>
      </tr>
      <tr>
        <td style="padding:5px 0;color:#6b7280;font-size:13px;">Student ID:</td>
        <td style="padding:5px 0;color:#111827;font-size:13px;font-weight:600;">${student_id}</td>
      </tr>
      <tr>
        <td style="padding:5px 0;color:#6b7280;font-size:13px;">Status:</td>
        <td style="padding:5px 0;">
          <span style="background:${color}20;color:${color};font-weight:bold;font-size:12px;padding:3px 12px;border-radius:999px;">${statusLabel}</span>
        </td>
      </tr>
      ${notes ? `<tr>
        <td style="padding:5px 0;color:#6b7280;font-size:13px;vertical-align:top;">Counselor Notes:</td>
        <td style="padding:5px 0;color:#374151;font-size:13px;">${notes}</td>
      </tr>` : ''}
    </table>
  </td></tr></table>

  <p style="color:#9ca3af;font-size:13px;margin:16px 0 0;">
    For questions, please visit or contact the Guidance and Counseling Office directly.
  </p>
</td></tr>

<tr><td style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:16px 40px;text-align:center;">
  <p style="color:#9ca3af;font-size:12px;margin:0;">Northern Bukidnon State College — Guidance and Counseling Office</p>
  <p style="color:#9ca3af;font-size:12px;margin:4px 0 0;">Manolo Fortich, 8703 Bukidnon · www.nbsc.edu.ph</p>
  <p style="color:#d1d5db;font-size:11px;margin:6px 0 0;">This is an automated notification. Please do not reply to this email.</p>
</td></tr>

</table></td></tr></table>
</body></html>`;

    // Brevo Transactional Email API
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: 'NBSC Guidance and Counseling Office',
          email: 'gco@nbsc.edu.ph',
        },
        to: [{ email: student_email, name: student_name }],
        subject: `${icon} Counseling Update: ${statusLabel} — NBSC Guidance Office`,
        htmlContent: htmlBody,
      }),
    });

    const result = await res.json() as { message?: string; messageId?: string };

    if (!res.ok) {
      return new Response(JSON.stringify({ error: result.message || JSON.stringify(result) }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, messageId: result.messageId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
