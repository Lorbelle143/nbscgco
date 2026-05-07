import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';
import { useAuthStore } from '../store/authStore';
import { logAudit } from '../utils/auditLog';

type ViewMode = 'calendar' | 'list';
type AppointmentStatus = 'pending' | 'approved' | 'declined' | 'completed' | 'cancelled';

const STATUS_STYLE: Record<AppointmentStatus, string> = {
  pending:   'bg-yellow-100 text-yellow-700 border-yellow-300',
  approved:  'bg-green-100 text-green-700 border-green-300',
  declined:  'bg-red-100 text-red-700 border-red-300',
  completed: 'bg-blue-100 text-blue-700 border-blue-300',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-300',
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

interface Props {
  /** 'student' — book & view own appointments
   *  'staff'   — view all, approve/decline
   *  'admin'   — same as staff + can delete */
  role: 'student' | 'staff' | 'admin';
}

export default function AppointmentScheduler({ role }: Props) {
  const toast = useToastContext();
  const { user } = useAuthStore();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showBookModal, setShowBookModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  const [form, setForm] = useState({
    appointment_date: '',
    appointment_time: '09:00',
    reason: '',
    notes: '',
  });

  useEffect(() => {
    loadAppointments();
    if (role === 'student') loadProfile();
  }, []);

  const loadProfile = async () => {
    if (!user?.id) return;
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (data) setProfile(data);
  };

  const loadAppointments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (role === 'student' && user?.id) {
        query = query.eq('student_user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setAppointments(data || []);
    } catch (e: any) {
      toast.error('Failed to load appointments: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async () => {
    if (!form.appointment_date) { toast.error('Please select a date'); return; }
    if (!form.reason.trim()) { toast.error('Please enter a reason'); return; }
    if (!profile) { toast.error('Profile not loaded'); return; }

    const day = new Date(form.appointment_date).getDay();
    if (day === 0 || day === 6) { toast.error('Appointments are only available Monday–Friday'); return; }

    setSaving(true);
    try {
      const { error } = await supabase.from('appointments').insert({
        student_user_id: user!.id,
        student_id: profile.student_id,
        full_name: profile.full_name,
        email: profile.email,
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        reason: form.reason,
        notes: form.notes,
        status: 'pending',
      });
      if (error) throw error;

      // Notify counselors via in-app (insert to a shared notification or just reload)
      toast.success('Appointment request submitted! The counselor will confirm shortly.');
      setShowBookModal(false);
      setForm({ appointment_date: '', appointment_time: '09:00', reason: '', notes: '' });
      loadAppointments();
    } catch (e: any) {
      toast.error('Failed to book: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: AppointmentStatus, staffNotes?: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status, staff_notes: staffNotes || null, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;

      // Notify student
      const appt = appointments.find(a => a.id === id);
      if (appt?.student_user_id) {
        const msgMap: Record<string, string> = {
          approved:  `Your counseling appointment on ${appt.appointment_date} at ${appt.appointment_time} has been approved.`,
          declined:  `Your counseling appointment request has been declined.${staffNotes ? ' Reason: ' + staffNotes : ''}`,
          completed: `Your counseling appointment on ${appt.appointment_date} has been marked as completed.`,
          cancelled: `Your counseling appointment has been cancelled.`,
        };
        if (msgMap[status]) {
          await supabase.from('student_notifications').insert({
            user_id: appt.student_user_id,
            student_id: appt.student_id,
            type: 'appointment_' + status,
            title: `📅 Appointment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: msgMap[status],
          });
        }
      }

      await logAudit('update', 'appointments', id, `Status changed to ${status}`);
      toast.success(`Appointment ${status}`);
      setShowDetailModal(false);
      loadAppointments();
    } catch (e: any) {
      toast.error('Failed to update: ' + e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this appointment?')) return;
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    await logAudit('delete', 'appointments', id, 'Deleted appointment');
    toast.success('Appointment deleted');
    setShowDetailModal(false);
    loadAppointments();
  };

  const handleStudentCancel = async (id: string) => {
    if (!confirm('Cancel this appointment request?')) return;
    const { error } = await supabase.from('appointments').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('Failed to cancel'); return; }
    toast.success('Appointment cancelled');
    loadAppointments();
  };

  // Calendar helpers
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const apptsByDate: Record<string, any[]> = {};
  appointments.forEach(a => {
    if (!apptsByDate[a.appointment_date]) apptsByDate[a.appointment_date] = [];
    apptsByDate[a.appointment_date].push(a);
  });

  const formatDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
  const formatTime = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  const pendingCount = appointments.filter(a => a.status === 'pending').length;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">
            {role === 'student' ? 'My Appointments' : 'Appointment Schedule'}
          </h2>
          {(role === 'staff' || role === 'admin') && pendingCount > 0 && (
            <p className="text-sm text-yellow-600 font-medium">{pendingCount} pending request{pendingCount > 1 ? 's' : ''} awaiting approval</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden">
            <button onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-sm font-medium transition ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              📅 Calendar
            </button>
            <button onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-sm font-medium transition ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              📋 List
            </button>
          </div>
          {role === 'student' && (
            <button onClick={() => setShowBookModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition shadow-sm">
              + Book Appointment
            </button>
          )}
        </div>
      </div>

      {/* Stats row for staff/admin */}
      {role !== 'student' && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(['pending','approved','completed','declined','cancelled'] as AppointmentStatus[]).map(s => (
            <div key={s} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
              <p className="text-xl font-bold text-gray-800">{appointments.filter(a => a.status === s).length}</p>
              <p className="text-xs text-gray-500 capitalize">{s}</p>
            </div>
          ))}
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <button onClick={() => setCalendarDate(new Date(year, month - 1, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="font-bold text-gray-800">{MONTHS[month]} {year}</h3>
            <button onClick={() => setCalendarDate(new Date(year, month + 1, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-400">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[80px] border-b border-r border-gray-50 bg-gray-50/50" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayAppts = apptsByDate[dateStr] || [];
              const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
              const isWeekend = new Date(year, month, day).getDay() === 0 || new Date(year, month, day).getDay() === 6;

              return (
                <div key={day}
                  className={`min-h-[80px] border-b border-r border-gray-100 p-1.5 ${isWeekend ? 'bg-gray-50/60' : 'bg-white hover:bg-blue-50/30'} transition-colors`}>
                  <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1 ${isToday ? 'bg-blue-600 text-white' : isWeekend ? 'text-gray-400' : 'text-gray-700'}`}>
                    {day}
                  </div>
                  <div className="space-y-0.5">
                    {dayAppts.slice(0, 3).map(a => (
                      <button key={a.id} onClick={() => { setSelectedAppt(a); setShowDetailModal(true); }}
                        className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded font-medium truncate border ${STATUS_STYLE[a.status as AppointmentStatus] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        {formatTime(a.appointment_time)} {role !== 'student' ? a.full_name.split(' ')[0] : a.reason.slice(0, 12)}
                      </button>
                    ))}
                    {dayAppts.length > 3 && (
                      <p className="text-[10px] text-gray-400 pl-1">+{dayAppts.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {appointments.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <p className="text-4xl mb-3">📅</p>
              <p className="font-medium">No appointments yet</p>
              {role === 'student' && <p className="text-sm mt-1">Click "Book Appointment" to schedule one</p>}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {appointments.map(a => (
                <div key={a.id} className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors">
                  {/* Date block */}
                  <div className="flex-shrink-0 w-14 text-center bg-blue-50 rounded-xl py-2 border border-blue-100">
                    <p className="text-xs text-blue-500 font-semibold uppercase">
                      {new Date(a.appointment_date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short' })}
                    </p>
                    <p className="text-xl font-black text-blue-700">
                      {new Date(a.appointment_date + 'T00:00:00').getDate()}
                    </p>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-semibold text-gray-800 text-sm">
                        {role !== 'student' ? a.full_name : a.reason}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${STATUS_STYLE[a.status as AppointmentStatus]}`}>
                        {a.status}
                      </span>
                    </div>
                    {role !== 'student' && <p className="text-xs text-gray-400 mb-0.5">{a.student_id} · {a.email}</p>}
                    <p className="text-xs text-gray-500">
                      🕐 {formatTime(a.appointment_time)}
                      {role !== 'student' && ` · ${a.reason}`}
                    </p>
                    {a.staff_notes && <p className="text-xs text-blue-600 mt-0.5">Note: {a.staff_notes}</p>}
                  </div>
                  {/* Actions */}
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => { setSelectedAppt(a); setShowDetailModal(true); }}
                      className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition font-medium">
                      View
                    </button>
                    {role === 'student' && a.status === 'pending' && (
                      <button onClick={() => handleStudentCancel(a.id)}
                        className="px-3 py-1.5 text-xs bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition font-medium">
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Book Modal (student) */}
      {showBookModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold text-gray-800 text-lg">📅 Book Appointment</h3>
              <button onClick={() => setShowBookModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Date <span className="text-red-500">*</span></label>
                  <input type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={form.appointment_date}
                    onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                  <p className="text-xs text-gray-400 mt-1">Mon–Fri only</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Time <span className="text-red-500">*</span></label>
                  <select value={form.appointment_time}
                    onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                    {['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00'].map(t => (
                      <option key={t} value={t}>{formatTime(t)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Reason <span className="text-red-500">*</span></label>
                <select value={form.reason}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Select a reason...</option>
                  <option value="Mental Health Concern">Mental Health Concern</option>
                  <option value="Academic Stress">Academic Stress</option>
                  <option value="Personal/Family Issues">Personal/Family Issues</option>
                  <option value="Career Guidance">Career Guidance</option>
                  <option value="Peer Relationship Issues">Peer Relationship Issues</option>
                  <option value="Follow-up Session">Follow-up Session</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Additional Notes</label>
                <textarea value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  rows={3} placeholder="Anything else you'd like the counselor to know..."
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowBookModal(false)}
                  className="flex-1 py-2.5 border-2 border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition text-sm">
                  Cancel
                </button>
                <button onClick={handleBook} disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-50 text-sm">
                  {saving ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedAppt && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold text-gray-800 text-lg">Appointment Details</h3>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-3">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Student</span>
                  <span className="font-semibold text-gray-800">{selectedAppt.full_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Student ID</span>
                  <span className="font-medium text-gray-700">{selectedAppt.student_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="font-medium text-gray-700">{formatDate(selectedAppt.appointment_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time</span>
                  <span className="font-medium text-gray-700">{formatTime(selectedAppt.appointment_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Reason</span>
                  <span className="font-medium text-gray-700 text-right max-w-[60%]">{selectedAppt.reason}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Status</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${STATUS_STYLE[selectedAppt.status as AppointmentStatus]}`}>
                    {selectedAppt.status}
                  </span>
                </div>
                {selectedAppt.notes && (
                  <div>
                    <p className="text-gray-500 mb-1">Student Notes</p>
                    <p className="text-gray-700 bg-white rounded-lg p-2 border border-gray-200 text-xs">{selectedAppt.notes}</p>
                  </div>
                )}
              </div>

              {/* Staff/Admin actions */}
              {(role === 'staff' || role === 'admin') && selectedAppt.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleUpdateStatus(selectedAppt.id, 'approved')}
                    className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition text-sm">
                    ✓ Approve
                  </button>
                  <button onClick={() => handleUpdateStatus(selectedAppt.id, 'declined')}
                    className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition text-sm">
                    ✗ Decline
                  </button>
                </div>
              )}
              {(role === 'staff' || role === 'admin') && selectedAppt.status === 'approved' && (
                <button onClick={() => handleUpdateStatus(selectedAppt.id, 'completed')}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition text-sm">
                  Mark as Completed
                </button>
              )}
              {role === 'admin' && (
                <button onClick={() => handleDelete(selectedAppt.id)}
                  className="w-full py-2 text-sm text-red-500 hover:text-red-700 transition font-medium">
                  Delete Appointment
                </button>
              )}
              {role === 'student' && selectedAppt.status === 'pending' && (
                <button onClick={() => { handleStudentCancel(selectedAppt.id); setShowDetailModal(false); }}
                  className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition text-sm">
                  Cancel Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
