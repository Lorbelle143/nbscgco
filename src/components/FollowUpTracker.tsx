import { useEffect, useState } from 'react';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';
import { logAudit } from '../utils/auditLog';

const STATUS_CONFIG = {
  pending:     { label: 'Pending',     color: 'bg-gray-100 text-gray-700 border-gray-300',   dot: 'bg-gray-400',   ring: 'ring-gray-300' },
  scheduled:   { label: 'Scheduled',   color: 'bg-blue-100 text-blue-700 border-blue-300',   dot: 'bg-blue-500',   ring: 'ring-blue-300' },
  'in-progress':{ label: 'In Progress', color: 'bg-amber-100 text-amber-700 border-amber-300', dot: 'bg-amber-500', ring: 'ring-amber-300' },
  completed:   { label: 'Completed',   color: 'bg-green-100 text-green-700 border-green-300', dot: 'bg-green-500',  ring: 'ring-green-300' },
};

const STATUS_MESSAGES: Record<string, string> = {
  scheduled:    'Your counseling session has been scheduled. Please visit the Guidance and Counseling Office at your earliest convenience.',
  'in-progress':'Your counseling session is currently in progress. Please continue to cooperate with your counselor.',
  completed:    'Your counseling session has been completed. Thank you for participating. The Guidance Office is always here if you need further support.',
  pending:      'Your follow-up status has been updated.',
};

export default function FollowUpTracker() {
  const toast = useToastContext();
  const [assessments, setAssessments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'scheduled' | 'in-progress' | 'completed'>('all');
  const [riskFilter, setRiskFilter] = useState<'all' | 'need-support' | 'immediate-support'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'score' | 'status'>('date');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ counseling_status: '', counselor_notes: '' });
  const [saving, setSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mental_health_assessments')
        .select('*')
        .in('risk_level', ['need-support', 'immediate-support'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = data || [];
      const ids = list.map((a: any) => a.student_id);
      const { data: consents } = await supabase
        .from('consent_records')
        .select('student_id, status')
        .in('student_id', ids);
      const consentMap: Record<string, string> = {};
      (consents || []).forEach((c: any) => { consentMap[c.student_id] = c.status; });
      setAssessments(list.map((a: any) => ({ ...a, consent_status: consentMap[a.student_id] || null })));
    } catch {
      toast.error('Failed to load follow-up data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (a: any) => {
    setEditingId(a.id);
    setEditData({ counseling_status: a.counseling_status || 'pending', counselor_notes: a.counselor_notes || '' });
  };

  const sendFollowUpEmail = async (a: any, status: string, notes: string) => {
    setSendingEmail(true);
    try {
      const client = supabaseAdmin || supabase;
      const { data: profile } = await client.from('profiles').select('email').eq('student_id', a.student_id).maybeSingle();
      if (!profile?.email) { toast.error('Could not find student email'); return; }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/send-followup-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseAnonKey}`, 'apikey': supabaseAnonKey },
        body: JSON.stringify({ student_email: profile.email, student_name: a.full_name, student_id: a.student_id, status, notes: notes || '' }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to send email');
      toast.success(`📧 Email sent to ${profile.email}`);
    } catch (e: any) {
      toast.error('Email failed: ' + (e.message || 'Unknown error'));
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSave = async (a: any) => {
    setSaving(true);
    try {
      if (editData.counseling_status === 'completed') {
        const { data: consentRecord } = await supabase.from('consent_records').select('status').eq('student_id', a.student_id).maybeSingle();
        if (!consentRecord || consentRecord.status !== 'signed') {
          toast.error('Cannot mark as Completed — student has not signed the informed consent form yet. Go to Consent Tracker first.');
          setSaving(false);
          return;
        }
      }
      const updates: any = {
        counseling_status: editData.counseling_status,
        counselor_notes: editData.counselor_notes,
        updated_at: new Date().toISOString(),
      };
      if (editData.counseling_status === 'completed') {
        updates.is_counseled = true;
        updates.counseled_at = new Date().toISOString();
      }
      const { error } = await supabase.from('mental_health_assessments').update(updates).eq('id', a.id);
      if (error) throw error;

      if (['scheduled', 'in-progress'].includes(editData.counseling_status)) {
        const { data: existing } = await supabase.from('consent_records').select('id').eq('student_id', a.student_id).maybeSingle();
        if (!existing) {
          await supabase.from('consent_records').insert({ student_id: a.student_id, full_name: a.full_name, status: 'pending' });
        }
      }

      if (['scheduled', 'completed', 'in-progress'].includes(editData.counseling_status)) {
        const notifTitle = editData.counseling_status === 'completed' ? 'Counseling Session Completed'
          : editData.counseling_status === 'in-progress' ? 'Counseling Session In Progress' : 'Counseling Session Scheduled';
        const notifMsg = STATUS_MESSAGES[editData.counseling_status] + (editData.counselor_notes ? ` Notes: ${editData.counselor_notes}` : '');
        await supabase.from('student_notifications').insert({
          user_id: a.user_id, student_id: a.student_id, type: 'counseling_scheduled',
          title: notifTitle, message: notifMsg, related_id: a.id,
        });
      }

      await logAudit('update', 'mental_health', a.id, `Updated counseling status to ${editData.counseling_status} for ${a.full_name}`);
      toast.success('Follow-up status updated');
      setEditingId(null);
      load();
      if (['scheduled', 'in-progress', 'completed'].includes(editData.counseling_status)) {
        await sendFollowUpEmail(a, editData.counseling_status, editData.counselor_notes);
      }
    } catch (e: any) {
      toast.error('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const filtered = assessments
    .filter(a => {
      if (filter !== 'all' && (a.counseling_status || 'pending') !== filter) return false;
      if (riskFilter !== 'all' && a.risk_level !== riskFilter) return false;
      if (searchTerm) {
        const s = searchTerm.toLowerCase();
        if (!a.full_name?.toLowerCase().includes(s) && !a.student_id?.toLowerCase().includes(s)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return (a.full_name || '').localeCompare(b.full_name || '');
      if (sortBy === 'score') return (b.total_score || 0) - (a.total_score || 0);
      if (sortBy === 'status') return (a.counseling_status || 'pending').localeCompare(b.counseling_status || 'pending');
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  const counts = {
    pending:     assessments.filter(a => !a.counseling_status || a.counseling_status === 'pending').length,
    scheduled:   assessments.filter(a => a.counseling_status === 'scheduled').length,
    'in-progress': assessments.filter(a => a.counseling_status === 'in-progress').length,
    completed:   assessments.filter(a => a.counseling_status === 'completed').length,
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading follow-up data...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(Object.entries(counts) as [string, number][]).map(([status, count]) => {
          const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
          const isActive = filter === status;
          return (
            <button key={status} onClick={() => setFilter(isActive ? 'all' : status as any)}
              className={`p-5 rounded-2xl border-2 text-left transition-all hover:shadow-lg hover:-translate-y-0.5 ${isActive ? cfg.color + ' border-current shadow-md' : 'bg-white border-gray-100 hover:border-gray-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`w-3 h-3 rounded-full ${cfg.dot}`} />
                {isActive && <span className="text-xs font-bold opacity-60">✓ Active</span>}
              </div>
              <p className="text-3xl font-black text-gray-800 mb-0.5">{count}</p>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{cfg.label}</p>
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-52">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search by name or student ID..." value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
          </div>
          {/* Risk filter */}
          <select value={riskFilter} onChange={e => setRiskFilter(e.target.value as any)}
            className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 bg-white">
            <option value="all">All Risk Levels</option>
            <option value="need-support">⚠️ Need Support</option>
            <option value="immediate-support">🚨 Immediate Support</option>
          </select>
          {/* Sort */}
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 bg-white">
            <option value="date">Sort: Latest First</option>
            <option value="name">Sort: Name A–Z</option>
            <option value="score">Sort: Highest Score</option>
            <option value="status">Sort: Status</option>
          </select>
          {/* View toggle */}
          <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm transition ${viewMode === 'list' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm transition ${viewMode === 'grid' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
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
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-500 font-medium">No students match this filter</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-50">
            {filtered.map(a => <FollowUpRow key={a.id} a={a} editingId={editingId} editData={editData} setEditData={setEditData} saving={saving} sendingEmail={sendingEmail} handleEdit={handleEdit} handleSave={handleSave} setEditingId={setEditingId} />)}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => <FollowUpCard key={a.id} a={a} editingId={editingId} editData={editData} setEditData={setEditData} saving={saving} sendingEmail={sendingEmail} handleEdit={handleEdit} handleSave={handleSave} setEditingId={setEditingId} />)}
        </div>
      )}
    </div>
  );
}

function ConsentBadge({ status }: { status: string | null }) {
  if (status === 'signed') return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 border border-green-300">📋 Consent ✓</span>;
  if (status === 'declined') return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300">📋 Declined</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-300">📋 No Consent</span>;
}

function EditPanel({ a, editData, setEditData, saving, sendingEmail, handleSave, setEditingId }: any) {
  return (
    <div className="mt-4 bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Counseling Status</label>
          <select value={editData.counseling_status}
            onChange={e => setEditData((d: any) => ({ ...d, counseling_status: e.target.value }))}
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500">
            <option value="pending">Pending</option>
            <option value="scheduled">Scheduled</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          {editData.counseling_status === 'completed' && a.consent_status !== 'signed' && (
            <p className="text-xs text-red-600 mt-1">⚠️ Consent not yet signed — cannot mark as Completed</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Counselor Notes</label>
          <textarea value={editData.counselor_notes}
            onChange={e => setEditData((d: any) => ({ ...d, counselor_notes: e.target.value }))}
            rows={2} placeholder="Add notes..."
            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 resize-none" />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={() => setEditingId(null)}
          className="px-4 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-100 transition">Cancel</button>
        <button onClick={() => handleSave(a)} disabled={saving || sendingEmail}
          className="px-5 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50">
          {saving ? 'Saving...' : sendingEmail ? '📧 Sending...' : 'Save & Notify'}
        </button>
      </div>
    </div>
  );
}

function FollowUpRow({ a, editingId, editData, setEditData, saving, sendingEmail, handleEdit, handleSave, setEditingId }: any) {
  const status = a.counseling_status || 'pending';
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  const isEditing = editingId === a.id;
  return (
    <div className="p-5 hover:bg-gray-50 transition-colors">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="font-bold text-gray-800">{a.full_name}</p>
            <span className="text-xs text-gray-400 font-mono">{a.student_id}</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${a.risk_level === 'immediate-support' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-orange-100 text-orange-700 border-orange-300'}`}>
              {a.risk_level === 'immediate-support' ? '🚨 Immediate' : '⚠️ Need Support'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${cfg.color}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1`} />
              {cfg.label}
            </span>
            <ConsentBadge status={a.consent_status} />
          </div>
          <p className="text-xs text-gray-400">
            Score: <span className="font-semibold text-gray-600">{a.total_score}/20</span>
            {' · '}Assessed: {new Date(a.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
            {a.counseled_at && ` · Counseled: ${new Date(a.counseled_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`}
          </p>
          {a.counselor_notes && !isEditing && (
            <p className="text-sm text-gray-600 mt-2 bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">📝 {a.counselor_notes}</p>
          )}
        </div>
        {!isEditing && (
          <button onClick={() => handleEdit(a)}
            className={`px-4 py-2 text-sm rounded-xl font-semibold transition flex-shrink-0 ${status === 'completed' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300' : 'bg-orange-600 text-white hover:bg-orange-700'}`}>
            {status === 'completed' ? '🔄 Re-open' : 'Update Status'}
          </button>
        )}
      </div>
      {isEditing && <EditPanel a={a} editData={editData} setEditData={setEditData} saving={saving} sendingEmail={sendingEmail} handleSave={handleSave} setEditingId={setEditingId} />}
    </div>
  );
}

function FollowUpCard({ a, editingId, editData, setEditData, saving, sendingEmail, handleEdit, handleSave, setEditingId }: any) {
  const status = a.counseling_status || 'pending';
  const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
  const isEditing = editingId === a.id;
  const scorePercent = Math.round((a.total_score / 20) * 100);
  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm hover:shadow-md transition-all ${isEditing ? 'border-orange-300' : 'border-gray-100'}`}>
      {/* Card header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-800 truncate">{a.full_name}</p>
            <p className="text-xs text-gray-400 font-mono">{a.student_id}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${cfg.color}`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1`} />
            {cfg.label}
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${a.risk_level === 'immediate-support' ? 'bg-red-100 text-red-700 border-red-300' : 'bg-orange-100 text-orange-700 border-orange-300'}`}>
            {a.risk_level === 'immediate-support' ? '🚨 Immediate' : '⚠️ Need Support'}
          </span>
          <ConsentBadge status={a.consent_status} />
        </div>
        {/* Score bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>BSRS-5 Score</span>
            <span className="font-bold text-gray-700">{a.total_score}/20</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${scorePercent >= 75 ? 'bg-red-500' : scorePercent >= 50 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${scorePercent}%` }} />
          </div>
        </div>
        <p className="text-xs text-gray-400">
          {new Date(a.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
          {a.counseled_at && ` · Counseled ${new Date(a.counseled_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}`}
        </p>
        {a.counselor_notes && !isEditing && (
          <p className="text-xs text-gray-600 mt-2 bg-blue-50 rounded-lg px-2.5 py-2 border border-blue-100 line-clamp-2">📝 {a.counselor_notes}</p>
        )}
      </div>
      {/* Card footer */}
      {!isEditing && (
        <div className="px-5 pb-5">
          <button onClick={() => handleEdit(a)}
            className={`w-full py-2 text-sm rounded-xl font-semibold transition ${status === 'completed' ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300' : 'bg-orange-600 text-white hover:bg-orange-700'}`}>
            {status === 'completed' ? '🔄 Re-open' : 'Update Status'}
          </button>
        </div>
      )}
      {isEditing && (
        <div className="px-5 pb-5">
          <EditPanel a={a} editData={editData} setEditData={setEditData} saving={saving} sendingEmail={sendingEmail} handleSave={handleSave} setEditingId={setEditingId} />
        </div>
      )}
    </div>
  );
}
