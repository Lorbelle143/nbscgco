// PDF export — opens a new window with all 4 NBSC forms, user saves as PDF via browser print dialog

import { buildFormsHtml, buildMentalHealthFormHtml, buildMentalHealthListHtml } from './formHtml';

function openPrintWindow(html: string) {
  const win = window.open('', '_blank', 'width=1000,height=800');
  if (!win) { alert('Please allow popups to export PDF.'); return; }
  win.document.write(html);
  win.document.close();
  setTimeout(() => { win.focus(); win.print(); }, 800);
}

export function exportSubmissionPDF(submission: any) {
  openPrintWindow(buildFormsHtml(submission));
}

export function exportAllSubmissionsPDF(submissions: any[]) {
  const rows = submissions.map((s, i) => {
    const f = s.form_data || {};
    return `<tr>
      <td style="text-align:center;">${i+1}</td>
      <td>${s.student_id||''}</td>
      <td>${f.lastName||''}, ${f.firstName||''} ${f.middleInitial||''}</td>
      <td>${s.course||''}</td>
      <td style="text-align:center;">${s.year_level||''}</td>
      <td>${f.gender||''}</td>
      <td>${s.contact_number||f.mobilePhone||''}</td>
      <td style="text-align:center;">${new Date(s.created_at).toLocaleDateString()}</td>
    </tr>`;
  }).join('');

  const origin = window.location.origin;

  const css = `
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;background:#fff;color:#000;}
    .page{width:210mm;height:297mm;overflow:hidden;}
    .inner{width:114%;transform:scale(0.877);transform-origin:top left;padding:8mm 12mm 5mm 12mm;display:flex;flex-direction:column;height:114%;}
    table{width:100%;border-collapse:collapse;}
    td,th{border:1px solid #000;padding:3px 5px;vertical-align:middle;font-size:10px;}
    th{background:#1a3a6b;color:#fff;font-size:10px;padding:5px;}
    tr:nth-child(even) td{background:#f8fafc;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}@page{size:A4;margin:0;}}
  `;

  const header = `
  <div style="display:flex;align-items:center;margin-bottom:0;">
    <div style="flex:0 0 90px;text-align:center;">
      <img src="${origin}/nbsc-logo.png" alt="NBSC" style="width:82px;height:82px;object-fit:contain;display:block;margin:0 auto;"/>
    </div>
    <div style="flex:1;text-align:center;padding:0 10px;">
      <div style="font-size:9px;color:#000;">Republic of the Philippines</div>
      <div style="font-size:19px;font-weight:bold;text-transform:uppercase;color:#000;line-height:1.2;">Northern Bukidnon State College</div>
      <div style="font-size:10px;color:#000;margin-top:2px;">Manolo Fortich, 8703 Bukidnon</div>
      <div style="font-size:8.5px;font-style:italic;color:#c8a000;margin-top:2px;">Creando Futura, Transformationis Vitae, Ductae a Deo</div>
    </div>
  </div>
  <div style="border-top:2px solid #7a9cc8;margin:5px 0 6px;"></div>
  <div style="text-align:center;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Student Inventory Report</div>
  <div style="text-align:center;font-size:9px;color:#64748b;margin-bottom:8px;">
    Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total Students: ${submissions.length}
  </div>`;

  const footer = `
  <div style="margin-top:auto;padding-top:4px;">
    <div style="border-top:2px solid #7a9cc8;margin:0 0 4px;"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 8px;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
        <img src="${origin}/bagong-pilipinas.jpg" alt="Bagong Pilipinas" style="width:34px;height:34px;object-fit:contain;"/>
        <span style="font-size:6px;font-weight:bold;color:#0038A8;">BAGONG PILIPINAS</span>
      </div>
      <div style="display:flex;align-items:center;gap:5px;">
        <img src="${origin}/fb-logo.png" alt="Facebook" style="width:20px;height:20px;object-fit:contain;border-radius:50%;"/>
        <span style="font-size:8.5px;color:#4a6fa5;">NorthernBukidnonStateCollegeOfficial</span>
      </div>
      <span style="font-size:8.5px;color:#4a6fa5;">www.nbsc.edu.ph</span>
    </div>
  </div>`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Student Inventory Report</title><style>${css}</style></head><body>
  <div class="page"><div class="inner">
    ${header}
    <table>
      <thead><tr><th>#</th><th>Student ID</th><th>Name</th><th>Course</th><th>Year</th><th>Gender</th><th>Contact</th><th>Submitted</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:#94a3b8;">No submissions</td></tr>'}</tbody>
    </table>
    <div style="margin-top:8px;padding:5px 8px;background:#fef3c7;border:1px solid #f59e0b;border-radius:4px;font-size:9px;color:#92400e;text-align:center;">
      CONFIDENTIAL — For authorized personnel only &nbsp;|&nbsp; Northern Bukidnon State College — Guidance and Counseling Office
    </div>
    ${footer}
  </div></div>
  </body></html>`;

  openPrintWindow(html);
}

export function exportMentalHealthPDF(assessments: any[]) {
  openPrintWindow(buildMentalHealthListHtml(assessments));
}

export function exportAnalyticsPDF(analytics: any, submissions: any[], students: any[]) {
  const nbscHeader = (title: string) => `
  <div style="display:flex;align-items:center;margin-bottom:0;">
    <div style="flex:0 0 90px;text-align:center;">
      <img src="${window.location.origin}/nbsc-logo.png" alt="NBSC Logo" style="width:82px;height:82px;object-fit:contain;display:block;margin:0 auto;"/>
    </div>
    <div style="flex:1;text-align:center;padding:0 10px;">
      <div style="font-size:9px;color:#000;letter-spacing:0.3px;">Republic of the Philippines</div>
      <div style="font-size:19px;font-weight:bold;text-transform:uppercase;color:#000;line-height:1.2;letter-spacing:0.5px;">Northern Bukidnon State College</div>
      <div style="font-size:10px;color:#000;margin-top:2px;">Manolo Fortich, 8703 Bukidnon</div>
      <div style="font-size:8.5px;font-style:italic;color:#c8a000;margin-top:2px;">Creando Futura, Transformationis Vitae, Ductae a Deo</div>
    </div>
    <div style="flex:0 0 auto;"></div>
  </div>
  <div style="border-top:2px solid #7a9cc8;margin:5px 0 6px;"></div>
  <div style="text-align:center;font-size:14px;font-weight:bold;text-transform:uppercase;letter-spacing:1px;margin-bottom:14px;">${title}</div>`;

  const footerHtml = `
  <div style="margin-top:auto;padding-top:6px;">
    <div style="border-top:2px solid #7a9cc8;margin:0 0 5px;"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;padding:0 8px;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:1px;">
        <img src="${window.location.origin}/bagong-pilipinas.jpg" alt="Bagong Pilipinas" style="width:36px;height:36px;object-fit:contain;"/>
        <span style="font-size:6.5px;font-weight:bold;color:#0038A8;">BAGONG PILIPINAS</span>
      </div>
      <div style="display:flex;align-items:center;gap:6px;">
        <img src="${window.location.origin}/fb-logo.png" alt="Facebook" style="width:22px;height:22px;object-fit:contain;border-radius:50%;"/>
        <span style="font-size:9px;color:#4a6fa5;">NorthernBukidnonStateCollegeOfficial</span>
      </div>
      <div style="font-size:9px;color:#4a6fa5;">www.nbsc.edu.ph</div>
    </div>
  </div>`;

  const mh = analytics.mentalHealthStats || {};
  const total = submissions.length || 1;

  const statCard = (label: string, value: string | number, color: string) =>
    `<div style="border:1px solid #e2e8f0;border-left:4px solid ${color};border-radius:6px;padding:12px 16px;text-align:center;">
      <div style="font-size:28px;font-weight:bold;color:${color};">${value}</div>
      <div style="font-size:10px;color:#64748b;margin-top:2px;">${label}</div>
    </div>`;

  const barRow = (label: string, count: number, pct: string, color: string) =>
    `<tr>
      <td style="padding:5px 8px;font-size:11px;width:40%;">${label}</td>
      <td style="padding:5px 8px;font-size:11px;width:10%;text-align:center;font-weight:bold;">${count}</td>
      <td style="padding:5px 8px;width:50%;">
        <div style="display:flex;align-items:center;gap:6px;">
          <div style="flex:1;background:#e2e8f0;border-radius:4px;height:10px;">
            <div style="width:${pct}%;background:${color};height:10px;border-radius:4px;"></div>
          </div>
          <span style="font-size:10px;color:#64748b;min-width:36px;">${pct}%</span>
        </div>
      </td>
    </tr>`;

  const courseRows = Object.entries(analytics.courseCount || {}).map(([c, n]) =>
    barRow(c, Number(n), ((Number(n)/total)*100).toFixed(1), '#3b82f6')
  ).join('');

  const yearRows = Object.entries(analytics.yearCount || {}).map(([y, n]) =>
    barRow(`Year ${y}`, Number(n), ((Number(n)/total)*100).toFixed(1), '#10b981')
  ).join('');

  const genderRows = Object.entries(analytics.genderCount || {}).map(([g, n]) =>
    barRow(g, Number(n), ((Number(n)/total)*100).toFixed(1), '#8b5cf6')
  ).join('');

  const monthRows = Object.entries(analytics.monthlySubmissions || {}).map(([m, n]) => {
    const max = Math.max(...Object.values(analytics.monthlySubmissions || {}).map(Number), 1);
    return barRow(m, Number(n), ((Number(n)/max)*100).toFixed(1), '#f59e0b');
  }).join('');

  const css = `
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:Arial,sans-serif;background:#fff;color:#000;}
    .page{width:210mm;height:297mm;overflow:hidden;}
    .inner{width:117%;transform:scale(0.855);transform-origin:top left;padding:8mm 12mm 5mm 12mm;display:flex;flex-direction:column;height:117%;}
    table{width:100%;border-collapse:collapse;}
    td,th{border:1px solid #e2e8f0;padding:3px 6px;vertical-align:middle;font-size:10px;}
    th{background:#1a3a6b;color:#fff;font-size:10px;padding:5px 6px;}
    .sec{background:#1a3a6b;color:#fff;font-weight:bold;font-size:10px;padding:4px 6px;margin:8px 0 3px;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}@page{size:A4;margin:0;}}
  `;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Analytics Report — NBSC GCO</title><style>${css}</style></head><body>
  <div class="page">
  <div class="inner">
    ${nbscHeader('Guidance and Counseling Office — Analytics Report')}

    <div style="font-size:9px;color:#64748b;margin-bottom:8px;text-align:center;">
      Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; Total Students: ${students.length} &nbsp;|&nbsp; Total Submissions: ${submissions.length}
    </div>

    <!-- Summary Cards -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;">
      ${statCard('Total Students', students.length, '#3b82f6')}
      ${statCard('Completed Forms', submissions.length, '#10b981')}
      ${statCard('Completion Rate', analytics.completionRate + '%', '#8b5cf6')}
      ${statCard('MH Assessments', mh.total || 0, '#f59e0b')}
    </div>

    <!-- 2-column layout for distributions -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:6px;">
      <div>
        <div class="sec">Course Distribution</div>
        <table><thead><tr><th>Course</th><th>Count</th><th>Distribution</th></tr></thead>
        <tbody>${courseRows || '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No data</td></tr>'}</tbody></table>

        <div class="sec">Year Level Distribution</div>
        <table><thead><tr><th>Year Level</th><th>Count</th><th>Distribution</th></tr></thead>
        <tbody>${yearRows || '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No data</td></tr>'}</tbody></table>
      </div>
      <div>
        <div class="sec">Gender Distribution</div>
        <table><thead><tr><th>Gender</th><th>Count</th><th>Distribution</th></tr></thead>
        <tbody>${genderRows || '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No data</td></tr>'}</tbody></table>

        <div class="sec">Monthly Submissions (Last 6 Months)</div>
        <table><thead><tr><th>Month</th><th>Count</th><th>Distribution</th></tr></thead>
        <tbody>${monthRows || '<tr><td colspan="3" style="text-align:center;color:#94a3b8;">No data</td></tr>'}</tbody></table>
      </div>
    </div>

    <!-- Mental Health -->
    <div class="sec">Mental Health Assessment Summary</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:4px 0 6px;">
      ${statCard('Doing Well', mh.doingWell || 0, '#10b981')}
      ${statCard('Need Support', mh.needSupport || 0, '#f59e0b')}
      ${statCard('Immediate Support', mh.immediateSupport || 0, '#ef4444')}
    </div>
    <table>
      <thead><tr><th>Category</th><th style="text-align:center;">Count</th></tr></thead>
      <tbody>
        <tr><td>Requires Counseling</td><td style="text-align:center;font-weight:bold;">${mh.requiresCounseling || 0}</td></tr>
        <tr><td>Suicidal Thoughts Reported</td><td style="text-align:center;font-weight:bold;color:#dc2626;">${mh.hasSuicidalThoughts || 0}</td></tr>
        <tr><td>Average Score</td><td style="text-align:center;font-weight:bold;">${mh.averageScore || 0}</td></tr>
      </tbody>
    </table>

    <div style="margin-top:8px;padding:5px 8px;background:#fef3c7;border:1px solid #f59e0b;border-radius:4px;font-size:9px;color:#92400e;text-align:center;">
      CONFIDENTIAL — For authorized personnel only &nbsp;|&nbsp; Northern Bukidnon State College — Guidance and Counseling Office
    </div>

    ${footerHtml}
  </div>
  </div>
  </body></html>`;

  openPrintWindow(html);
}

export function exportMentalHealthCSV(assessments: any[]) {
  const headers = ['Student Name', 'Student ID', 'Total Score', 'Risk Level', 'Feeling Alone', 'Feeling Blue', 'Easily Annoyed', 'Tense/Anxious', 'Suicidal Thoughts', 'Requires Counseling', 'Counseling Notes', 'Date'];
  const rows = assessments.map(a => [
    a.full_name || '',
    a.student_id || '',
    a.total_score ?? '',
    a.risk_level || '',
    a.feeling_alone ?? '',
    a.feeling_blue ?? '',
    a.feeling_easily_annoyed ?? '',
    a.feeling_tense_anxious ?? '',
    a.having_suicidal_thoughts ?? '',
    a.requires_counseling ? 'Yes' : 'No',
    `"${(a.counseling_notes || '').replace(/"/g, '""')}"`,
    new Date(a.created_at).toLocaleDateString()
  ]);
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mental_health_assessments_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

export function exportStudentMentalHealthPDF(studentName: string, studentId: string, assessments: any[]) {
  openPrintWindow(buildMentalHealthFormHtml(studentName, studentId, assessments));
}
