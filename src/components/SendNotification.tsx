import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';
import { logAudit } from '../utils/auditLog';
import { notifyCustomAnnouncement } from '../utils/emailNotify';

const NOTIFICATION_TYPES = [
  { value: 'general', label: '📢 General Announcement', color: 'bg-gray-100 text-gray-700' },
  { value: 'password_change', label: '🔑 Password Change', color: 'bg-red-100 text-red-700' },
  { value: 'submission_approved', label: '✅ Form Approved', color: 'bg-green-100 text-green-700' },
  { value: 'submission_needs_revision', label: '✏️ Needs Revision', color: 'bg-amber-100 text-amber-700' },
  { value: 'submission_under_review', label: '🔍 Under Review', color: 'bg-blue-100 text-blue-700' },
  { value: 'counseling_scheduled', label: '📅 Counseling Scheduled', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'mental_health_flagged', label: '🧠 Mental Health Alert', color: 'bg-purple-100 text-purple-700' },
];

interface Props {
  students: { id: string; student_id: string; full_name: string }[];
}

export default function SendNotification({ students }: Props) {
  const toast = useToastContext();
  const [target, setTarget] = useState<'all' | 'specific'>('all');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [type, setType] = useState('general');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [sentCount, setSentCount] = useState<number | null>(null);
  const [sendEmail, setSendEmail] = useState(true);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'done' | 'partial'>('idle');
  const [emailSentCount, setEmailSentCount] = useState(0);

  const filteredStudents = students.filter(s =>
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = async () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!message.trim()) { toast.error('Message is required'); return; }
    if (target === 'specific' && !selectedStudentId) { toast.error('Please select a student'); return; }

    setSending(true);
    setSentCount(null);
    setEmailStatus('idle');
    setEmailSentCount(0);

    try {
      let targetStudents: typeof students = [];

      if (target === 'all') {
        targetStudents = students;
      } else {
        const s = students.find(s => s.id === selectedStudentId);
        if (!s) { toast.error('Student not found'); return; }
        targetStudents = [s];
      }

      if (targetStudents.length === 0) { toast.error('No students found'); return; }

      // 1. Send in-app bell notifications
      const rows = targetStudents.map(s => ({
        user_id: s.id,
        student_id: s.student_id,
        type,
        title: title.trim(),
        message: message.trim(),
        is_read: false,
      }));

      for (let i = 0; i < rows.length; i += 50) {
        const { error } = await supabase.from('student_notifications').insert(rows.slice(i, i + 50));
        if (error) throw error;
      }

      setSentCount(targetStudents.length);
      toast.success(`🔔 Bell notification sent to ${targetStudents.length} student${targetStudents.length !== 1 ? 's' : ''}`);

      // 2. Send emails if enabled
      if (sendEmail) {
        setEmailStatus('sending');

        // Fetch emails for all target students
        const ids = targetStudents.map(s => s.id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', ids);

        const profileMap: Record<string, { email: string; full_name: string }> = {};
        (profiles || []).forEach(p => { profileMap[p.id] = p; });

        let emailCount = 0;
        // Send emails one by one (Brevo free tier: 300/day)
        for (const s of targetStudents) {
          const profile = profileMap[s.id];
          if (profile?.email) {
            try {
              await notifyCustomAnnouncement(profile.email, profile.full_name, title.trim(), message.trim(), type);
              emailCount++;
            } catch {
              // continue even if one fails
            }
          }
        }

        setEmailSentCount(emailCount);
        setEmailStatus(emailCount === targetStudents.length ? 'done' : 'partial');
        toast.success(`📧 Email sent to ${emailCount} student${emailCount !== 1 ? 's' : ''}`);
      }

      await logAudit('create', 'student_notifications', target === 'all' ? 'broadcast' : selectedStudentId,
        `Sent notification "${title}" to ${targetStudents.length} student${targetStudents.length !== 1 ? 's' : ''}${sendEmail ? ' (with email)' : ''}`
      );

      // Reset form
      setTitle('');
      setMessage('');
      setSelectedStudentId('');
      setSearch('');
    } catch (e: any) {
      toast.error('Failed to send: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success banner */}
      {sentCount !== null && (
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <p className="font-bold text-green-800">Notification sent successfully!</p>
            <div className="text-sm text-green-700 space-y-0.5 mt-1">
              <p>🔔 Bell notification delivered to {sentCount} student{sentCount !== 1 ? 's' : ''}</p>
              {sendEmail && emailStatus === 'sending' && <p>📧 Sending emails...</p>}
              {sendEmail && emailStatus === 'done' && <p>📧 Email sent to {emailSentCount} student{emailSentCount !== 1 ? 's' : ''}</p>}
              {sendEmail && emailStatus === 'partial' && <p>📧 Email sent to {emailSentCount} of {sentCount} students (some may have failed)</p>}
            </div>
          </div>
          <button onClick={() => { setSentCount(null); setEmailStatus('idle'); }} className="ml-auto text-green-500 hover:text-green-700 text-xl">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left — Compose */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
            <span className="text-2xl">📝</span> Compose Notification
          </h3>

          {/* Target */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Send To</label>
            <div className="flex gap-3">
              <button
                onClick={() => setTarget('all')}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition ${target === 'all' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                👥 All Students ({students.length})
              </button>
              <button
                onClick={() => setTarget('specific')}
                className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition ${target === 'specific' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
              >
                👤 Specific Student
              </button>
            </div>
          </div>

          {/* Student picker */}
          {target === 'specific' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Student</label>
              <input
                type="text"
                placeholder="Search by name or student ID..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent mb-2"
              />
              <div className="max-h-40 overflow-y-auto border-2 border-gray-200 rounded-xl divide-y divide-gray-50">
                {filteredStudents.length === 0 ? (
                  <p className="p-3 text-sm text-gray-400 text-center">No students found</p>
                ) : filteredStudents.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedStudentId(s.id); setSearch(s.full_name); }}
                    className={`w-full text-left px-3 py-2.5 hover:bg-orange-50 transition text-sm ${selectedStudentId === s.id ? 'bg-orange-50 font-semibold text-orange-700' : 'text-gray-700'}`}
                  >
                    <span className="font-medium">{s.full_name}</span>
                    <span className="text-gray-400 ml-2 text-xs">{s.student_id}</span>
                    {selectedStudentId === s.id && <span className="float-right text-orange-500">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notification Type</label>
            <select
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
            >
              {NOTIFICATION_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
              placeholder="e.g. Reminder: Inventory Form Deadline"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/100</p>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="e.g. Please submit your inventory form before February 28. Visit the GCO office for assistance."
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/500</p>
          </div>

          {/* Email toggle */}
          <div className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition ${sendEmail ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}
            onClick={() => setSendEmail(!sendEmail)}>
            <div className="flex items-center gap-3">
              <span className="text-xl">📧</span>
              <div>
                <p className="text-sm font-semibold text-gray-800">Also send via Email</p>
                <p className="text-xs text-gray-500">Sends to student's personal email</p>
              </div>
            </div>
            <div className={`w-11 h-6 rounded-full transition-colors relative ${sendEmail ? 'bg-orange-500' : 'bg-gray-300'}`}>
              <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${sendEmail ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </div>

          {/* Brevo limit warning for broadcast */}
          {target === 'all' && sendEmail && students.length > 200 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-800">
              ⚠️ You have {students.length} students. Brevo free plan allows 300 emails/day. Broadcasting to all may use most of your daily limit.
            </div>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !message.trim() || (target === 'specific' && !selectedStudentId)}
            className="w-full py-3 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl font-bold hover:from-orange-700 hover:to-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {sending ? (
              <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              {emailStatus === 'sending' ? 'Sending emails...' : 'Sending...'}</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              Send {target === 'all' ? `to All ${students.length} Students` : 'to Student'}
              {sendEmail && ' + Email'}</>
            )}
          </button>
        </div>

        {/* Right — Preview + Tips */}
        <div className="space-y-4">
          {/* Preview */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-xl">👁️</span> Preview
            </h3>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border ${NOTIFICATION_TYPES.find(t => t.value === type)?.color || 'bg-gray-100'}`}>
                  <span className="text-sm">{NOTIFICATION_TYPES.find(t => t.value === type)?.label.split(' ')[0] || '📢'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{title || 'Notification Title'}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-3">{message || 'Your message will appear here...'}</p>
                  <p className="text-xs text-gray-400 mt-1">Just now</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">This is how it will look in the student's 🔔 bell notification</p>
          </div>

          {/* Tips */}
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
            <h4 className="font-bold text-orange-800 mb-3 text-sm">💡 Tips</h4>
            <ul className="space-y-2 text-xs text-orange-700">
              <li className="flex items-start gap-2"><span className="flex-shrink-0">•</span> Students see notifications in their bell 🔔 icon on the dashboard</li>
              <li className="flex items-start gap-2"><span className="flex-shrink-0">•</span> Unread notifications show a red badge count</li>
              <li className="flex items-start gap-2"><span className="flex-shrink-0">•</span> Use "All Students" for school-wide announcements</li>
              <li className="flex items-start gap-2"><span className="flex-shrink-0">•</span> Use "Specific Student" for personal reminders</li>
              <li className="flex items-start gap-2"><span className="flex-shrink-0">•</span> Notifications are permanent — students can read them anytime</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
