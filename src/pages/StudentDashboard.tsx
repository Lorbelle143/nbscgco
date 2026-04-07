import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { useSessionTimeout, onSessionWarning } from '../hooks/useSessionTimeout';
import { useToastContext } from '../contexts/ToastContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { SkeletonDashboard } from '../components/SkeletonLoader';
import { exportSubmissionPDF } from '../utils/pdfUtils';
import { printSubmission } from '../utils/printUtils';
import StudentNotifications from '../components/StudentNotifications';
import { uploadToCloudinary } from '../utils/cloudinary';
import { MentalHealthAssessmentCard } from '../components/MentalHealthAssessmentCard';

export default function StudentDashboard() {
  const { user, signOut } = useAuthStore();
  const toast = useToastContext();
  const [profile, setProfile] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [mentalHealthAssessments, setMentalHealthAssessments] = useState<any[]>([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [mentalHealthViewMode, setMentalHealthViewMode] = useState<'grid' | 'list'>('grid');
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState<'dashboard' | 'new-form' | 'mental-health' | 'edit-profile'>('dashboard');
  const [sessionCountdown, setSessionCountdown] = useState(0);
  const [notifUnreadCount, setNotifUnreadCount] = useState(0);  const navigate = useNavigate();

  // Enable session timeout protection
  useSessionTimeout();

  // Subscribe to session warning countdown
  useEffect(() => {
    return onSessionWarning((secondsLeft) => {
      setSessionCountdown(secondsLeft);
    });
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-notifications]')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
      Promise.all([loadProfile(), loadSubmissions(), loadMentalHealthAssessments()])
        .finally(() => setInitialLoading(false));

      // Real-time: refresh when this student's submissions change
      const channel = supabase
        .channel('student-submissions-watch')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'inventory_submissions', filter: `user_id=eq.${user.id}` },
          () => { loadSubmissions(); }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      
      if (!data) {
        toast.error('Your profile was deleted by admin. Logging out...');
        setTimeout(async () => {
          await signOut();
          navigate('/login');
        }, 2000);
        return;
      }
      
      setProfile(data);
    } catch (error: any) {
      toast.error('Failed to load profile');
    }
  };

  const loadSubmissions = async () => {
    if (!user) return;
    try {
      setLoading(true);

      // First try by user_id (correct path)
      const { data, error } = await supabase
        .from('inventory_submissions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // If nothing found by user_id, fallback to student_id
      // This handles cases where submission was saved with wrong/null user_id
      if (!data || data.length === 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('student_id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData?.student_id) {
          const { data: byStudentId } = await supabase
            .from('inventory_submissions')
            .select('*')
            .eq('student_id', profileData.student_id)
            .order('created_at', { ascending: false });

          if (byStudentId && byStudentId.length > 0) {
            // Fix the user_id so future queries work correctly
            await supabase
              .from('inventory_submissions')
              .update({ user_id: user.id })
              .eq('student_id', profileData.student_id);

            setSubmissions(byStudentId);
            return;
          }
        }
      }

      setSubmissions(data || []);
    } catch (error: any) {
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const loadMentalHealthAssessments = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('mental_health_assessments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMentalHealthAssessments(data || []);
    } catch {
      toast.error('Failed to load mental health assessments');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleView = (submission: any) => {
    setSelectedSubmission(submission);
    setShowViewModal(true);
  };

  const handleEdit = (submissionId: string) => {
    navigate(`/inventory-form?edit=${submissionId}`);
  };

  // Filter submissions
  const filteredSubmissions = submissions.filter(submission => {
    const formData = submission.form_data || {};
    const matchesSearch = 
      submission.course?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formData.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      formData.lastName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = true; // all submissions are complete (form validates before submit)

    return matchesSearch && matchesFilter;
  });

  // Calculate stats
  const stats = {
    total: submissions.length,
    lastUpdated: submissions[0] ? new Date(submissions[0].created_at) : null
  };

  // Profile completeness — 3 components: profile info, profile picture, inventory form submission
  // Each component is worth 1/3 of the total (33.3% each)
  const hasProfileInfo = !!(profile?.full_name && profile?.student_id && profile?.email);
  const hasProfilePicture = !!(profile?.profile_picture || profile?.profile_picture_url);
  const hasSubmission = submissions.length > 0;
  const hasMentalHealth = mentalHealthAssessments.length > 0;
  // 4 components: profile info, profile picture, inventory form, mental health assessment
  const completedComponents = [hasProfileInfo, hasProfilePicture, hasSubmission, hasMentalHealth].filter(Boolean).length;
  const completeness = Math.round((completedComponents / 4) * 100);

  if (initialLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 animate-pulse">
          <div className="h-20 border-b border-gray-200 flex items-center px-6 gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div className="space-y-2"><div className="h-3 bg-gray-200 rounded w-16"></div><div className="h-2 bg-gray-100 rounded w-20"></div></div>
          </div>
          <div className="p-3 space-y-2 mt-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-11 bg-gray-100 rounded-lg"></div>)}
          </div>
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-20 bg-white border-b border-gray-200 animate-pulse flex items-center px-8 justify-between">
            <div className="space-y-2"><div className="h-5 bg-gray-200 rounded w-32"></div><div className="h-3 bg-gray-100 rounded w-48"></div></div>
            <div className="flex gap-3"><div className="w-10 h-10 bg-gray-200 rounded-lg"></div><div className="w-10 h-10 bg-gray-200 rounded-full"></div></div>
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

      {/* Left Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="h-20 flex items-center justify-between border-b border-gray-200 px-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="GCO Logo" className="w-10 h-10 object-contain flex-shrink-0" />
            <p className="text-sm font-semibold text-gray-700">Student Portal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeView === 'dashboard' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="font-medium">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveView('new-form')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeView === 'new-form' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium">Inventory Form</span>
            {submissions.length > 0 && (
              <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Done</span>
            )}
          </button>

          <button
            onClick={() => setActiveView('mental-health')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeView === 'mental-health' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">Mental Health</span>
          </button>

          <button
            onClick={() => setActiveView('edit-profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeView === 'edit-profile' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="font-medium">Edit Profile</span>
          </button>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium">Sign Out</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {activeView === 'dashboard' && 'Dashboard'}
                {activeView === 'new-form' && 'New Form'}
                {activeView === 'mental-health' && 'Mental Health'}
                {activeView === 'edit-profile' && 'Edit Profile'}
              </h2>
              <p className="text-sm text-gray-500">
                Welcome back, {profile?.full_name}!
                {profile?.last_login && (
                  <span className="ml-2 text-xs text-gray-400">
                    Last login: {new Date(profile.last_login).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Session Countdown Warning */}
            {sessionCountdown > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-300 rounded-lg text-amber-700 text-sm font-medium animate-pulse">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Session expires in {sessionCountdown}s
              </div>
            )}

            {/* Notification Bell */}
            <div className="relative" data-notifications>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {(notifUnreadCount > 0 || submissions.length === 0 || mentalHealthAssessments.length === 0) && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {notifUnreadCount + (submissions.length === 0 ? 1 : 0) + (mentalHealthAssessments.length === 0 ? 1 : 0)}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800">Notifications</h3>
                  </div>
                  {/* Admin-sent notifications */}
                  {user && profile && (
                    <StudentNotifications
                      userId={user.id}
                      studentId={profile.student_id}
                      onUnreadCountChange={setNotifUnreadCount}
                    />
                  )}
                  {/* Pending task reminders */}
                  {(submissions.length === 0 || mentalHealthAssessments.length === 0) && (
                    <div className="border-t border-gray-100">
                      {submissions.length === 0 && (
                        <div className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">Inventory Form Pending</p>
                              <p className="text-xs text-gray-500">You haven't submitted your inventory form yet</p>
                              <button onClick={() => { setShowNotifications(false); navigate('/inventory-form'); }} className="text-xs text-blue-600 hover:underline mt-1">Fill out now →</button>
                            </div>
                          </div>
                        </div>
                      )}
                      {mentalHealthAssessments.length === 0 && (
                        <div className="p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">Mental Health Assessment</p>
                              <p className="text-xs text-gray-500">You haven't taken the BSRS-5 assessment yet</p>
                              <button onClick={() => { setShowNotifications(false); setActiveView('mental-health'); }} className="text-xs text-blue-600 hover:underline mt-1">Take assessment →</button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile Picture */}
            <div
              className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all"
              onClick={() => setActiveView('edit-profile')}
              title="Edit Profile"
            >
              {(profile?.profile_picture || profile?.profile_picture_url) ? (
                <img
                  src={profile.profile_picture || profile.profile_picture_url}
                  alt="Profile"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <span className="text-white font-semibold text-sm">
                  {profile?.full_name?.charAt(0) || 'S'}
                </span>
              )}
            </div>
          </div>
        </header>

        {/* Content Area - Scrollable */}
        <main className="flex-1 overflow-y-auto p-8">

        {/* ── NEW FORM VIEW ── */}
        {activeView === 'new-form' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
            <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
              {submissions.length > 0 ? (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Already Submitted</h2>
                  <p className="text-gray-500 mb-6">You have already submitted your inventory form. You can edit it below.</p>
                  <button
                    onClick={() => navigate(`/inventory-form?edit=${submissions[0].id}`)}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition shadow-md mb-3"
                  >
                    ✏️ Edit My Submission
                  </button>
                  <button
                    onClick={() => setActiveView('dashboard')}
                    className="w-full bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 py-3 rounded-xl font-semibold hover:from-gray-200 hover:to-gray-300 transition"
                  >
                    View My Submission
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Inventory Form</h2>
                  <p className="text-gray-500 mb-6">Fill out your student inventory information and upload required documents.</p>
                  <button
                    onClick={() => navigate('/inventory-form')}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition shadow-md"
                  >
                    Open Inventory Form
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── MENTAL HEALTH VIEW ── */}
        {activeView === 'mental-health' && (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Consent Status Card */}
            <ConsentStatusCard studentId={profile?.student_id} />

            {/* Take Assessment Card */}
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${mentalHealthAssessments.length > 0 ? 'bg-green-100' : 'bg-green-100'}`}>
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Mental Health Assessment</h2>
              {mentalHealthAssessments.length > 0 ? (
                <>
                  <p className="text-gray-500 mb-4">You have already completed the BSRS-5 assessment. Only one submission is allowed per student.</p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Assessment Completed
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-500 mb-6">Take the BSRS-5 mental health screening assessment.</p>
                  <button
                    onClick={() => navigate('/mental-health-assessment')}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition shadow-md"
                  >
                    Take Assessment
                  </button>
                </>
              )}
            </div>

            {/* Assessment History */}
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-800">Assessment History</h3>
                <p className="text-sm text-gray-500">Your previous BSRS-5 results</p>
              </div>
              {mentalHealthAssessments.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-medium">No assessments yet</p>
                  <p className="text-sm mt-1">Take your first BSRS-5 assessment above</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                    {mentalHealthAssessments.map((a) => {
                    const score = a.total_score ?? 0;
                    const risk = score >= 14
                      ? { label: 'Immediate Support', color: 'red', icon: '🚨' }
                      : score >= 11
                      ? { label: 'Need Support', color: 'yellow', icon: '⚠️' }
                      : { label: 'Doing Well', color: 'green', icon: '✅' };
                    return (
                      <div key={a.id} className="px-6 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-semibold text-gray-800">Score: {score}/20</p>
                            <p className="text-xs text-gray-500">{new Date(a.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold bg-${risk.color}-100 text-${risk.color}-700`}>
                            {risk.icon} {risk.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 text-xs">
                          {[
                            { label: 'Alone', val: a.feeling_alone },
                            { label: 'Blue', val: a.feeling_blue },
                            { label: 'Annoyed', val: a.feeling_easily_annoyed },
                            { label: 'Tense', val: a.feeling_tense_anxious },
                            { label: 'Inferior', val: a.feeling_inferior },
                          ].map(item => (
                            <span key={item.label} className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                              {item.label}: <span className="font-semibold text-gray-800">{item.val}</span>
                            </span>
                          ))}
                          <span className={`px-2 py-0.5 rounded font-semibold ${a.having_suicidal_thoughts > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                            Suicidal: {a.having_suicidal_thoughts}{a.having_suicidal_thoughts > 0 ? ' ⚠️' : ''}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── EDIT PROFILE VIEW ── */}
        {activeView === 'edit-profile' && (
          <EditProfileInline profile={profile} userId={user?.id} onSaved={(updated) => { setProfile(updated); setActiveView('dashboard'); }} />
        )}

        {/* ── DASHBOARD VIEW ── */}
        {activeView === 'dashboard' && (<>
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Welcome back, {profile?.full_name}!</h2>
              <p className="text-blue-100 text-lg">Manage your inventory submissions and profile</p>
            </div>
            <div className="hidden md:block">
              <svg className="w-24 h-24 text-blue-400 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Counseling Status Card — only show if student has a mental health assessment */}
        {mentalHealthAssessments.length > 0 && profile?.student_id && (
          <CounselingStatusCard studentId={profile.student_id} />
        )}

        {/* Profile Completeness */}
        <div className="bg-white rounded-xl shadow-lg p-5 mb-6 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold text-gray-700 text-sm">Profile Completeness</span>
            </div>
            <span className={`text-sm font-bold ${completeness === 100 ? 'text-green-600' : completeness >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
              {completeness}%
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${completeness === 100 ? 'bg-green-500' : completeness >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${completeness}%` }}
            />
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {[
              { label: 'Profile Info', done: hasProfileInfo },
              { label: 'Profile Picture', done: hasProfilePicture },
              { label: 'Inventory Form', done: hasSubmission },
              { label: 'Mental Health', done: hasMentalHealth },
            ].map(item => (
              <span key={item.label} className={`text-xs flex items-center gap-1 ${item.done ? 'text-green-600' : 'text-gray-400'}`}>
                {item.done ? '✓' : '○'} {item.label}
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {completeness === 100 ? 'All done — your profile is complete!' : `${completedComponents} of 4 steps completed.`}
          </p>
        </div>

        {/* Getting Started — only show when not all steps done */}
        {completeness < 100 && (
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🚀</span>
              <h3 className="font-bold text-indigo-800 text-sm">Getting Started</h3>
              <span className="ml-auto text-xs text-indigo-500">{completedComponents}/4 done</span>
            </div>
            <div className="space-y-2">
              {[
                { done: hasProfileInfo, label: 'Complete your profile info', action: () => setActiveView('edit-profile'), actionLabel: 'Edit Profile' },
                { done: hasProfilePicture, label: 'Upload a profile picture', action: () => setActiveView('edit-profile'), actionLabel: 'Upload Photo' },
                { done: hasSubmission, label: 'Submit your inventory form', action: () => navigate('/inventory-form'), actionLabel: 'Fill Form' },
                { done: hasMentalHealth, label: 'Take the BSRS-5 mental health assessment', action: () => navigate('/mental-health-assessment'), actionLabel: 'Take Now' },
              ].map((step, i) => (
                <div key={i} className={`flex items-center justify-between px-3 py-2 rounded-lg ${step.done ? 'bg-green-50 border border-green-200' : 'bg-white border border-indigo-100'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${step.done ? 'bg-green-500 text-white' : 'bg-indigo-100 text-indigo-600'}`}>
                      {step.done ? '✓' : i + 1}
                    </span>
                    <span className={`text-xs ${step.done ? 'text-green-700 line-through' : 'text-gray-700'}`}>{step.label}</span>
                  </div>
                  {!step.done && (
                    <button onClick={step.action} className="text-xs text-indigo-600 font-semibold hover:underline flex-shrink-0 ml-2">
                      {step.actionLabel} →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {/* Total Submissions */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Forms</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Last Updated</p>
                <p className="text-lg font-bold text-gray-900">
                  {stats.lastUpdated ? stats.lastUpdated.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-8">
          {/* Quick Actions Card */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Quick Actions</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Fill Form Card */}
              <button
                onClick={() => navigate('/inventory-form')}
                className="group bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-6 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center justify-between mb-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold mb-1">Fill New Form</h4>
                <p className="text-sm text-blue-100">Submit your inventory information</p>
              </button>

              {/* Mental Health Assessment Card */}
              <MentalHealthAssessmentCard onClick={() => setActiveView('mental-health')} />

              {/* Submissions Stats Card */}
              <button
                onClick={() => {
                  // Scroll to submissions section
                  const submissionsSection = document.getElementById('submissions-section');
                  if (submissionsSection) {
                    submissionsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
                className="group bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl p-6 shadow-lg transition-all duration-200 transform hover:scale-105 hover:shadow-xl"
              >
                <div className="flex items-center justify-between mb-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="text-right">
                    <p className="text-3xl font-bold">{submissions.length}</p>
                  </div>
                </div>
                <h4 className="text-lg font-bold mb-1">Total Submissions</h4>
                <p className="text-sm text-purple-100 flex items-center gap-1">
                  Your completed forms
                  <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </p>
              </button>
            </div>

            {/* Help Section */}
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-amber-900 mb-1">Need Help?</p>
                  <p className="text-xs text-amber-800">Contact the Guidance and Counseling Office for assistance with your submissions.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submissions Section */}
        <div id="submissions-section" className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 scroll-mt-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">My Submissions</h3>
                {submissions.length > 0 && (
                  <p className="text-sm text-gray-500">
                    Showing {filteredSubmissions.length} of {submissions.length} submissions
                  </p>
                )}
              </div>
            </div>

            {/* Search and Filter */}
            {submissions.length > 0 && (
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search submissions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition w-full sm:w-64"
                  />
                </div>
              </div>
            )}
          </div>

          {submissions.length === 0 ? (
            loading ? (
              <div className="text-center py-16">
                <LoadingSpinner size="lg" text="Loading submissions..." />
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-semibold text-gray-700 mb-2">No submissions yet</h4>
                <p className="text-gray-500 mb-6">Get started by filling out your first inventory form</p>
                <button
                  onClick={() => navigate('/inventory-form')}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Fill Inventory Form
                </button>
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredSubmissions.map((submission) => {
                const formData = submission.form_data || {};
                
                return (
                  <div key={submission.id} className="group bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all duration-200">
                    {/* Submission Header */}
                    <div className="flex justify-between items-start mb-4">
                      {(() => {
                        const s = submission.submission_status;
                        if (s === 'approved') return <span className="px-3 py-1.5 rounded-full text-xs font-bold border-2 bg-green-50 text-green-700 border-green-300">✅ Approved</span>;
                        if (s === 'needs-revision') return <span className="px-3 py-1.5 rounded-full text-xs font-bold border-2 bg-red-50 text-red-700 border-red-300">✏️ Needs Revision</span>;
                        if (s === 'under-review') return <span className="px-3 py-1.5 rounded-full text-xs font-bold border-2 bg-blue-50 text-blue-700 border-blue-300">🔍 Under Review</span>;
                        return <span className="px-3 py-1.5 rounded-full text-xs font-bold border-2 bg-green-50 text-green-700 border-green-300">✅ Submitted</span>;
                      })()}
                      <span className="text-xs text-gray-500 font-medium">
                        ID: {submission.student_id}
                      </span>
                    </div>

                    {/* Admin remarks banner */}
                    {submission.admin_remarks && (
                      <div className={`mb-3 px-3 py-2 rounded-lg text-xs border ${submission.submission_status === 'needs-revision' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                        <span className="font-semibold">Counselor note: </span>{submission.admin_remarks}
                      </div>
                    )}

                    <div className="flex gap-4 mb-4">
                      {submission.photo_url ? (
                        <img
                          src={submission.photo_url}
                          alt="Profile"
                          className="w-24 h-24 rounded-xl object-cover shadow-md border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shadow-md border-2 border-gray-200">
                          <svg className="w-12 h-12 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-800 text-lg mb-1">{submission.course}</h4>
                        <p className="text-sm text-gray-600 mb-2">Year {submission.year_level}</p>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          {submission.contact_number}
                        </div>
                      </div>
                    </div>

                    {/* Submitted date */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Submitted: {new Date(submission.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>

                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleView(submission)}
                        className="flex items-center justify-center gap-1 px-3 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition shadow-md"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                      <button
                        onClick={() => handleEdit(submission.id)}
                        className="flex items-center justify-center gap-1 px-3 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition shadow-md"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => printSubmission(submission)}
                        className="flex items-center justify-center gap-1 px-3 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-medium rounded-lg hover:from-purple-700 hover:to-indigo-700 transition shadow-md"
                        title="Print as NBSC Form"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print
                      </button>
                      <button
                        onClick={() => exportSubmissionPDF(submission)}
                        className="flex items-center justify-center gap-1 px-3 py-2.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-medium rounded-lg hover:from-red-600 hover:to-pink-600 transition shadow-md"
                        title="Download as PDF"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        PDF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* No Results Found */}
          {submissions.length > 0 && filteredSubmissions.length === 0 && (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-700 mb-2">No submissions found</h4>
              <p className="text-gray-500 mb-4">Try adjusting your search or filter</p>
              <button
                onClick={() => {
                  setSearchTerm('');
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* Submission History Timeline */}
        {submissions.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Submission History</h3>
            </div>
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
              <div className="space-y-4">
                {submissions.map((s) => {
                  const f = s.form_data || {};
                  const isComplete = !!(f.firstName && f.lastName && f.programYear);
                  return (
                    <div key={s.id} className="relative flex gap-4 pl-10">
                      <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white mt-1.5 ${isComplete ? 'bg-green-500' : 'bg-amber-400'}`}></div>
                      <div className="flex-1 bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-gray-800 text-sm">{s.course}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {new Date(s.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {s.updated_at && s.updated_at !== s.created_at && (
                              <p className="text-xs text-blue-500 mt-0.5">
                                Updated: {new Date(s.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isComplete ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                              {isComplete ? 'Complete' : 'Incomplete'}
                            </span>
                            <button onClick={() => exportSubmissionPDF(s)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition" title="Download PDF">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Mental Health Assessments Section */}
        {mentalHealthAssessments.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 mt-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Mental Health Assessments</h3>
                  <p className="text-sm text-gray-500">
                    {mentalHealthAssessments.length} assessment{mentalHealthAssessments.length !== 1 ? 's' : ''} completed
                  </p>
                </div>
              </div>

              {/* View Toggle Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setMentalHealthViewMode('grid')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                    mentalHealthViewMode === 'grid' 
                      ? 'bg-pink-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Grid
                </button>
                <button
                  onClick={() => setMentalHealthViewMode('list')}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                    mentalHealthViewMode === 'list' 
                      ? 'bg-pink-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  List
                </button>
              </div>
            </div>

            {/* Grid View */}
            {mentalHealthViewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mentalHealthAssessments.map((assessment) => {
                const getRiskColor = (level: string) => {
                  switch (level) {
                    case 'immediate-support': return 'bg-red-100 text-red-800 border-red-300';
                    case 'need-support': return 'bg-orange-100 text-orange-800 border-orange-300';
                    default: return 'bg-green-100 text-green-800 border-green-300';
                  }
                };

                const getRiskLabel = (level: string) => {
                  switch (level) {
                    case 'immediate-support': return 'NEED IMMEDIATE SUPPORT';
                    case 'need-support': return 'YOU NEED SUPPORT';
                    default: return 'DOING WELL';
                  }
                };

                const getRiskIcon = (level: string) => {
                  switch (level) {
                    case 'immediate-support': return '🚨';
                    case 'need-support': return '⚠️';
                    default: return '✅';
                  }
                };

                return (
                  <div key={assessment.id} className="group bg-white rounded-xl p-6 border-2 border-gray-200 hover:border-pink-300 hover:shadow-xl transition-all duration-200">
                    {/* Header with Risk Badge */}
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getRiskColor(assessment.risk_level)}`}>
                        {getRiskIcon(assessment.risk_level)} {getRiskLabel(assessment.risk_level)}
                      </span>
                      <span className="text-xs text-gray-500 font-medium">
                        BSRS-5
                      </span>
                    </div>

                    {/* Score Display */}
                    <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-5 mb-4 border border-pink-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 mb-1 font-medium">Total Score</p>
                          <p className="text-4xl font-bold text-gray-800">{assessment.total_score}<span className="text-2xl text-gray-500">/20</span></p>
                        </div>
                        <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg">
                          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Counseling Required Warning */}
                    {assessment.requires_counseling && (
                      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 mb-4 shadow-sm">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-xl">{getRiskIcon(assessment.risk_level)}</span>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-red-800 mb-1">COUNSELING REQUIRED</p>
                            <p className="text-xs text-red-700 mb-2">Please visit SC Room 108</p>
                          </div>
                        </div>
                        <a
                          href="https://docs.google.com/spreadsheets/d/1-80LunHLARHr83-yBFB9KGFObQMEM2mUIx4L1PXhgT0/edit?gid=0#gid=0"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition w-full justify-center"
                        >
                          📋 Appointment Form for Guidance
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    )}

                    {/* Date */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-200">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Submitted: {new Date(assessment.created_at).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>

                    {/* Detailed Scores */}
                    <div className="space-y-3">
                      <p className="text-xs font-bold text-gray-700 mb-2">Assessment Breakdown:</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                          <p className="text-gray-600 mb-1">Feeling alone</p>
                          <p className="font-bold text-gray-800">{assessment.feeling_alone}/4</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                          <p className="text-gray-600 mb-1">Feeling blue</p>
                          <p className="font-bold text-gray-800">{assessment.feeling_blue}/4</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                          <p className="text-gray-600 mb-1">Easily annoyed</p>
                          <p className="font-bold text-gray-800">{assessment.feeling_easily_annoyed}/4</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                          <p className="text-gray-600 mb-1">Tense/anxious</p>
                          <p className="font-bold text-gray-800">{assessment.feeling_tense_anxious}/4</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 border border-gray-200">
                          <p className="text-gray-600 mb-1">Feeling inferior</p>
                          <p className="font-bold text-gray-800">{assessment.feeling_inferior}/4</p>
                        </div>
                        <div className={`rounded-lg p-2 border-2 ${assessment.having_suicidal_thoughts > 0 ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                          <p className="text-gray-600 mb-1">Suicidal thoughts</p>
                          <p className={`font-bold ${assessment.having_suicidal_thoughts > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                            {assessment.having_suicidal_thoughts}/4
                            {assessment.having_suicidal_thoughts > 0 && ' ⚠️'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Counseling Notes (if any) */}
                    {assessment.counseling_notes && (
                      <div className="mt-4 bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                        <p className="text-xs font-bold text-blue-800 mb-1 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Counseling Notes:
                        </p>
                        <p className="text-xs text-blue-700">{assessment.counseling_notes}</p>
                      </div>
                    )}

                    {/* Edit Button */}
                    <button
                      onClick={() => navigate(`/mental-health-assessment?edit=${assessment.id}`)}
                      className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-blue-700 transition shadow-md hover:shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Assessment
                    </button>
                  </div>
                );
              })}
            </div>
            )}

            {/* List View */}
            {mentalHealthViewMode === 'list' && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-white rounded-xl overflow-hidden">
                  <thead className="bg-gradient-to-r from-pink-600 to-rose-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-bold">Date</th>
                      <th className="px-4 py-3 text-center text-sm font-bold">Score</th>
                      <th className="px-4 py-3 text-center text-sm font-bold">Risk Level</th>
                      <th className="px-4 py-3 text-center text-sm font-bold">Counseling</th>
                      <th className="px-4 py-3 text-center text-sm font-bold">Breakdown</th>
                      <th className="px-4 py-3 text-center text-sm font-bold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mentalHealthAssessments.map((assessment, index) => {
                      const getRiskColor = (level: string) => {
                        switch (level) {
                          case 'immediate-support': return 'bg-red-100 text-red-800 border-red-300';
                          case 'need-support': return 'bg-orange-100 text-orange-800 border-orange-300';
                          default: return 'bg-green-100 text-green-800 border-green-300';
                        }
                      };

                      const getRiskLabel = (level: string) => {
                        switch (level) {
                          case 'immediate-support': return 'NEED IMMEDIATE SUPPORT';
                          case 'need-support': return 'YOU NEED SUPPORT';
                          default: return 'DOING WELL';
                        }
                      };

                      const getRiskIcon = (level: string) => {
                        switch (level) {
                          case 'immediate-support': return '🚨';
                          case 'need-support': return '⚠️';
                          default: return '✅';
                        }
                      };

                      return (
                        <tr key={assessment.id} className={`border-b hover:bg-pink-50 transition ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {new Date(assessment.created_at).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-2xl font-bold text-gray-800">{assessment.total_score}<span className="text-sm text-gray-500">/20</span></span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 inline-block ${getRiskColor(assessment.risk_level)}`}>
                              {getRiskIcon(assessment.risk_level)} {getRiskLabel(assessment.risk_level)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {assessment.requires_counseling ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-red-600 font-bold text-sm">⚠️ Required</span>
                                <a
                                  href="https://docs.google.com/spreadsheets/d/1-80LunHLARHr83-yBFB9KGFObQMEM2mUIx4L1PXhgT0/edit?gid=0#gid=0"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-red-700 hover:text-red-900 underline"
                                >
                                  Book Appointment
                                </a>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">Not Required</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1 justify-center text-xs">
                              <span className="px-2 py-1 bg-gray-100 rounded">Alone: {assessment.feeling_alone}</span>
                              <span className="px-2 py-1 bg-gray-100 rounded">Blue: {assessment.feeling_blue}</span>
                              <span className="px-2 py-1 bg-gray-100 rounded">Annoyed: {assessment.feeling_easily_annoyed}</span>
                              <span className="px-2 py-1 bg-gray-100 rounded">Tense: {assessment.feeling_tense_anxious}</span>
                              <span className="px-2 py-1 bg-gray-100 rounded">Inferior: {assessment.feeling_inferior}</span>
                              <span className={`px-2 py-1 rounded ${assessment.having_suicidal_thoughts > 0 ? 'bg-red-100 text-red-700 font-bold' : 'bg-gray-100'}`}>
                                Suicidal: {assessment.having_suicidal_thoughts}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => navigate(`/mental-health-assessment?edit=${assessment.id}`)}
                              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-sm font-medium rounded-lg hover:from-indigo-700 hover:to-blue-700 transition"
                            >
                              ✏️ Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        </>) }
        </main>
      </div>

      {/* View Modal */}
      {showViewModal && selectedSubmission && (
        <ViewSubmissionModal
          submission={selectedSubmission}
          onClose={() => setShowViewModal(false)}
        />
      )}
    </div>
  );
}

// View Submission Modal Component
function ConsentStatusCard({ studentId }: { studentId: string | undefined }) {
  const [consent, setConsent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!studentId) { setLoading(false); return; }
    supabase
      .from('consent_records')
      .select('status, signed_at, notes')
      .eq('student_id', studentId)
      .maybeSingle()
      .then(({ data }) => { setConsent(data); setLoading(false); });
  }, [studentId]);

  if (loading) return null;

  const status = consent?.status || 'pending';
  const config: Record<string, { icon: string; color: string; bg: string; border: string; title: string; desc: string }> = {
    signed: {
      icon: '✅', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200',
      title: 'Informed Consent Signed',
      desc: consent?.signed_at
        ? `Signed on ${new Date(consent.signed_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}`
        : 'Your consent has been recorded by the Guidance Office.',
    },
    declined: {
      icon: '✗', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200',
      title: 'Informed Consent Declined',
      desc: 'You have declined the informed consent. Please visit the Guidance Office if you wish to reconsider.',
    },
    pending: {
      icon: '⏳', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200',
      title: 'Informed Consent Pending',
      desc: 'Your informed consent form has not been signed yet. Please visit the Guidance and Counseling Office to sign the consent form before your counseling session.',
    },
  };
  const cfg = config[status] || config.pending;

  return (
    <div className={`rounded-xl border-2 ${cfg.bg} ${cfg.border} p-5`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{cfg.icon}</span>
        <div className="flex-1">
          <p className={`font-bold text-sm ${cfg.color}`}>{cfg.title}</p>
          <p className={`text-sm mt-0.5 ${cfg.color} opacity-80`}>{cfg.desc}</p>
          {consent?.notes && (
            <p className={`text-xs mt-2 ${cfg.color} opacity-70`}>
              <span className="font-semibold">Note from counselor:</span> {consent.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CounselingStatusCard({ studentId }: { studentId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('mental_health_assessments')
      .select('counseling_status, counselor_notes, counseled_at')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { setData(data); setLoading(false); });
  }, [studentId]);

  if (loading || !data || !data.counseling_status || data.counseling_status === 'pending') return null;

  const cfg: Record<string, { icon: string; color: string; bg: string; border: string; title: string; desc: string }> = {
    scheduled: {
      icon: '📅', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200',
      title: 'Counseling Session Scheduled',
      desc: 'Your counseling session has been scheduled. Please visit the Guidance and Counseling Office at your earliest convenience.',
    },    'in-progress': {
      icon: '🔄', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200',
      title: 'Counseling Session In Progress',
      desc: 'Your counseling session is currently in progress. Please continue to cooperate with your counselor.',
    },
    completed: {
      icon: '✅', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200',
      title: 'Counseling Session Completed',
      desc: data.counseled_at
        ? `Your counseling session was completed on ${new Date(data.counseled_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}.`
        : 'Your counseling session has been completed. Thank you for participating.',
    },
  };
  const c = cfg[data.counseling_status];
  if (!c) return null;

  return (
    <div className={`rounded-xl border-2 ${c.bg} ${c.border} p-5 mb-6`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">{c.icon}</span>
        <div className="flex-1">
          <p className={`font-bold text-sm ${c.color}`}>{c.title}</p>
          <p className={`text-sm mt-0.5 ${c.color} opacity-80`}>{c.desc}</p>
          {data.counselor_notes && (
            <p className={`text-xs mt-2 ${c.color} opacity-70`}>
              <span className="font-semibold">Counselor notes:</span> {data.counselor_notes}
            </p>
          )}
          {data.counseling_status === 'scheduled' && (
            <a
              href="https://docs.google.com/spreadsheets/d/1-80LunHLARHr83-yBFB9KGFObQMEM2mUIx4L1PXhgT0/edit?gid=0#gid=0"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition shadow-sm"
            >
              📋 Book Appointment — Guidance Office
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function EditProfileInline({ profile, userId, onSaved }: { profile: any; userId: string | undefined; onSaved: (p: any) => void }) {
  const toast = useToastContext();
  const [form, setForm] = useState({ full_name: profile?.full_name || '' });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(profile?.profile_picture || profile?.profile_picture_url || null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setUploading(true);
    try {
      const publicUrl = await uploadToCloudinary(file, 'nbsc-gco/profile-pictures');
      await supabase.from('profiles').update({ profile_picture: publicUrl }).eq('id', userId);
      setPreview(publicUrl);
      onSaved({ ...profile, profile_picture: publicUrl });
      toast.success('Profile picture updated!');
    } catch (err: any) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('profiles').update({ full_name: form.full_name }).eq('id', userId);
      if (error) throw error;
      onSaved({ ...profile, full_name: form.full_name });
      toast.success('Profile updated!');
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Edit Profile</h2>
            <p className="text-sm text-gray-500">Update your personal details</p>
          </div>
        </div>

        {/* Profile Picture */}
        <div className="flex flex-col items-center gap-3 mb-6 pb-6 border-b">
          <div className="relative">
            {preview ? (
              <img src={preview} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-blue-500 shadow-lg" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center border-4 border-blue-500 shadow-lg">
                <span className="text-white text-3xl font-bold">{form.full_name?.charAt(0) || 'S'}</span>
              </div>
            )}
            <label className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border-2 border-blue-500 flex items-center justify-center cursor-pointer hover:bg-blue-50 shadow-md">
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
              {uploading ? (
                <svg className="animate-spin w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              ) : (
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </label>
          </div>
          <p className="text-xs text-gray-500">Click the camera icon to change photo</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
            <input type="text" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Student ID</label>
            <input type="text" value={profile?.student_id || ''} disabled
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">Student ID cannot be changed</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Institutional Email</label>
            <input type="email" value={profile?.email || ''} disabled
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed" />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition shadow-lg mt-2"
          >
            {saving ? (
              <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Saving...</>
            ) : (
              <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Save Changes</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

function ViewSubmissionModal({ submission, onClose }: any) {
  const f = submission.form_data || {};

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="mb-6">
      <h3 className="text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 rounded-lg mb-3 uppercase tracking-wide">{title}</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{children}</div>
    </div>
  );

  const Field = ({ label, value }: { label: string; value?: string | number | boolean | null }) => {
    if (!value && value !== 0) return null;
    return (
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <p className="text-xs text-gray-500 font-medium mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-gray-800 break-words">{String(value)}</p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center z-10 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800">Submission Details</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 text-xl transition">×</button>
        </div>

        <div className="p-6">
          {/* Header: Photo + Basic Info */}
          <div className="flex flex-col sm:flex-row gap-6 mb-6 p-5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
            <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0 border-2 border-white shadow-md mx-auto sm:mx-0">
              {submission.photo_url
                ? <img src={submission.photo_url} alt="Student" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">👤</div>
              }
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Full Name</p>
                <p className="text-xl font-bold text-gray-800">{f.lastName}, {f.firstName} {f.middleInitial}</p>
              </div>
              <div><p className="text-xs text-gray-500">Student ID</p><p className="font-semibold text-gray-700">{f.idNo || submission.student_id}</p></div>
              <div><p className="text-xs text-gray-500">Program & Year</p><p className="font-semibold text-gray-700">{f.programYear || `${submission.course} - ${submission.year_level}`}</p></div>
              <div><p className="text-xs text-gray-500">Gender</p><p className="font-semibold text-gray-700">{f.gender}</p></div>
              <div><p className="text-xs text-gray-500">Civil Status</p><p className="font-semibold text-gray-700">{f.civilStatus}</p></div>
              <div><p className="text-xs text-gray-500">Mobile</p><p className="font-semibold text-gray-700">{f.mobilePhone || submission.contact_number}</p></div>
              <div><p className="text-xs text-gray-500">Submitted</p><p className="font-semibold text-gray-700">{new Date(submission.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })}</p></div>
            </div>
          </div>

          {/* Personal Info */}
          <Section title="Personal Information">
            <Field label="Birth Date" value={f.birthDate} />
            <Field label="Religion" value={f.religion} />
            <Field label="Ethnicity" value={f.ethnicity} />
            <Field label="Personal Email" value={f.personalEmail} />
            <Field label="Institutional Email" value={f.institutionalEmail} />
            <Field label="Permanent Address" value={f.permanentAddress} />
            {!f.currentAddressSame && <Field label="Current Address" value={f.currentAddress} />}
            <Field label="Is Working" value={f.isWorking ? 'Yes' : undefined} />
            {f.isWorking && <Field label="Occupation" value={f.occupation} />}
          </Section>

          {/* Family Background */}
          <Section title="Family Background">
            <Field label="Parents Status" value={f.parentsStatus} />
            <Field label="No. of Siblings" value={f.numberOfSiblings} />
            <Field label="Birth Order" value={f.birthOrder} />
            <Field label="Mother's Name" value={f.motherName} />
            <Field label="Mother's Occupation" value={f.motherOccupation} />
            <Field label="Mother's Contact" value={f.motherContact} />
            <Field label="Father's Name" value={f.fatherName} />
            <Field label="Father's Occupation" value={f.fatherOccupation} />
            <Field label="Father's Contact" value={f.fatherContact} />
            {f.guardianName && <Field label="Guardian's Name" value={f.guardianName} />}
            {f.guardianName && <Field label="Guardian's Occupation" value={f.guardianOccupation} />}
            {f.guardianName && <Field label="Guardian's Contact" value={f.guardianContact} />}
          </Section>

          {/* Educational Background */}
          <Section title="Educational Background">
            <Field label="Elementary School" value={f.elementarySchool} />
            <Field label="Elementary Years" value={f.elementaryYears} />
            <Field label="Elementary Awards" value={f.elementaryAwards} />
            <Field label="Junior High School" value={f.juniorHighSchool} />
            <Field label="Junior High Years" value={f.juniorHighYears} />
            <Field label="Junior High Awards" value={f.juniorHighAwards} />
            <Field label="Senior High School" value={f.seniorHighSchool} />
            <Field label="Senior High Years" value={f.seniorHighYears} />
            <Field label="Senior High Awards" value={f.seniorHighAwards} />
          </Section>

          {/* Interests & Activities */}
          <Section title="Interests & Activities">
            <Field label="Hobbies" value={f.hobbies} />
            <Field label="Talents" value={f.talents} />
            <Field label="Sports" value={f.sports} />
            <Field label="Socio-Civic" value={f.socioCivic} />
            <Field label="School Organizations" value={f.schoolOrg} />
          </Section>

          {/* Health History */}
          <Section title="Health History">
            <Field label="Hospitalized" value={f.hospitalized} />
            {f.hospitalized === 'Yes' && <Field label="Reason" value={f.hospitalizationReason} />}
            <Field label="Surgery" value={f.surgery} />
            {f.surgery === 'Yes' && <Field label="Surgery Reason" value={f.surgeryReason} />}
            <Field label="Chronic Illness" value={f.chronicIllness} />
            <Field label="Family Illness" value={f.familyIllness} />
            <Field label="Last Doctor Visit" value={f.lastDoctorVisit} />
          </Section>

          {/* Life Circumstances */}
          {f.lifeCircumstances?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 rounded-lg mb-3 uppercase tracking-wide">Life Circumstances</h3>
              <div className="flex flex-wrap gap-2">
                {f.lifeCircumstances.map((item: string) => (
                  <span key={item} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">{item}</span>
                ))}
                {f.lifeCircumstancesOthers && <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{f.lifeCircumstancesOthers}</span>}
              </div>
            </div>
          )}

          {/* Counselor Remarks */}
          {f.counselorRemarks && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-xs font-bold text-amber-700 mb-1">Counselor Remarks</p>
              <p className="text-sm text-amber-800">{f.counselorRemarks}</p>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t">
            <button onClick={onClose} className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium transition">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
