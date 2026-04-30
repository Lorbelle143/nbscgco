import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { useDebounce } from '../hooks/useDebounce';
import MentalHealthAdmin from '../components/MentalHealthAdmin';
import FollowUpTracker from '../components/FollowUpTracker';
import CounselingSessionNotes from '../components/CounselingSessionNotes';
import ConsentTracker from '../components/ConsentTracker';
import MentalHealthTrends from '../components/MentalHealthTrends';
import { SkeletonDashboard } from '../components/SkeletonLoader';

type StaffView = 'students' | 'mental-health' | 'follow-up' | 'session-notes' | 'consent' | 'mh-trends';

export default function StaffDashboard() {
  const { signOut, user } = useAuthStore();
  const toast = useToastContext();
  useSessionTimeout();
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<StaffView>('students');
  const [students, setStudents] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({ newPass: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    loadData();
    loadStaffProfile();
  }, []);

  const loadStaffProfile = async () => {
    if (!user?.id) return;
    try {
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (data) setStaffProfile(data);
    } catch { /* silent */ }
  };

  const loadData = async () => {
    try {
      const [profilesResult, submissionsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, email, full_name, student_id, created_at, last_login, profile_picture, profile_picture_url')
          .eq('is_admin', false)
          .order('full_name', { ascending: true }),
        supabase
          .from('inventory_submissions')
          .select('id, user_id, student_id, full_name, course, year_level, contact_number, submission_status, photo_url, created_at')
          .order('created_at', { ascending: false })
          .limit(500),
      ]);

      const studentsData = profilesResult.data || [];
      const submissionsData = submissionsResult.data || [];

      const studentsWithPhotos = studentsData.map(s => {
        const sub = submissionsData.find(x => x.student_id === s.student_id);
        const profilePic = s.profile_picture || s.profile_picture_url || null;
        return { ...s, photo_url: sub?.photo_url || profilePic };
      });

      setStudents(studentsWithPhotos);
      setSubmissions(submissionsData);
    } catch (err: any) {
      toast.error('Failed to load data: ' + err.message);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handlePasswordChange = async () => {
    if (!passwordData.newPass || passwordData.newPass.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (passwordData.newPass !== passwordData.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      setPasswordLoading(true);
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPass });
      if (error) throw error;
      toast.success('Password changed successfully');
      setShowPasswordModal(false);
      setPasswordData({ newPass: '', confirm: '' });
    } catch (err: any) {
      toast.error('Failed to change password: ' + err.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const q = debouncedSearch.toLowerCase();
    return (
      (s.full_name || '').toLowerCase().includes(q) ||
      (s.student_id || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  });

  const navItems: { key: StaffView; label: string; icon: React.ReactNode }[] = [
    {
      key: 'students',
      label: 'Students',
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      key: 'mental-health',
      label: 'Mental Health',
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
    {
      key: 'mh-trends',
      label: 'MH Trends',
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      key: 'follow-up',
      label: 'Follow-Up',
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      key: 'session-notes',
      label: 'Session Notes',
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
    },
    {
      key: 'consent',
      label: 'Consent',
      icon: (
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  if (initialLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 animate-pulse hidden lg:flex flex-col">
          <div className="h-20 border-b border-gray-200 flex items-center px-6 gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg" />
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded w-20" />
              <div className="h-2 bg-gray-100 rounded w-24" />
            </div>
          </div>
          <div className="p-3 space-y-2 mt-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-11 bg-gray-100 rounded-lg" />)}
          </div>
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-20 bg-white border-b border-gray-200 animate-pulse flex items-center px-8 justify-between">
            <div className="space-y-2">
              <div className="h-5 bg-gray-200 rounded w-40" />
              <div className="h-3 bg-gray-100 rounded w-48" />
            </div>
          </div>
          <SkeletonDashboard />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="h-20 flex items-center justify-center border-b border-gray-200 px-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="GCO Logo" className="w-10 h-10 object-contain flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-700">Staff Panel</p>
              <p className="text-xs text-blue-500 font-medium">Peer Counselor</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 px-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => { setViewMode(item.key); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                viewMode === item.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Staff profile footer */}
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              {staffProfile?.profile_picture ? (
                <img src={staffProfile.profile_picture} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <span className="text-blue-600 font-bold text-sm">
                  {(staffProfile?.full_name || user?.email || 'S')[0].toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate">{staffProfile?.full_name || 'Staff'}</p>
              <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => setShowPasswordModal(true)}
              title="Change password"
              className="text-gray-400 hover:text-blue-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </button>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6 gap-4 flex-shrink-0">
          <button
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            onClick={() => setSidebarOpen(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-800">
              {navItems.find(n => n.key === viewMode)?.label}
            </h1>
            <p className="text-xs text-gray-400">GCO Staff Portal — NBSC</p>
          </div>

          {/* Search (students view only) */}
          {viewMode === 'students' && (
            <div className="relative hidden sm:block">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
              />
            </div>
          )}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {viewMode === 'students' && (
            <div>
              {/* Mobile search */}
              <div className="sm:hidden mb-4">
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Total Students</p>
                  <p className="text-2xl font-bold text-gray-800">{students.length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">With Submissions</p>
                  <p className="text-2xl font-bold text-blue-600">{submissions.length}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm col-span-2 sm:col-span-1">
                  <p className="text-xs text-gray-500 mb-1">No Submission</p>
                  <p className="text-2xl font-bold text-orange-500">
                    {students.filter(s => !submissions.some(sub => sub.student_id === s.student_id)).length}
                  </p>
                </div>
              </div>

              {/* Student list */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-700">
                    {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                    {debouncedSearch && ` matching "${debouncedSearch}"`}
                  </p>
                </div>
                {filteredStudents.length === 0 ? (
                  <div className="py-16 text-center text-gray-400">
                    <svg className="w-10 h-10 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-sm">No students found</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {filteredStudents.map(student => {
                      const hasSub = submissions.some(s => s.student_id === student.student_id);
                      return (
                        <div key={student.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                          {/* Avatar */}
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex-shrink-0 overflow-hidden">
                            {student.photo_url ? (
                              <img src={student.photo_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-blue-600 font-bold text-sm">
                                  {(student.full_name || '?')[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{student.full_name}</p>
                            <p className="text-xs text-gray-400 truncate">{student.student_id} · {student.email}</p>
                          </div>
                          {/* Submission badge */}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                            hasSub ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {hasSub ? 'Submitted' : 'No form'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {viewMode === 'mental-health' && <MentalHealthAdmin />}
          {viewMode === 'mh-trends' && <MentalHealthTrends />}
          {viewMode === 'follow-up' && <FollowUpTracker />}
          {viewMode === 'session-notes' && <CounselingSessionNotes />}
          {viewMode === 'consent' && <ConsentTracker />}
        </main>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-800">🔑 Change Password</h3>
              <button onClick={() => { setShowPasswordModal(false); setPasswordData({ newPass: '', confirm: '' }); }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPass}
                  onChange={e => setPasswordData(p => ({ ...p, newPass: e.target.value }))}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Minimum 6 characters"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                <input
                  type="password"
                  value={passwordData.confirm}
                  onChange={e => setPasswordData(p => ({ ...p, confirm: e.target.value }))}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Re-enter new password"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowPasswordModal(false); setPasswordData({ newPass: '', confirm: '' }); }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordChange}
                disabled={passwordLoading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 font-medium disabled:opacity-50"
              >
                {passwordLoading ? 'Saving...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
