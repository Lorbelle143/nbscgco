import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';

/**
 * CrisisAlert — mounts once in AdminDashboard / StaffDashboard.
 * Listens for new mental_health_assessments with risk_level = 'immediate-support'
 * or having_suicidal_thoughts > 0 and shows a persistent alert banner + toast.
 */
export default function CrisisAlert() {
  const toast = useToastContext();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Load existing unacknowledged crisis assessments from today
    loadTodayAlerts();

    // Real-time listener
    channelRef.current = supabase
      .channel('crisis-alert-watch')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mental_health_assessments' },
        (payload) => {
          const rec = payload.new;
          if (rec.risk_level === 'immediate-support' || rec.having_suicidal_thoughts > 0) {
            setAlerts(prev => {
              if (prev.find(a => a.id === rec.id)) return prev;
              return [rec, ...prev];
            });
            // Toast alert
            toast.error(
              `🚨 CRISIS ALERT: ${rec.full_name} (${rec.student_id}) needs immediate support! Score: ${rec.total_score}/20`,
            );
            // Browser notification if permitted
            if (Notification.permission === 'granted') {
              new Notification('🚨 Crisis Alert — NBSC GCO', {
                body: `${rec.full_name} (${rec.student_id}) submitted a high-risk mental health assessment. Immediate attention required.`,
                icon: '/nbsc-logo.png',
              });
            }
          }
        }
      )
      .subscribe();

    // Request browser notification permission
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, []);

  const loadTodayAlerts = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('mental_health_assessments')
      .select('*')
      .eq('risk_level', 'immediate-support')
      .gte('created_at', today + 'T00:00:00')
      .order('created_at', { ascending: false });
    if (data && data.length > 0) setAlerts(data);
  };

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]));
  };

  const handleDismissAll = () => {
    setDismissed(new Set(alerts.map(a => a.id)));
  };

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));
  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] w-full max-w-sm space-y-2 pointer-events-none">
      {/* Dismiss all */}
      {visibleAlerts.length > 1 && (
        <div className="pointer-events-auto flex justify-end">
          <button onClick={handleDismissAll}
            className="text-xs text-gray-500 hover:text-gray-700 bg-white/90 px-2 py-1 rounded-lg shadow border border-gray-200">
            Dismiss all ({visibleAlerts.length})
          </button>
        </div>
      )}

      {visibleAlerts.map(alert => (
        <div key={alert.id}
          className="pointer-events-auto bg-red-600 text-white rounded-2xl shadow-2xl border-2 border-red-400 overflow-hidden animate-pulse-once">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-red-700">
            <div className="flex items-center gap-2">
              <span className="text-lg">🚨</span>
              <span className="font-black text-sm tracking-wide uppercase">Crisis Alert</span>
            </div>
            <button onClick={() => handleDismiss(alert.id)}
              className="text-red-200 hover:text-white text-xl leading-none font-bold">×</button>
          </div>

          {/* Body */}
          <div className="px-4 py-3 space-y-1">
            <p className="font-bold text-base">{alert.full_name}</p>
            <p className="text-red-200 text-xs">{alert.student_id}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="bg-red-800/60 text-red-100 text-xs px-2 py-0.5 rounded-full font-semibold">
                Score: {alert.total_score}/20
              </span>
              {alert.having_suicidal_thoughts > 0 && (
                <span className="bg-red-900/80 text-red-100 text-xs px-2 py-0.5 rounded-full font-semibold">
                  ⚠️ Suicidal ideation reported
                </span>
              )}
              <span className="bg-red-800/60 text-red-100 text-xs px-2 py-0.5 rounded-full">
                {new Date(alert.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-red-100 text-xs mt-2">
              Immediate counseling intervention required. Please contact this student as soon as possible.
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
