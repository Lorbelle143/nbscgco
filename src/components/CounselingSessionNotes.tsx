import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';
import { logAudit } from '../utils/auditLog';
import { notifySessionSaved } from '../utils/emailNotify';

const SESSION_STATUS_COLOR: Record<string, string> = {
  completed:  'bg-green-100 text-green-700 border-green-300',
  'no-show':  'bg-red-100 text-red-700 border-red-300',
  cancelled:  'bg-gray-100 text-gray-600 border-gray-300',
  scheduled:  'bg-blue-100 text-blue-700 border-blue-300',
};

export default function CounselingSessionNotes() {
  const toast = useToastContext();
  const [students, setStudents] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sessionSearch, setSessionSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'sessions' | 'risk'>('name');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [form, setForm] = useState({
    session_date: new Date().toISOString().split('T')[0],
    session_number: 1,
    presenting_problem: '',
    session_notes: '',
    interventions_used: '',
    progress_notes: '',
    next_session_plan: '',
    session_status: 'completed',
  });

  useEffect(() => { loadStudents(); loadSessions(); }, []);

  const loadStudents = async () => {
    const { data } = await supabase
      .from('mental_health_assessments')
      .select('student_id, full_name, risk_level, counseling_status')
      .in('risk_level', ['need-support', 'immediate-support'])
      .order('full_name');
    const unique: any[] = Object.values(
      (data || []).reduce((acc: any, cur: any) => { if (!acc[cur.student_id]) acc[cur.student_id] = cur; return acc; }, {})
    );
    const ids = unique.map((s: any) => s.student_id);
    const { data: consents } = await supabase.from('consent_records').select('student_id, status, signed_at').in('student_id', ids);
    const consentMap: Record<string, any> = {};
    (consents || []).forEach((c: any) => { consentMap[c.student_id] = c; });
    setStudents(unique.map((s: any) => ({ ...s, consent: consentMap[s.student_id] || null })));
  };

  const loadSessions = async () => {
    setLoading(true);
    const { data } = await supabase.from('counseling_sessions').select('*').order('session_date', { ascending: false });
    setSessions(data || []);
    setLoading(false);
  };

  const openNewSession = (student: any) => {
    if (student.consent?.status !== 'signed') {
      toast.error('Cannot add session — student has not signed the informed consent form yet. Go to Consent Tracker first.');
      return;
    }
    setSelectedStudent(student);
    setEditingSession(null);
    const count = sessions.filter(s => s.student_id === student.student_id).length;
    setForm({ session_date: new Date().toISOString().split('T')[0], session_number: count + 1, presenting_problem: '', session_notes: '', interventions_used: '', progress_notes: '', next_session_plan: '', session_status: 'completed' });
    setShowForm(true);
  };

  const openEditSession = (session: any) => {
    setSelectedStudent({ student_id: session.student_id, full_name: session.full_name });
    setEditingSession(session);
    setForm({ session_date: session.session_date, session_number: session.session_number, presenting_problem: session.presenting_problem || '', session_notes: session.session_notes || '', interventions_used: session.interventions_used || '', progress_notes: session.progress_notes || '', next_session_plan: session.next_session_plan || '', session_status: session.session_status || 'completed' });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.session_notes.trim()) { toast.error('Session notes are required'); return; }
    setSaving(true);
    try {
      if (editingSession) {
        const { error } = await supabase.from('counseling_sessions').update({ ...form, updated_at: new Date().toISOString() }).eq('id', editingSession.id);
        if (error) throw error;
        await logAudit('update', 'counseling_sessions', editingSession.id, `Updated session #${form.session_number} for ${selectedStudent.full_name}`);
        toast.success('Session updated');
      } else {
        const { error } = await supabase.from('counseling_sessions').insert({ ...form, student_id: selectedStudent.student_id, full_name: selectedStudent.full_name });
        if (error) throw error;
        await logAudit('create', 'counseling_sessions', selectedStudent.student_id, `Added session #${form.session_number} for ${selectedStudent.full_name}`);
        toast.success('Session saved');

        // In-app bell notification
        const { data: profile } = await supabase.from('profiles').select('id').eq('student_id', selectedStudent.student_id).maybeSingle();
        if (profile?.id) {
          await supabase.from('student_notifications').insert({
            user_id: profile.id,
            student_id: selectedStudent.student_id,
            type: 'counseling_scheduled',
            title: `📝 Counseling Session #${form.session_number} Recorded`,
            message: `A counseling session record has been saved for you by the Guidance Office. Session date: ${new Date(form.session_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}. Status: ${form.session_status}.`,
          });
        }

        notifySessionSaved(selectedStudent.student_id, form.session_number, form.session_date, form.session_status);
      }
      setShowForm(false);
      loadSessions();
    } catch (e: any) {
      toast.error('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (session: any) => {
    if (!confirm(`Delete session #${session.session_number} for ${session.full_name}?`)) return;
    const { error } = await supabase.from('counseling_sessions').delete().eq('id', session.id);
    if (error) { toast.error('Failed to delete'); return; }
    await logAudit('delete', 'counseling_sessions', session.id, `Deleted session #${session.session_number} for ${session.full_name}`);
    toast.success('Session deleted');
    loadSessions();
  };

  const sortedStudents = [...students]
    .filter(s => s.full_name?.toLowerCase().includes(search.toLowerCase()) || s.student_id?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'sessions') return sessions.filter(x => x.student_id === b.student_id).length - sessions.filter(x => x.student_id === a.student_id).length;
      if (sortBy === 'risk') return (a.risk_level || '').localeCompare(b.risk_level || '');
      return (a.full_name || '').localeCompare(b.full_name || '');
    });

  const sessionList = selectedStudent
    ? sessions.filter(s => s.student_id === selectedStudent.student_id)
    : sessions.filter(s => !sessionSearch || s.full_name?.toLowerCase().includes(sessionSearch.toLowerCase()) || s.student_id?.toLowerCase().includes(sessionSearch.toLowerCase()));

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Loading sessions...</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Session Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b flex items-center justify-between rounded-t-2xl">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{editingSession ? 'Edit Session' : 'New Session'} — {selectedStudent?.full_name}</h3>
                <p className="text-xs text-gray-500">Student ID: {selectedStudent?.student_id}</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Session Date</label>
                  <input type="date" value={form.session_date} onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Session #</label>
                  <input type="number" min={1} value={form.session_number} onChange={e => setForm(f => ({ ...f, session_number: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                <select value={form.session_status} onChange={e => setForm(f => ({ ...f, session_status: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent">
                  <option value="completed">Completed</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="no-show">No Show</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {[
                { key: 'presenting_problem', label: 'Presenting Problem', placeholder: 'What brought the student to counseling...' },
                { key: 'session_notes', label: 'Session Notes *', placeholder: 'Detailed notes about the session...' },
                { key: 'interventions_used', label: 'Interventions Used', placeholder: 'CBT, motivational interviewing, etc...' },
                { key: 'progress_notes', label: 'Progress Notes', placeholder: "Student's progress since last session..." },
                { key: 'next_session_plan', label: 'Next Session Plan', placeholder: 'Goals and plan for next session...' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                  <textarea value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    rows={key === 'session_notes' ? 4 : 2} placeholder={placeholder}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none" />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition disabled:opacity-50">
                  {saving ? 'Saving...' : editingSession ? 'Update Session' : 'Save Session'}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="px-6 py-3 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition font-medium">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Panel */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">Flagged Students</h3>
              <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setViewMode('list')} className={`px-2.5 py-1.5 transition ${viewMode === 'list' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                </button>
                <button onClick={() => setViewMode('grid')} className={`px-2.5 py-1.5 transition ${viewMode === 'grid' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </button>
              </div>
            </div>
            <input type="text" placeholder="Search student..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 bg-white">
              <option value="name">Sort: Name A–Z</option>
              <option value="sessions">Sort: Most Sessions</option>
              <option value="risk">Sort: Risk Level</option>
            </select>
          </div>

          <div className={`overflow-y-auto flex-1 max-h-[600px] ${viewMode === 'grid' ? 'p-3 grid grid-cols-1 gap-2 content-start' : 'divide-y divide-gray-50'}`}>
            {sortedStudents.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">No flagged students</p>
            ) : sortedStudents.map((s: any) => {
              const count = sessions.filter(x => x.student_id === s.student_id).length;
              const consentSigned = s.consent?.status === 'signed';
              const isSelected = selectedStudent?.student_id === s.student_id;

              if (viewMode === 'grid') return (
                <div key={s.student_id} onClick={() => setSelectedStudent(s)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-orange-400 bg-orange-50' : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm'}`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="font-semibold text-gray-800 text-sm truncate">{s.full_name}</p>
                    <span className="text-xl font-black text-orange-600 flex-shrink-0">{count}</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-2">{s.student_id}</p>
                  <div className="flex flex-wrap gap-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${s.risk_level === 'immediate-support' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {s.risk_level === 'immediate-support' ? '🚨' : '⚠️'} {s.risk_level === 'immediate-support' ? 'Immediate' : 'Need Support'}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${consentSigned ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {consentSigned ? '✅ Consent' : '⏳ No Consent'}
                    </span>
                  </div>
                  {isSelected && (
                    <button onClick={e => { e.stopPropagation(); openNewSession(s); }} disabled={!consentSigned}
                      className={`mt-2 w-full py-1.5 text-xs rounded-lg font-semibold transition ${consentSigned ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                      {consentSigned ? '+ Add Session' : '🔒 Consent Required'}
                    </button>
                  )}
                </div>
              );

              return (
                <div key={s.student_id} onClick={() => setSelectedStudent(s)}
                  className={`p-4 cursor-pointer hover:bg-orange-50 transition ${isSelected ? 'bg-orange-50 border-l-4 border-orange-500' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{s.full_name}</p>
                      <p className="text-xs text-gray-400">{s.student_id}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.risk_level === 'immediate-support' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                          {s.risk_level === 'immediate-support' ? '🚨 Immediate' : '⚠️ Need Support'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${consentSigned ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {consentSigned ? '✅ Consent' : '⏳ No Consent'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-2xl font-black text-orange-600">{count}</p>
                      <p className="text-xs text-gray-400">sessions</p>
                    </div>
                  </div>
                  {isSelected && (
                    <button onClick={e => { e.stopPropagation(); openNewSession(s); }} disabled={!consentSigned}
                      className={`mt-3 w-full py-1.5 text-xs rounded-xl font-semibold transition ${consentSigned ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                      {consentSigned ? '+ Add Session' : '🔒 Consent Required'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sessions Panel */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-gray-100 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-gray-800 truncate">
                {selectedStudent ? `Sessions — ${selectedStudent.full_name}` : 'All Sessions'}
              </h3>
              <div className="flex gap-2 flex-shrink-0">
                {selectedStudent && (
                  <button onClick={() => setSelectedStudent(null)} className="px-3 py-1.5 text-xs border border-gray-300 text-gray-500 rounded-lg hover:bg-gray-50 transition">
                    Show All
                  </button>
                )}
                {selectedStudent && (
                  <button onClick={() => openNewSession(selectedStudent)}
                    disabled={selectedStudent.consent?.status !== 'signed'}
                    title={selectedStudent.consent?.status !== 'signed' ? 'Consent required' : ''}
                    className={`px-4 py-1.5 text-sm rounded-xl font-semibold transition ${selectedStudent.consent?.status === 'signed' ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
                    {selectedStudent.consent?.status === 'signed' ? '+ New Session' : '🔒 Consent Required'}
                  </button>
                )}
              </div>
            </div>
            {!selectedStudent && (
              <input type="text" placeholder="Search sessions by student name or ID..." value={sessionSearch} onChange={e => setSessionSearch(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent" />
            )}
          </div>

          <div className="divide-y divide-gray-50 overflow-y-auto max-h-[600px]">
            {sessionList.length === 0 ? (
              <div className="p-16 text-center text-gray-400">
                <p className="text-4xl mb-3">📝</p>
                <p className="font-medium">{selectedStudent ? 'No sessions yet for this student' : 'Select a student or search to view sessions'}</p>
                {selectedStudent && selectedStudent.consent?.status !== 'signed' && (
                  <p className="text-sm text-yellow-600 mt-2">⏳ Student needs to sign consent form before sessions can be added</p>
                )}
              </div>
            ) : sessionList.map(session => (
              <div key={session.id} className="p-5 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-gray-800">Session #{session.session_number}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${SESSION_STATUS_COLOR[session.session_status] || 'bg-gray-100 text-gray-600 border-gray-300'}`}>
                        {session.session_status}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(session.session_date).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    {!selectedStudent && <p className="text-sm font-semibold text-orange-600 mb-1">{session.full_name} · <span className="text-gray-400 font-normal text-xs">{session.student_id}</span></p>}
                    {session.presenting_problem && (
                      <p className="text-sm text-gray-600 mb-1"><span className="font-semibold text-gray-500">Problem:</span> {session.presenting_problem}</p>
                    )}
                    <div className="bg-gray-50 rounded-xl px-3 py-2.5 mt-2 border border-gray-100">
                      <p className="text-sm text-gray-700">{session.session_notes}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                      {session.interventions_used && (
                        <p className="text-xs text-gray-500"><span className="font-semibold">Interventions:</span> {session.interventions_used}</p>
                      )}
                      {session.next_session_plan && (
                        <p className="text-xs text-blue-600"><span className="font-semibold">Next plan:</span> {session.next_session_plan}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => openEditSession(session)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Edit">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => handleDelete(session)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Delete">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
