import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';
import { logAudit } from '../utils/auditLog';

interface ImportRow {
  full_name: string;
  student_id: string;
  email: string;
  password: string;
  status?: 'pending' | 'success' | 'error';
  error?: string;
}

export default function BulkImport({ onDone }: { onDone: () => void }) {
  const toast = useToastContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  const parseRows = (raw: any[][]): ImportRow[] =>
    raw.slice(1)
      .map(cols => ({
        full_name: String(cols[0] || '').trim(),
        student_id: String(cols[1] || '').trim(),
        email: String(cols[2] || '').trim(),
        password: String(cols[3] || '').trim(),
        status: 'pending' as const,
      }))
      .filter(r => r.full_name && r.student_id && r.email);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        const parsed = parseRows(raw);
        if (parsed.length === 0) { toast.error('No valid rows found. Check the Excel format.'); return; }
        setRows(parsed);
        setDone(false);
        setProgress(0);
      } catch {
        toast.error('Failed to read file. Make sure it is a valid .xlsx file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (rows.length === 0) return;
    setImporting(true);
    const updated = [...rows];

    for (let i = 0; i < updated.length; i++) {
      const row = updated[i];
      try {
        if (!row.email || !row.email.includes('@')) throw new Error('Invalid email address');
        if (!row.password || row.password.length < 6) throw new Error('Password must be at least 6 characters');

        const { data: existing } = await supabase.from('profiles').select('id').eq('student_id', row.student_id).maybeSingle();
        if (existing) throw new Error('Student ID already exists');

        let userId: string | null = null;
        if (supabaseAdmin) {
          const { data: adminData, error: adminError } = await supabaseAdmin.auth.admin.createUser({
            email: row.email, password: row.password, email_confirm: true,
            user_metadata: { full_name: row.full_name, student_id: row.student_id },
          });
          if (adminError) throw adminError;
          userId = adminData.user?.id || null;
        } else {
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: row.email, password: row.password,
            options: { data: { full_name: row.full_name, student_id: row.student_id } },
          });
          if (authError) throw authError;
          userId = authData.user?.id || null;
        }
        if (!userId) throw new Error('Failed to create auth user');

        const { error: profileError } = await (supabaseAdmin || supabase).from('profiles').insert({
          id: userId, full_name: row.full_name, student_id: row.student_id, email: row.email, is_admin: false,
        });
        if (profileError && !profileError.message.includes('duplicate')) throw profileError;

        updated[i] = { ...row, status: 'success' };
      } catch (e: any) {
        updated[i] = { ...row, status: 'error', error: e.message };
      }
      setRows([...updated]);
      setProgress(Math.round(((i + 1) / updated.length) * 100));
    }

    const successCount = updated.filter(r => r.status === 'success').length;
    await logAudit('create', 'bulk_import', 'users', `Bulk imported ${successCount}/${updated.length} students`);
    toast.success(`Imported ${successCount} of ${updated.length} students`);
    setImporting(false);
    setDone(true);
    if (successCount > 0) onDone();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['full_name', 'student_id', 'email', 'password'],
      ['Juan Dela Cruz', '2024-0001', 'juandelacruz@gmail.com', 'password123'],
    ]);
    ws['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 30 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'bulk_import_template.xlsx');
  };

  const successCount = rows.filter(r => r.status === 'success').length;
  const errorCount = rows.filter(r => r.status === 'error').length;

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <h3 className="font-semibold text-blue-800 mb-2">Excel Format (.xlsx)</h3>
        <p className="text-sm text-blue-700 mb-3">
          Upload an Excel file with columns: <code className="bg-blue-100 px-1 rounded">full_name, student_id, email, password</code>
        </p>
        <button onClick={downloadTemplate} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition font-medium">
          📥 Download Template (.xlsx)
        </button>
      </div>

      <div
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-orange-400 transition cursor-pointer"
        onClick={() => fileRef.current?.click()}
      >
        <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <p className="text-gray-600 font-medium">Click to upload Excel file (.xlsx)</p>
        <p className="text-sm text-gray-400 mt-1">or drag and drop</p>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
      </div>

      {rows.length > 0 && (
        <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-800">{rows.length} rows loaded</span>
            {done && (
              <span className="text-sm">
                <span className="text-green-600 font-medium">{successCount} success</span>
                {errorCount > 0 && <span className="text-red-600 font-medium ml-2">{errorCount} failed</span>}
              </span>
            )}
          </div>

          {importing && (
            <div className="px-5 py-3 bg-orange-50 border-b border-orange-100">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-sm font-medium text-orange-700">{progress}%</span>
              </div>
            </div>
          )}

          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Student ID</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => (
                  <tr key={i} className={row.status === 'error' ? 'bg-red-50' : row.status === 'success' ? 'bg-green-50' : ''}>
                    <td className="px-4 py-2 text-gray-800">{row.full_name}</td>
                    <td className="px-4 py-2 text-gray-600">{row.student_id}</td>
                    <td className="px-4 py-2 text-gray-600">{row.email}</td>
                    <td className="px-4 py-2">
                      {row.status === 'success' && <span className="text-green-600 font-medium">✅ Success</span>}
                      {row.status === 'error' && <span className="text-red-600 text-xs">❌ {row.error}</span>}
                      {row.status === 'pending' && <span className="text-gray-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!done && (
            <div className="px-5 py-4 border-t border-gray-100">
              <button onClick={handleImport} disabled={importing}
                className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-medium disabled:opacity-50">
                {importing ? 'Importing...' : `Import ${rows.length} Students`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
