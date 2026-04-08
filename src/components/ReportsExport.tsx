import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';

export default function ReportsExport() {
  const toast = useToastContext();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());

  useEffect(() => { loadStats(); }, [semesterFilter, yearFilter]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [{ data: assessments }, { data: sessions }, { data: consents }, { data: students }] = await Promise.all([
        supabase.from('mental_health_assessments').select('*').order('created_at', { ascending: false }).limit(1000),
        supabase.from('counseling_sessions').select('*').order('session_date', { ascending: false }).limit(1000),
        supabase.from('consent_records').select('*').limit(1000),
        supabase.from('profiles').select('id, full_name, student_id, email, created_at').eq('is_admin', false).limit(1000),
      ]);

      const a = assessments || [];
      const s = sessions || [];
      const c = consents || [];
      const st = students || [];

      setStats({
        totalStudents: st.length,
        totalAssessments: a.length,
        doingWell: a.filter(x => x.risk_level === 'doing-well').length,
        needSupport: a.filter(x => x.risk_level === 'need-support').length,
        immediateSupport: a.filter(x => x.risk_level === 'immediate-support').length,
        counseled: a.filter(x => x.is_counseled).length,
        totalSessions: s.length,
        completedSessions: s.filter(x => x.session_status === 'completed').length,
        noShowSessions: s.filter(x => x.session_status === 'no-show').length,
        consentSigned: c.filter(x => x.status === 'signed').length,
        consentPending: c.filter(x => x.status === 'pending' || !x.status).length,
        consentDeclined: c.filter(x => x.status === 'declined').length,
        avgScore: a.length ? (a.reduce((sum, x) => sum + (x.total_score || 0), 0) / a.length).toFixed(1) : 0,
        assessments: a,
        sessions: s,
        students: st,
      });
    } catch (e: any) {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!stats) return;
    const now = new Date();
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>NBSC Guidance Office — Summary Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 32px; }
  .header { text-align: center; border-bottom: 3px solid #1a3a6b; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 16px; color: #1a3a6b; font-weight: bold; }
  .header h2 { font-size: 13px; color: #444; margin-top: 4px; }
  .header p { font-size: 11px; color: #666; margin-top: 4px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 13px; font-weight: bold; color: #1a3a6b; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
  .stat-box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-box .num { font-size: 28px; font-weight: bold; color: #1a3a6b; }
  .stat-box .label { font-size: 10px; color: #666; margin-top: 2px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #1a3a6b; color: white; padding: 8px 10px; text-align: left; }
  td { padding: 7px 10px; border-bottom: 1px solid #f0f0f0; }
  tr:nth-child(even) td { background: #f9fafb; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: bold; }
  .badge-red { background: #fee2e2; color: #dc2626; }
  .badge-orange { background: #ffedd5; color: #ea580c; }
  .badge-green { background: #dcfce7; color: #16a34a; }
  .footer { margin-top: 32px; border-top: 1px solid #ddd; padding-top: 12px; text-align: center; font-size: 10px; color: #999; }
</style></head><body>
<div class="header">
  <h1>Northern Bukidnon State College</h1>
  <h2>Guidance and Counseling Office — Summary Report</h2>
  <p>Generated: ${now.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })} at ${now.toLocaleTimeString('en-PH')}</p>
</div>

<div class="section">
  <div class="section-title">Overview</div>
  <div class="grid">
    <div class="stat-box"><div class="num">${stats.totalStudents}</div><div class="label">Registered Students</div></div>
    <div class="stat-box"><div class="num">${stats.totalAssessments}</div><div class="label">Total Assessments</div></div>
    <div class="stat-box"><div class="num">${stats.avgScore}</div><div class="label">Avg. Assessment Score</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Mental Health Assessment Results</div>
  <div class="grid">
    <div class="stat-box"><div class="num" style="color:#16a34a">${stats.doingWell}</div><div class="label">Doing Well</div></div>
    <div class="stat-box"><div class="num" style="color:#ea580c">${stats.needSupport}</div><div class="label">Need Support</div></div>
    <div class="stat-box"><div class="num" style="color:#dc2626">${stats.immediateSupport}</div><div class="label">Immediate Support</div></div>
  </div>
  <table>
    <thead><tr><th>Student Name</th><th>Student ID</th><th>Score</th><th>Risk Level</th><th>Status</th><th>Date</th></tr></thead>
    <tbody>
      ${stats.assessments.filter((a: any) => a.risk_level !== 'doing-well').map((a: any) => `
        <tr>
          <td>${a.full_name}</td>
          <td>${a.student_id}</td>
          <td>${a.total_score}/20</td>
          <td><span class="badge ${a.risk_level === 'immediate-support' ? 'badge-red' : 'badge-orange'}">${a.risk_level === 'immediate-support' ? 'Immediate' : 'Need Support'}</span></td>
          <td>${a.counseling_status || 'pending'}</td>
          <td>${new Date(a.created_at).toLocaleDateString('en-PH')}</td>
        </tr>`).join('')}
    </tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">Counseling Sessions</div>
  <div class="grid">
    <div class="stat-box"><div class="num">${stats.totalSessions}</div><div class="label">Total Sessions</div></div>
    <div class="stat-box"><div class="num" style="color:#16a34a">${stats.completedSessions}</div><div class="label">Completed</div></div>
    <div class="stat-box"><div class="num" style="color:#dc2626">${stats.noShowSessions}</div><div class="label">No Show</div></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Informed Consent Status</div>
  <div class="grid">
    <div class="stat-box"><div class="num" style="color:#16a34a">${stats.consentSigned}</div><div class="label">Signed</div></div>
    <div class="stat-box"><div class="num" style="color:#d97706">${stats.consentPending}</div><div class="label">Pending</div></div>
    <div class="stat-box"><div class="num" style="color:#dc2626">${stats.consentDeclined}</div><div class="label">Declined</div></div>
  </div>
</div>

<div class="footer">
  <p>Northern Bukidnon State College — Guidance and Counseling Office</p>
  <p>Manolo Fortich, 8703 Bukidnon · This report is confidential and for official use only.</p>
</div>
</body></html>`;

    const win = window.open('', '_blank');
    if (!win) { toast.error('Allow popups to export PDF'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
    toast.success('Report opened — use Print > Save as PDF');
  };

  const exportCSV = () => {
    if (!stats) return;
    const rows = [
      ['Student Name', 'Student ID', 'Score', 'Risk Level', 'Counseling Status', 'Is Counseled', 'Assessment Date'],
      ...stats.assessments.map((a: any) => [
        a.full_name, a.student_id, a.total_score, a.risk_level,
        a.counseling_status || 'pending', a.is_counseled ? 'Yes' : 'No',
        new Date(a.created_at).toLocaleDateString('en-PH'),
      ]),
    ];
    const csv = rows.map(r => r.map((v: any) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nbsc-guidance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const exportExcel = () => {
    if (!stats) return;
    const wb = XLSX.utils.book_new();

    // Sheet 1 — Assessments
    const assessmentData = [
      ['Student Name', 'Student ID', 'Score', 'Risk Level', 'Counseling Status', 'Is Counseled', 'Assessment Date'],
      ...stats.assessments.map((a: any) => [
        a.full_name, a.student_id, a.total_score, a.risk_level,
        a.counseling_status || 'pending', a.is_counseled ? 'Yes' : 'No',
        new Date(a.created_at).toLocaleDateString('en-PH'),
      ]),
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(assessmentData);
    ws1['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Assessments');

    // Sheet 2 — Summary
    const summaryData = [
      ['Metric', 'Value'],
      ['Registered Students', stats.totalStudents],
      ['Total Assessments', stats.totalAssessments],
      ['Avg. Assessment Score', stats.avgScore],
      ['Doing Well', stats.doingWell],
      ['Need Support', stats.needSupport],
      ['Immediate Support', stats.immediateSupport],
      ['Counseled', stats.counseled],
      ['Total Sessions', stats.totalSessions],
      ['Completed Sessions', stats.completedSessions],
      ['No Show Sessions', stats.noShowSessions],
      ['Consent Signed', stats.consentSigned],
      ['Consent Pending', stats.consentPending],
      ['Consent Declined', stats.consentDeclined],
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
    ws2['!cols'] = [{ wch: 28 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Summary');

    // Sheet 3 — Students
    const studentData = [
      ['Full Name', 'Student ID', 'Email', 'Registered Date'],
      ...stats.students.map((s: any) => [
        s.full_name, s.student_id, s.email,
        new Date(s.created_at).toLocaleDateString('en-PH'),
      ]),
    ];
    const ws3 = XLSX.utils.aoa_to_sheet(studentData);
    ws3['!cols'] = [{ wch: 25 }, { wch: 14 }, { wch: 30 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Students');

    XLSX.writeFile(wb, `nbsc-guidance-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel report exported');
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading report data...</div>;
  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Export Buttons */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <h3 className="font-bold text-gray-800 mb-4">Generate Reports</h3>
        <div className="flex flex-wrap gap-3">
          <button onClick={exportPDF}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition shadow-md">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Export PDF Report
          </button>
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition shadow-md">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV (Assessments)
          </button>
          <button onClick={exportExcel}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition shadow-md">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Excel (.xlsx)
          </button>
          <button onClick={loadStats}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Registered Students', value: stats.totalStudents, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Total Assessments', value: stats.totalAssessments, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Flagged Students', value: stats.needSupport + stats.immediateSupport, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Counseled', value: stats.counseled, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-5 border border-white shadow-sm`}>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-sm text-gray-600 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Risk Distribution */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h4 className="font-bold text-gray-800 mb-4">Risk Distribution</h4>
          <div className="space-y-3">
            {[
              { label: 'Doing Well', value: stats.doingWell, total: stats.totalAssessments, color: 'bg-green-500' },
              { label: 'Need Support', value: stats.needSupport, total: stats.totalAssessments, color: 'bg-orange-500' },
              { label: 'Immediate Support', value: stats.immediateSupport, total: stats.totalAssessments, color: 'bg-red-500' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-semibold">{item.value}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: item.total ? `${(item.value / item.total) * 100}%` : '0%' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sessions Summary */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h4 className="font-bold text-gray-800 mb-4">Counseling Sessions</h4>
          <div className="space-y-3">
            {[
              { label: 'Total Sessions', value: stats.totalSessions, color: 'text-blue-600' },
              { label: 'Completed', value: stats.completedSessions, color: 'text-green-600' },
              { label: 'No Show', value: stats.noShowSessions, color: 'text-red-600' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{item.label}</span>
                <span className={`text-xl font-bold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Consent Summary */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h4 className="font-bold text-gray-800 mb-4">Informed Consent</h4>
          <div className="space-y-3">
            {[
              { label: 'Signed', value: stats.consentSigned, color: 'text-green-600' },
              { label: 'Pending', value: stats.consentPending, color: 'text-yellow-600' },
              { label: 'Declined', value: stats.consentDeclined, color: 'text-red-600' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-600">{item.label}</span>
                <span className={`text-xl font-bold ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
