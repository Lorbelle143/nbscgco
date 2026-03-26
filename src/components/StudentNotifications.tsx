import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const TYPE_CONFIG: Record<string, { icon: string; color: string }> = {
  submission_approved: { icon: '✅', color: 'bg-green-50 border-green-200' },
  submission_needs_revision: { icon: '✏️', color: 'bg-amber-50 border-amber-200' },
  submission_under_review: { icon: '🔍', color: 'bg-blue-50 border-blue-200' },
  mental_health_flagged: { icon: '🧠', color: 'bg-purple-50 border-purple-200' },
  counseling_scheduled: { icon: '📅', color: 'bg-indigo-50 border-indigo-200' },
  general: { icon: '📢', color: 'bg-gray-50 border-gray-200' },
};

interface Props {
  userId: string;
  studentId?: string;
  onUnreadCountChange?: (count: number) => void;
}

export default function StudentNotifications({ userId, onUnreadCountChange }: Props) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    // Real-time subscription
    const channel = supabase
      .channel('student-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'student_notifications',
        filter: `user_id=eq.${userId}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const load = async () => {
    try {
      const { data } = await supabase
        .from('student_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      setNotifications(data || []);
      const unread = (data || []).filter((n: any) => !n.is_read).length;
      onUnreadCountChange?.(unread);
    } finally {
      setLoading(false);
    }
  };

  const markRead = async (id: string) => {
    await supabase.from('student_notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    const unread = notifications.filter(n => n.id !== id && !n.is_read).length;
    onUnreadCountChange?.(unread);
  };

  const markAllRead = async () => {
    await supabase.from('student_notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    onUnreadCountChange?.(0);
  };

  if (loading) return <div className="p-4 text-center text-gray-400 text-sm">Loading...</div>;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div>
      {unreadCount > 0 && (
        <div className="px-4 py-2 border-b border-gray-100 flex justify-end">
          <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
            Mark all as read
          </button>
        </div>
      )}
      {notifications.length === 0 ? (
        <div className="p-6 text-center text-gray-400 text-sm">
          <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          You're all caught up!
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
          {notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.general;
            return (
              <div
                key={n.id}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition ${!n.is_read ? 'bg-blue-50/40' : ''}`}
                onClick={() => !n.is_read && markRead(n.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${cfg.color}`}>
                    <span className="text-sm">{cfg.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium text-gray-800 ${!n.is_read ? 'font-semibold' : ''}`}>{n.title}</p>
                      {!n.is_read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
