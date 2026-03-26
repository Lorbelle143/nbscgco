import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';
import { logAudit } from '../utils/auditLog';
import { notifyConsentUpdated } from '../utils/emailNotify';

const STATUS_CONFIG = {
  signed:  { label: 'Signed',  color: 'bg-green-100 text-green-700 border-green-300',  dot: 'bg-green-500' },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 border-yellow-300', dot: 'bg-yellow-400' },
  declined:{ label: 'Declined',color: 'bg-red-100 text-red-700 border-red-300',         dot: 'bg-red-500' },
};

export default function ConsentTracker() {
  const toast = useToastContext();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'signed' | 'pending' | 'declined'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status' | 'risk'>('name');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [saving, setSaving] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState('');

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    const { data: assessments } = await supabase
      .from('mental_health_assessments')
      .select('student_id, full_name, risk_level, created_at')
      .in('risk_level', ['need-support', 'immediate-support'])
      .order('full_name');

    const unique: any[] = Object.values(
      (assessments || []).reduce((acc: any, cur: any) => {
        if (!acc[cur.student_id]) acc[cur.student_id] = cur;
        return acc;
      }, {})
    );

    const { data: consents } = await supabase.from('consent_records').select('*');
    const consentMap: Record<string, any> = {};
    (consents || []).forEach((c: any) => { consentMap[c.student_id] = c; });

    setRecords(unique.map(s => ({ ...s, consent: consentMap[s.student_id] || null })));
    setLoading(false);
  };

  const updateConsent = async (student: any, status: string, notes?: string) => {
    setSaving(student.student_id);
    try {
      const existing = student.consent;
      const notesValue = notes !== undefined ? notes : (existing?.notes || null);
      if (existing) {
        const { error } = await supabase.from('consent_records')
          .update({ status, notes: notesValue, signed_at: status === 'signed' ? new Date().toISOString() : null, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('consent_records')
          .insert({ student_id: student.student_id, full_name: student.full_name, status, notes: notesValue, signed_at: status === 'signed' ? new Date().toISOString() : null });
        if (error) throw error;
      }
      await logAudit('update', 'consent_records', student.student_id, `Consent status set to ${status} for ${student.full_name}`);
      toast.success(`Consent marked as ${status}`);

      // Get profile for email + user_id (needed for bell notification)
      const { data: profile } = await supabase.from('profiles').select('email, id').eq('student_id', student.student_id).maybeSingle();

      // In-app bell notification
      if (profile?.id && ['signed', 'declined'].includes(status)) {
        const notifMap: Record<string, { title: string; msg: string }> = {
          signed:   { title: '📋 Consent Form Signed', msg: 'Your informed consent form has been recorded by the Guidance Office. You are now cleared for counseling sessions.' },
          declined: { title: '📋 Consent Form Declined', msg: 'Your informed consent form has been marked as declined. Please visit the Guidance Office if you wish to reconsider.' },
        };
        const notif = notifMap[status];
        if (notif) {
          await supabase.from('student_notifications').insert({
            user_id: profile.id,
            student_id: student.student_id,
            type: 'consent_updated',
            title: notif.title,
            message: notif.msg,
          });
        }
      }

      if (profile?.email) notifyConsentUpdated(student.student_id, student.full_name, profile.email, status);
      setEditingNotes(null);
      load();
    } catch (e: any) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSaving(null);
    }
  };

  const filtered = records
    .filter(r => {
      const status = r.consent?.status || 'pending';
      if (filter !== 'all' && status !== filter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!r.full_name?.toLowerCase().includes(s) && !r.student_id?.toLowerCase().includes(s)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.full_name || '').localeCompare(b.full_name || '');
      if (sortBy === 'status') return (a.consent?.status || 'pending').localeCompare(b.consent?.status || 'pending');
      if (sortBy === 'risk') return (a.risk_level || '').localeCompare(b.risk_level || '');
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const counts = {
    all:     records.length,
    signed:  records.filter(r => r.consent?.status === 'signed').length,
    pending: records.filter(r => !r.consent || r.consent.status === 'pending').length,
    declined:records.filter(r => r.consent?.status === 'declined').length,
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading consent records...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['all', 'signed', 'pending', 'declined'] as const).map(key => {
          const cfg = key !== 'all' ? STATUS_CONFIG[key] : null;
          return (
            <button key={key} onClick={() => setFilter(key)}
              className={`p-5 rounded-2xl border-2 text-left transition-all hover:shadow-lg hover:-translate-y-0.5 ${filter === key ? (cfg ? cfg.color + ' border-current shadow-md' : 'bg-orange-50 border-orange-400 shadow-md') : 'bg-white border-gray-100 hover:border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                {cfg ? <span className={`w-3 h-3 rounded-full ${cfg.dot}`} /> : <span className="text-base">📋</span>}
                {filter === key && <span className="text-xs font-bold opacity-60">✓</span>}
              </div>
              <p className="text-3xl font-black text-gray-800 mb-0.5">{counts[key]}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{key}</p>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-52">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search by name or student ID..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 bg-white">
            <option value="name">Sort: Name A–Z</option>
            <option value="date">Sort: Latest First</option>
            <option value="status">Sort: Status</option>
            <option value="risk">Sort: Risk Level</option>
          </select>
          <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setViewMode('list')}
              className={`px-3 py-2 transition ${viewMode === 'list' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button onClick={() => setViewMode('grid')}
              className={`px-3 py-2 transition ${viewMode === 'grid' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
          <span className="text-sm text-gray-400 ml-auto">{filtered.length} student{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500 font-medium">No records found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map(r => (
              <ConsentRow key={r.student_id} r={r} saving={saving} editingNotes={editingNotes} notesInput={notesInput}
                setEditingNotes={setEditingNotes} setNotesInput={setNotesInput} updateConsent={updateConsent} />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(r => (
            <ConsentCard key={r.student_id} r={r} saving={saving} editingNotes={editingNotes} notesInput={notesInput}
              setEditingNotes={setEditingNotes} setNotesInput={setNotesInput} updateConsent={updateConsent} />
          ))}
        </div>
      )}
    </div>
  );
}

function ConsentActions({ r, saving, updateConsent }: any) {
  const status = r.consent?.status || 'pending';
  return (
    <div className="flex flex-wrap gap-2">
      {status === 'signed' ? (
        <button onClick={() => updateConsent(r, 'pending')} disabled={saving === r.student_id}
          className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs rounded-lg hover:bg-gray-200 transition font-medium border border-gray-300 disabled:opacity-50">
          🔄 Re-open
        </button>
      ) : (
        <>
          <button onClick={() => updateConsent(r, 'signed')} disabled={saving === r.student_id}
            className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50">
            {saving === r.student_id ? '...' : '✅ Mark Signed'}
          </button>
          {status !== 'declined' ? (
            <button onClick={() => updateConsent(r, 'declined')} disabled={saving === r.student_id}
              className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition font-semibold disabled:opacity-50">
              ✗ Declined
            </button>
          ) : (
            <button onClick={() => updateConsent(r, 'pending')} disabled={saving === r.student_id}
              className="px-3 py-1.5 bg-yellow-500 text-white text-xs rounded-lg hover:bg-yellow-600 transition font-semibold disabled:opacity-50">
              ⏳ Reset
            </button>
          )}
        </>
      )}
    </div>
  );
}

function NotesPanel({ r, editingNotes, notesInput, setEditingNotes, setNotesInput, updateConsent, saving }: any) {
  const status = r.consent?.status || 'pending';
  return (
    <>
      <button onClick={() => { setEditingNotes(editingNotes === r.student_id ? null : r.student_id); setNotesInput(r.consent?.notes || ''); }}
        className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs rounded-lg hover:bg-blue-100 transition font-medium border border-blue-200">
        📝 {r.consent?.notes ? 'Edit Notes' : 'Add Notes'}
      </button>
      {editingNotes === r.student_id && (
        <div className="mt-3 bg-blue-50 rounded-xl p-3 border border-blue-200 space-y-2">
          <textarea value={notesInput} onChange={e => setNotesInput(e.target.value)} rows={2}
            placeholder="e.g. Student declined due to privacy concerns, will follow up..."
            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 resize-none bg-white" />
          <div className="flex gap-2">
            <button onClick={() => updateConsent(r, status, notesInput)} disabled={saving === r.student_id}
              className="px-4 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50">
              Save Notes
            </button>
            <button onClick={() => setEditingNotes(null)}
              className="px-3 py-1.5 border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ConsentRow({ r, saving, editingNotes, notesInput, setEditingNotes, setNotesInput, updateConsent }: any) {
  const status = r.consent?.status || 'pending';
  const cfg = (STATUS_CONFIG as any)[status] || STATUS_CONFIG.pending;
  return (
    <div className="p-5 hover:bg-gray-50 transition-colors">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-bold text-gray-800">{r.full_name}</p>
            <span className="text-xs text-gray-400 font-mono">{r.student_id}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${r.risk_level === 'immediate-support' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-orange-100 text-orange-700 border-orange-300'}`}>
              {r.risk_level === 'immediate-support' ? '🚨 Immediate' : '⚠️ Need Support'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.color}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1`} />
              {cfg.label}
            </span>
          </div>
          {r.consent?.signed_at && (
            <p className="text-xs text-gray-400">Signed: {new Date(r.consent.signed_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          )}
          {r.consent?.notes && editingNotes !== r.student_id && (
            <p className="text-xs text-gray-600 mt-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-200">
              <span className="font-semibold text-gray-500">Remarks: </span>{r.consent.notes}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 flex-shrink-0 items-start">
          <ConsentActions r={r} saving={saving} updateConsent={updateConsent} />
          <NotesPanel r={r} editingNotes={editingNotes} notesInput={notesInput} setEditingNotes={setEditingNotes} setNotesInput={setNotesInput} updateConsent={updateConsent} saving={saving} />
        </div>
      </div>
    </div>
  );
}

function ConsentCard({ r, saving, editingNotes, notesInput, setEditingNotes, setNotesInput, updateConsent }: any) {
  const status = r.consent?.status || 'pending';
  const cfg = (STATUS_CONFIG as any)[status] || STATUS_CONFIG.pending;
  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm hover:shadow-md transition-all ${status === 'signed' ? 'border-green-200' : status === 'declined' ? 'border-red-200' : 'border-gray-100'}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 truncate">{r.full_name}</p>
            <p className="text-xs text-gray-400 font-mono">{r.student_id}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${cfg.color}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1`} />
            {cfg.label}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${r.risk_level === 'immediate-support' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-orange-100 text-orange-700 border-orange-300'}`}>
            {r.risk_level === 'immediate-support' ? '🚨 Immediate' : '⚠️ Need Support'}
          </span>
        </div>
        {r.consent?.signed_at && (
          <p className="text-xs text-gray-400 mb-2">✅ Signed {new Date(r.consent.signed_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
        )}
        {r.consent?.notes && editingNotes !== r.student_id && (
          <p className="text-xs text-gray-600 mb-3 bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-200 line-clamp-2">
            <span className="font-semibold text-gray-500">Remarks: </span>{r.consent.notes}
          </p>
        )}
        <div className="space-y-2">
          <ConsentActions r={r} saving={saving} updateConsent={updateConsent} />
          <NotesPanel r={r} editingNotes={editingNotes} notesInput={notesInput} setEditingNotes={setEditingNotes} setNotesInput={setNotesInput} updateConsent={updateConsent} saving={saving} />
        </div>
      </div>
    </div>
  );
}
