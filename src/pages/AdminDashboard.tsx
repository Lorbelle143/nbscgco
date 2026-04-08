import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { supabase, supabaseAdmin } from '../lib/supabase';
import { useToastContext } from '../contexts/ToastContext';
import { LoadingOverlay } from '../components/LoadingSpinner';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import AdminAnalytics from '../components/AdminAnalytics';
import MentalHealthAdmin from '../components/MentalHealthAdmin';
import FollowUpTracker from '../components/FollowUpTracker';
import BulkImport from '../components/BulkImport';
import MentalHealthTrends from '../components/MentalHealthTrends';
import CounselingSessionNotes from '../components/CounselingSessionNotes';
import ConsentTracker from '../components/ConsentTracker';
import ReportsExport from '../components/ReportsExport';
import SendNotification from '../components/SendNotification';
import { printSubmission } from '../utils/printUtils';
import { SkeletonDashboard } from '../components/SkeletonLoader';
import { exportSubmissionPDF, exportAllSubmissionsPDF } from '../utils/pdfUtils';
import { logAudit } from '../utils/auditLog';
import { notifyPasswordReset, notifySubmissionStatus } from '../utils/emailNotify';
import { uploadToCloudinary } from '../utils/cloudinary';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';

export default function AdminDashboard() {
  const { signOut, user } = useAuthStore();
  const toast = useToastContext();
  useSessionTimeout();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [adminProfile, setAdminProfile] = useState<any>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'lastName' | 'date'>('lastName');
  const [studentCourseFilter, setStudentCourseFilter] = useState('');
  const [submissionCourseFilter, setSubmissionCourseFilter] = useState('');
  const [submissionYearFilter, setSubmissionYearFilter] = useState('');
  const [showNotSubmitted, setShowNotSubmitted] = useState(false);
  const [auditSearchTerm, setAuditSearchTerm] = useState('');
  const [showAdminPasswordModal, setShowAdminPasswordModal] = useState(false);
  const [adminPasswordData, setAdminPasswordData] = useState({ current: '', newPass: '', confirm: '' });
  const [adminPasswordLoading, setAdminPasswordLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'create' | 'edit'>('view');
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'submissions' | 'students' | 'analytics' | 'users' | 'mental-health' | 'reset-requests' | 'follow-up' | 'mh-trends' | 'bulk-import' | 'audit-log' | 'session-notes' | 'consent' | 'reports' | 'send-notification'>('submissions');
  const [actionLoading, setActionLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit' | 'password'>('create');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<Set<string>>(new Set());
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [resetRequests, setResetRequests] = useState<any[]>([]);
  const [resetPasswordInputs, setResetPasswordInputs] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [studentsPage, setStudentsPage] = useState(1);
  const [studentListView, setStudentListView] = useState<'grid' | 'list'>('grid');
  const [submissionListView, setSubmissionListView] = useState<'grid' | 'list'>('grid');

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean; title: string; message: string; onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ open: true, title, message, onConfirm });
  };
  const closeConfirm = () => setConfirmDialog(d => ({ ...d, open: false }));
  const [userFormData, setUserFormData] = useState({
    full_name: '',
    student_id: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    loadAdminProfile();
    loadResetRequests();

    // Real-time: reload when a student submits or updates a form
    const channel = supabase
      .channel('admin-submissions-watch')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'inventory_submissions' },
        (payload) => {
          // Only add the new record — no full reload
          if (payload.new) {
            setSubmissions(prev => {
              const exists = prev.find(s => s.id === payload.new.id);
              if (exists) return prev;
              return [payload.new, ...prev];
            });
            setRecentSubmissions(prev => [payload.new, ...prev].slice(0, 5));
            setUnreadCount(c => c + 1);
            setHasUnreadNotifications(true);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'inventory_submissions' },
        (payload) => {
          if (payload.new) {
            setSubmissions(prev => prev.map(s => s.id === payload.new.id ? { ...s, ...payload.new } : s));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'inventory_submissions' },
        (payload) => {
          if (payload.old?.id) {
            setSubmissions(prev => prev.filter(s => s.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    // Close notifications on outside click
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-notifications]')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadAdminProfile = async () => {
    // Skip profile load for pseudo-admin (master key login — no real UUID)
    if (!user?.id || user.id === 'admin') return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
      if (data) setAdminProfile(data);
    } catch (e) {
      // silently fail
    }
  };

  const handleAdminPasswordChange = async () => {
    if (!adminPasswordData.newPass || adminPasswordData.newPass.length < 6) {
      toast.error('New password must be at least 6 characters');
      return;
    }
    if (adminPasswordData.newPass !== adminPasswordData.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      setAdminPasswordLoading(true);

      // Upsert new key into admin_settings
      const { error } = await supabase
        .from('admin_settings')
        .upsert({ id: 1, master_key: adminPasswordData.newPass, updated_at: new Date().toISOString() });

      if (error) throw error;
      toast.success('Password changed successfully');
      setShowAdminPasswordModal(false);
      setAdminPasswordData({ current: '', newPass: '', confirm: '' });
    } catch (err: any) {
      toast.error('Failed to change password: ' + err.message);
    } finally {
      setAdminPasswordLoading(false);
    }
  };

  const [auditActionFilter, setAuditActionFilter] = useState('');

  const loadAuditLogs = async () => {
    try {
      const { data } = await supabase
        .from('audit_logs')
        .select('*')
        .order('performed_at', { ascending: false })
        .limit(500);
      setAuditLogs(data || []);
    } catch {
      // table may not exist yet
    }
  };

  const loadResetRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('password_reset_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) console.error('loadResetRequests error:', error);
      setResetRequests(data || []);
    } catch (e) {
      console.error('loadResetRequests exception:', e);
    }
  };

  const setPasswordViaEdgeFunction = async (userId: string, newPassword: string): Promise<void> => {
    if (!supabaseAdmin) throw new Error('Service role key not configured or is invalid. Go to Supabase → Settings → API → service_role key and add it to .env as VITE_SUPABASE_SERVICE_ROLE_KEY');
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
    if (error) throw error;
    // Clear pending_password
    await supabaseAdmin.from('profiles').update({ pending_password: null }).eq('id', userId);
  };

  const handleResolveResetRequest = async (request: any) => {
    const newPassword = resetPasswordInputs[request.id];
    if (!newPassword || newPassword.length < 6) {
      toast.error('Enter a password of at least 6 characters');
      return;
    }
    try {
      setActionLoading(true);
      // Find the profile by student_id
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('student_id', request.student_id)
        .maybeSingle();

      if (profileError || !profile) {
        toast.error('Student profile not found');
        return;
      }

      // Update auth password directly via Edge Function
      await setPasswordViaEdgeFunction(profile.id, newPassword);

      // Mark request as resolved
      await supabase
        .from('password_reset_requests')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', request.id);

      toast.success(`Password updated for ${request.full_name}. They can now log in with the new password.`);
      // Email notification
      notifyPasswordReset(request.email || '', request.full_name, newPassword);
      setResetPasswordInputs(prev => { const n = {...prev}; delete n[request.id]; return n; });
      loadResetRequests();
    } catch (err: any) {
      toast.error('Failed to set password: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDeleteSubmissions = async () => {
    if (selectedSubmissionIds.size === 0) return;
    showConfirm(
      'Delete Selected Submissions',
      `Are you sure you want to delete ${selectedSubmissionIds.size} selected submission(s)? This cannot be undone.`,
      async () => {
        closeConfirm();
        try {
          const { error } = await supabase
            .from('inventory_submissions')
            .delete()
            .in('id', Array.from(selectedSubmissionIds));
          if (error) throw error;
          await logAudit('delete', 'inventory_submission', 'bulk', `Bulk deleted ${selectedSubmissionIds.size} submissions`);
          toast.success(`${selectedSubmissionIds.size} submissions deleted`);
          setSelectedSubmissionIds(new Set());
          loadData();
        } catch (error: any) {
          toast.error('Bulk delete failed: ' + error.message);
        }
      }
    );
  };

  const toggleSelectSubmission = (id: string) => {
    setSelectedSubmissionIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAllSubmissions = () => {
    if (selectedSubmissionIds.size === filteredAndSortedSubmissions.length) {
      setSelectedSubmissionIds(new Set());
    } else {
      setSelectedSubmissionIds(new Set(filteredAndSortedSubmissions.map(s => s.id)));
    }
  };

  const loadData = async () => {
    try {
      // Use supabaseAdmin (service role) to bypass RLS for profiles query
      const client = supabaseAdmin || supabase;

      const [profilesResult, submissionsResult] = await Promise.all([
        client
          .from('profiles')
          .select('*')
          .eq('is_admin', false),
        client
          .from('inventory_submissions')
          .select('id, user_id, student_id, full_name, course, year_level, contact_number, submission_status, admin_remarks, photo_url, form_data, created_at, updated_at, reviewed_at')
      ]);

      if (profilesResult.error) throw new Error('Profiles: ' + profilesResult.error.message);
      if (submissionsResult.error) throw new Error('Submissions: ' + submissionsResult.error.message);

      const studentsData = profilesResult.data || [];
      const submissionsData = submissionsResult.data || [];

      const studentsWithPhotos = studentsData.map(student => {
        const submission = submissionsData.find(s => s.student_id === student.student_id);
        // Prefer submission photo, fall back to profile picture (handles both column name variants)
        const profilePic = student.profile_picture || student.profile_picture_url || null;
        return { ...student, photo_url: submission?.photo_url || profilePic };
      });

      setStudents(studentsWithPhotos);
      setSubmissions(submissionsData);
      setUsers(studentsData);

      const sorted = [...submissionsData].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setRecentSubmissions(sorted.slice(0, 5));
      const lastSeen = localStorage.getItem('admin_notif_last_seen');
      const newOnes = lastSeen
        ? sorted.filter(s => new Date(s.created_at).getTime() > new Date(lastSeen).getTime())
        : sorted;
      setUnreadCount(newOnes.length);
      setHasUnreadNotifications(newOnes.length > 0);
    } catch (error: any) {
      toast.error('Failed to load data: ' + error.message);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleUpdateSubmissionStatus = async (submissionId: string, status: string, remarks: string, studentId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('inventory_submissions')
        .update({ submission_status: status, admin_remarks: remarks, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', submissionId);
      if (error) throw error;

      // Send in-app notification to student
      const notifMap: Record<string, { type: string; title: string; msg: string }> = {
        approved: { type: 'submission_approved', title: 'Form Approved', msg: `Your inventory form has been approved.${remarks ? ' Note: ' + remarks : ''}` },
        'needs-revision': { type: 'submission_needs_revision', title: 'Form Needs Revision', msg: `Your inventory form needs revision.${remarks ? ' Reason: ' + remarks : ''}` },
        'under-review': { type: 'submission_under_review', title: 'Form Under Review', msg: `Your inventory form is currently under review.${remarks ? ' Note: ' + remarks : ''}` },
      };
      const notif = notifMap[status];
      if (notif && userId) {
        await supabase.from('student_notifications').insert({
          user_id: userId,
          student_id: studentId,
          type: notif.type,
          title: notif.title,
          message: notif.msg,
          related_id: submissionId,
        });
      }
      await logAudit('update', 'inventory_submission', submissionId, `Status updated to ${status}`);
      toast.success('Submission status updated');
      // Email notification
      if (notif) {
        const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('student_id', studentId).maybeSingle();
        if (profile?.email) notifySubmissionStatus(profile.email, profile.full_name, status, remarks || undefined);
      }
      loadData();
    } catch (e: any) {
      toast.error('Failed to update status: ' + e.message);
    }
  };

  // Fetch full submission (with photo_url) only when needed for view/print
  const fetchFullSubmission = async (submission: any) => {
    return submission; // photo_url already included in list query
  };

  const handleView = async (submission: any) => {
    const full = await fetchFullSubmission(submission);
    setSelectedSubmission(full);
    setModalMode('view');
    setShowModal(true);
  };

  const handleCreate = () => {
    // Open inventory form in admin mode
    navigate('/inventory-form?admin=true');
  };

  const handleEdit = (submission: any) => {
    // Redirect to inventory form with edit ID and admin mode
    navigate(`/inventory-form?edit=${submission.id}&admin=true`);
  };

  const handleDeleteStudent = async (id: string, studentName: string) => {
    showConfirm(
      'Delete Student',
      `Delete ${studentName}'s profile? This will remove their profile, inventory submissions, mental health records, and all related data. This cannot be undone.`,
      async () => {
        closeConfirm();
        try {
          setActionLoading(true);
          const client = supabaseAdmin || supabase;
          const { data: studentProfile } = await client.from('profiles').select('student_id').eq('id', id).single();
          if (studentProfile?.student_id) {
            await Promise.allSettled([
              client.from('inventory_submissions').delete().eq('student_id', studentProfile.student_id),
              client.from('mental_health_assessments').delete().eq('student_id', studentProfile.student_id),
              client.from('student_notifications').delete().eq('student_id', studentProfile.student_id),
              client.from('consent_records').delete().eq('student_id', studentProfile.student_id),
              client.from('password_reset_requests').delete().eq('student_id', studentProfile.student_id),
            ]);
          }
          const { error: profileError } = await client.from('profiles').delete().eq('id', id);
          if (profileError) throw profileError;
          if (supabaseAdmin) await supabaseAdmin.auth.admin.deleteUser(id);
          await logAudit('delete', 'profile', id, `Deleted student profile: ${studentName}`);
          toast.success('Student deleted successfully');
          loadData();
        } catch (error: any) {
          toast.error('Error deleting student: ' + (error.message || 'Unknown error'));
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const handleViewStudent = (student: any) => {
    setSelectedSubmission({ 
      id: student.id,
      student_id: student.student_id,
      full_name: student.full_name,
      photo_url: student.photo_url || null,
      form_data: {
        email: student.email,
        createdAt: student.created_at
      }
    });
    setModalMode('view');
    setShowModal(true);
  };

  const handleEditStudent = (student: any) => {
    setSelectedSubmission({
      id: student.id,
      student_id: student.student_id,
      full_name: student.full_name,
      email: student.email,
      photo_url: student.photo_url || null,
      form_data: {
        email: student.email,
      }
    });
    setModalMode('edit');
    setShowModal(true);
  };

  // User Management Functions
  const handleCreateUser = () => {
    setUserFormData({
      full_name: '',
      student_id: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
    setUserModalMode('create');
    setShowUserModal(true);
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setUserFormData({
      full_name: user.full_name,
      student_id: user.student_id,
      email: user.email,
      password: '',
      confirmPassword: ''
    });
    setUserModalMode('edit');
    setShowUserModal(true);
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    showConfirm(
      'Delete User Account',
      `Delete ${userName}'s account? This will permanently remove their profile and login access. This cannot be undone.`,
      async () => {
        closeConfirm();
        try {
          setActionLoading(true);
          const client = supabaseAdmin || supabase;
          const { data: studentProfile } = await client.from('profiles').select('student_id').eq('id', userId).maybeSingle();
          if (studentProfile?.student_id) {
            await Promise.allSettled([
              client.from('inventory_submissions').delete().eq('student_id', studentProfile.student_id),
              client.from('mental_health_assessments').delete().eq('student_id', studentProfile.student_id),
              client.from('student_notifications').delete().eq('student_id', studentProfile.student_id),
              client.from('consent_records').delete().eq('student_id', studentProfile.student_id),
              client.from('password_reset_requests').delete().eq('student_id', studentProfile.student_id),
            ]);
          }
          const { error: profileError } = await client.from('profiles').delete().eq('id', userId);
          if (profileError) throw new Error('Profile delete failed: ' + profileError.message);
          if (supabaseAdmin) {
            const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
            if (authError) console.warn('Auth user delete warning:', authError.message);
          }
          await logAudit('delete', 'profile', userId, `Deleted user account: ${userName}`);
          toast.success(`${userName} deleted successfully`);
          loadData();
        } catch (error: any) {
          toast.error('Failed to delete user: ' + error.message);
        } finally {
          setActionLoading(false);
        }
      }
    );
  };

  const handleUserFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserFormData({
      ...userFormData,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (userModalMode === 'create') {
      // Validate password
      if (userFormData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      if (userFormData.password !== userFormData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      try {
        setActionLoading(true);

        if (!supabaseAdmin) throw new Error('Service role key not configured');

        // Create auth user via admin API (no session conflict, email auto-confirmed)
        const { data: adminAuthData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userFormData.email,
          password: userFormData.password,
          email_confirm: true,
          user_metadata: {
            full_name: userFormData.full_name,
            student_id: userFormData.student_id,
          },
        });

        if (authError) throw authError;
        if (!adminAuthData.user) throw new Error('Failed to create user account');

        // Insert profile using admin client to bypass RLS
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .insert({
            id: adminAuthData.user.id,
            full_name: userFormData.full_name,
            student_id: userFormData.student_id,
            email: userFormData.email,
            is_admin: false
          });

        if (profileError) throw new Error('Profile creation failed: ' + profileError.message);

        toast.success('User created successfully! They can now log in.');
        setShowUserModal(false);
        loadData();
      } catch (error: any) {
        toast.error('Failed to create user: ' + error.message);
      } finally {
        setActionLoading(false);
      }
    } else if (userModalMode === 'edit') {
      // Validate password if provided
      if (userFormData.password && userFormData.password.length < 6) {
        toast.error('Password must be at least 6 characters');
        return;
      }
      if (userFormData.password && userFormData.password !== userFormData.confirmPassword) {
        toast.error('Passwords do not match');
        return;
      }

      try {
        setActionLoading(true);

        // Update profile using admin client to bypass RLS
        const { error: profileError } = await (supabaseAdmin || supabase)
          .from('profiles')
          .update({
            full_name: userFormData.full_name,
            student_id: userFormData.student_id,
            email: userFormData.email
          })
          .eq('id', selectedUser.id);

        if (profileError) throw profileError;

        // If password is provided, update auth password directly via Edge Function
        if (userFormData.password) {
          try {
            await setPasswordViaEdgeFunction(selectedUser.id, userFormData.password);
            toast.success('User updated and password changed successfully.');
          } catch (pwErr: any) {
            toast.success('User profile updated.');
            toast.error('Password change failed: ' + pwErr.message);
          }
        } else {
          toast.success('User updated successfully');
        }
        setShowUserModal(false);
        loadData();
      } catch (error: any) {
        toast.error('Failed to update user: ' + error.message);
      } finally {
        setActionLoading(false);
      }
    }
  };

  const handleSaveStudent = async (formData: any) => {
    try {
      const updateData: any = {
        full_name: formData.full_name,
        student_id: formData.student_id,
        email: formData.email,
      };

      // Save profile picture if updated
      if (formData.photoUrl) {
        updateData.profile_picture = formData.photoUrl;
      }

      const { error } = await (supabaseAdmin || supabase)
        .from('profiles')
        .update(updateData)
        .eq('id', selectedSubmission.id);

      if (error) throw error;
      toast.success('Student updated successfully');
      setShowModal(false);
      loadData();
    } catch (error: any) {
      toast.error('Error updating student: ' + (error.message || 'Unknown error'));
    }
  };

  const handleDelete = async (id: string, studentName: string) => {
    showConfirm(
      'Delete Submission',
      `Delete ${studentName}'s inventory record? This will permanently remove the record and associated photo. This cannot be undone.`,
      async () => {
        closeConfirm();
        try {
          const { data: submission } = await supabase.from('inventory_submissions').select('photo_url').eq('id', id).single();
          const { error: deleteError } = await supabase.from('inventory_submissions').delete().eq('id', id);
          if (deleteError) throw new Error(deleteError.message);
          if (submission?.photo_url) {
            try {
              const photoPath = submission.photo_url.split('/').pop();
              if (photoPath) await supabase.storage.from('student-photos').remove([photoPath]);
            } catch { /* ignore photo deletion failure */ }
          }
          toast.success('Record deleted successfully');
          await logAudit('delete', 'inventory_submission', id, `Deleted submission for ${studentName}`);
          loadData();
        } catch (error: any) {
          toast.error('Error deleting record: ' + (error.message || 'Unknown error'));
        }
      }
    );
  };

  const handleSave = async (formData: any) => {
    try {
      if (modalMode === 'create') {
        // Generate a dummy UUID for admin-created records
        const dummyUserId = '00000000-0000-0000-0000-000000000000';
        
        const { error } = await supabase
          .from('inventory_submissions')
          .insert({
            user_id: dummyUserId, // Use dummy UUID instead of string
            student_id: formData.idNo,
            full_name: `${formData.firstName} ${formData.middleInitial} ${formData.lastName}`.trim(),
            course: formData.programYear,
            year_level: formData.programYear.split(' ')[0] || '1',
            contact_number: formData.mobilePhone,
            photo_url: formData.photoUrl || '',
            form_data: formData,
            google_form_response_id: '',
          });

        if (error) throw error;
        toast.success('Record created successfully');
      } else if (modalMode === 'edit') {
        // Build the full name from the form data
        const fullName = `${formData.firstName} ${formData.middleInitial} ${formData.lastName}`.trim();
        
        // Extract year level from program year (e.g., "BSIT - First year" -> "First")
        const yearLevel = formData.programYear.split(' ')[0] || '1';
        
        // Merge the new form data with existing form_data
        const existingFormData = selectedSubmission?.form_data || {};
        const updatedFormData = {
          ...existingFormData,
          lastName: formData.lastName,
          firstName: formData.firstName,
          middleInitial: formData.middleInitial,
          idNo: formData.idNo,
          programYear: formData.programYear,
          mobilePhone: formData.mobilePhone,
          birthDate: formData.birthDate,
          gender: formData.gender,
          ethnicity: formData.ethnicity,
          religion: formData.religion,
          civilStatus: formData.civilStatus,
          permanentAddress: formData.permanentAddress,
        };

        const updateData: any = {
          student_id: formData.idNo,
          full_name: fullName,
          course: formData.programYear,
          year_level: yearLevel,
          contact_number: formData.mobilePhone,
          form_data: updatedFormData,
        };

        // Include photo_url if it was updated
        if (formData.photoUrl) {
          updateData.photo_url = formData.photoUrl;
        }

        const { error } = await supabase
          .from('inventory_submissions')
          .update(updateData)
          .eq('id', selectedSubmission.id);

        if (error) throw error;
        toast.success('Record updated successfully');
      }

      setShowModal(false);
      loadData();
    } catch (error: any) {
      toast.error('Error saving record: ' + (error.message || 'Unknown error'));
    }
  };

  const exportToCSV = () => {
    const headers = ['Student ID', 'Last Name', 'First Name', 'Course', 'Year Level', 'Contact Number', 'Submitted Date & Time'];
    
    // Sort submissions by last name A-Z before exporting
    const sortedForExport = [...filteredAndSortedSubmissions].sort((a, b) => {
      const lastNameA = (a.form_data?.lastName || a.full_name.split(' ')[0] || '').toLowerCase();
      const lastNameB = (b.form_data?.lastName || b.full_name.split(' ')[0] || '').toLowerCase();
      return lastNameA.localeCompare(lastNameB);
    });
    
    const rows = sortedForExport.map(s => {
      const formData = s.form_data || {};
      const submittedDate = new Date(s.created_at);
      
      // Format: MM/DD/YYYY HH:MM:SS AM/PM
      const dateTimeString = submittedDate.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      
      return [
        s.student_id || '',
        formData.lastName || '',
        formData.firstName || '',
        s.course || '',
        s.year_level || '',
        s.contact_number || '',
        dateTimeString
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student_inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportSelectedCSV = () => {
    const selected = filteredAndSortedSubmissions.filter(s => selectedSubmissionIds.has(s.id));
    if (selected.length === 0) return;
    const headers = ['Student ID', 'Last Name', 'First Name', 'Course', 'Year Level', 'Contact Number', 'Submitted Date & Time'];
    const rows = selected.map(s => {
      const f = s.form_data || {};
      const dt = new Date(s.created_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
      return [s.student_id||'', f.lastName||'', f.firstName||'', s.course||'', s.year_level||'', s.contact_number||'', dt];
    });
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected_students_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Filter students
  const filteredStudents = students.filter(s => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      (s.full_name || '').toLowerCase().includes(searchLower) ||
      (s.student_id || '').toLowerCase().includes(searchLower) ||
      (s.email || '').toLowerCase().includes(searchLower)
    );
    const matchesCourse = !studentCourseFilter || submissions.some(sub => sub.student_id === s.student_id && (sub.course || '').toLowerCase().includes(studentCourseFilter.toLowerCase()));
    return matchesSearch && matchesCourse;
  });

  const sortedStudents = [...filteredStudents]
    .filter(s => !showNotSubmitted || !submissions.some(sub => sub.student_id === s.student_id))
    .sort((a, b) => {
      if (sortBy === 'lastName') {
        const lastNameA = (a.full_name || '').split(' ')[0].toLowerCase();
        const lastNameB = (b.full_name || '').split(' ')[0].toLowerCase();
        return lastNameA.localeCompare(lastNameB);
      } else {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

  // Filter submissions
  const filteredSubmissions = submissions.filter(s => {
    const formData = s.form_data || {};
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      s.full_name.toLowerCase().includes(searchLower) ||
      s.student_id.toLowerCase().includes(searchLower) ||
      (formData.lastName || '').toLowerCase().includes(searchLower) ||
      (formData.firstName || '').toLowerCase().includes(searchLower)
    );
    const matchesCourse = !submissionCourseFilter || (s.course || '').toLowerCase().includes(submissionCourseFilter.toLowerCase());
    const matchesYear = !submissionYearFilter || (s.year_level || '').toLowerCase().includes(submissionYearFilter.toLowerCase()) || (s.course || '').toLowerCase().includes(submissionYearFilter.toLowerCase());
    return matchesSearch && matchesCourse && matchesYear;
  });

  const filteredAndSortedSubmissions = [...filteredSubmissions].sort((a, b) => {
    if (sortBy === 'lastName') {
      const lastNameA = (a.form_data?.lastName || a.full_name.split(' ')[0] || '').toLowerCase();
      const lastNameB = (b.form_data?.lastName || b.full_name.split(' ')[0] || '').toLowerCase();
      return lastNameA.localeCompare(lastNameB);
    } else {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  const totalPages = Math.ceil(filteredAndSortedSubmissions.length / pageSize);
  const paginatedSubmissions = filteredAndSortedSubmissions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Reset to page 1 when search/sort changes
  useEffect(() => { setCurrentPage(1); }, [searchTerm, sortBy]);
  useEffect(() => { setStudentsPage(1); }, [searchTerm, sortBy, studentCourseFilter, showNotSubmitted]);

  const totalStudentPages = Math.ceil(sortedStudents.length / pageSize);
  const paginatedStudents = sortedStudents.slice((studentsPage - 1) * pageSize, studentsPage * pageSize);

  if (initialLoading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
        <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 animate-pulse hidden lg:flex flex-col">
          <div className="h-20 border-b border-gray-200 flex items-center px-6 gap-3">
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div className="space-y-2"><div className="h-3 bg-gray-200 rounded w-20"></div><div className="h-2 bg-gray-100 rounded w-24"></div></div>
          </div>
          <div className="p-3 space-y-2 mt-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-11 bg-gray-100 rounded-lg"></div>)}
          </div>
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-20 bg-white border-b border-gray-200 animate-pulse flex items-center px-8 justify-between">
            <div className="space-y-2"><div className="h-5 bg-gray-200 rounded w-40"></div><div className="h-3 bg-gray-100 rounded w-48"></div></div>
            <div className="flex gap-3"><div className="w-10 h-10 bg-gray-200 rounded-lg"></div><div className="w-10 h-10 bg-gray-200 rounded-full"></div></div>
          </div>
          <SkeletonDashboard />
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Left Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 flex flex-col transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="h-20 flex items-center justify-center border-b border-gray-200 px-4">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="GCO Logo" className="w-10 h-10 object-contain flex-shrink-0" />
            <p className="text-sm font-semibold text-gray-700">Admin Panel</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-2 px-3 space-y-0.5 overflow-y-auto">
          <button
            onClick={() => setViewMode('submissions')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              viewMode === 'submissions' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="font-medium text-sm">Home</span>
            {submissions.length > 0 && (
              <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${viewMode === 'submissions' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'}`}>
                {submissions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setViewMode('students')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              viewMode === 'students' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="font-medium text-sm">Students</span>
            {students.length > 0 && (
              <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${viewMode === 'students' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'}`}>
                {students.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setViewMode('mental-health')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${viewMode === 'mental-health' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-sm">Mental Health</span>
          </button>

          <button
            onClick={() => setViewMode('follow-up')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${viewMode === 'follow-up' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="font-medium text-sm">Follow-up Tracking</span>
          </button>

          <button
            onClick={() => setViewMode('session-notes')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${viewMode === 'session-notes' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="font-medium text-sm">Session Notes</span>
          </button>

          <button
            onClick={() => setViewMode('consent')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${viewMode === 'consent' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-sm">Consent Tracker</span>
          </button>

          <button
            onClick={() => setViewMode('mh-trends')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${viewMode === 'mh-trends' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="font-medium text-sm">MH Trends</span>
          </button>

          <button
            onClick={() => setViewMode('analytics')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${viewMode === 'analytics' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="font-medium text-sm">Analytics</span>
          </button>

          <button
            onClick={() => setViewMode('reports')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${viewMode === 'reports' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium text-sm">Reports & Export</span>
          </button>

          <button
            onClick={() => setViewMode('bulk-import')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${viewMode === 'bulk-import' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <span className="font-medium text-sm">Bulk Import</span>
          </button>

          <button
            onClick={() => { setViewMode('reset-requests'); loadResetRequests(); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${viewMode === 'reset-requests' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span className="font-medium text-sm">Password Requests</span>
            {resetRequests.filter(r => r.status === 'pending').length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {resetRequests.filter(r => r.status === 'pending').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setViewMode('users')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${viewMode === 'users' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="font-medium text-sm">User Management</span>
          </button>

          <button
            onClick={() => setViewMode('send-notification')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${viewMode === 'send-notification' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span className="font-medium text-sm">Send Notification</span>
          </button>

          <button
            onClick={() => { setViewMode('audit-log'); loadAuditLogs(); }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${viewMode === 'audit-log' ? 'bg-orange-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="font-medium text-sm">Audit Log</span>
          </button>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="font-medium text-sm">Sign Out</span>
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
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-0.5">
                <span>Admin</span>
                {viewMode !== 'submissions' && (
                  <>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-gray-600 font-medium capitalize">{viewMode.replace('-', ' ')}</span>
                  </>
                )}
              </div>
              <h2 className="text-2xl font-bold text-gray-800">
                {viewMode === 'submissions' && 'Dashboard Overview'}
                {viewMode === 'students' && 'Student Management'}
                {viewMode === 'analytics' && 'Analytics & Reports'}
                {viewMode === 'mental-health' && 'Mental Health Assessments'}
                {viewMode === 'users' && 'User Management'}
                {viewMode === 'reset-requests' && 'Password Reset Requests'}
                {viewMode === 'follow-up' && 'Follow-up Tracking'}
                {viewMode === 'mh-trends' && 'Mental Health Trends'}
                {viewMode === 'bulk-import' && 'Bulk Import Students'}
                {viewMode === 'session-notes' && 'Counseling Session Notes'}
                {viewMode === 'consent' && 'Informed Consent Tracker'}
                {viewMode === 'reports' && 'Reports & Export'}
                {viewMode === 'send-notification' && 'Send Notification'}
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Notification Bell */}
            <div className="relative" data-notifications>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) {
                    localStorage.setItem('admin_notif_last_seen', new Date().toISOString());
                    setHasUnreadNotifications(false);
                    setUnreadCount(0);
                  }
                }}
                className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {hasUnreadNotifications && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50">
                  <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-800">Recent Submissions</h3>
                    <span className="text-xs text-gray-500">{unreadCount > 0 ? `${unreadCount} new` : `${recentSubmissions.length} recent`}</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {recentSubmissions.length > 0 ? (
                      recentSubmissions.map(s => {
                        const formData = s.form_data || {};
                        const name = formData.firstName
                          ? `${formData.firstName} ${formData.lastName}`
                          : s.full_name;
                        return (
                          <div
                            key={s.id}
                            className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={() => { setShowNotifications(false); handleView(s); }}
                          >
                            <div className="flex items-start gap-3">
                              {s.photo_url ? (
                                <img src={s.photo_url} alt={name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <span className="text-orange-600 text-xs font-bold">{name?.charAt(0) || 'S'}</span>
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{name}</p>
                                <p className="text-xs text-gray-500">{s.course} · {new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-6 text-center text-gray-500 text-sm">
                        No recent submissions
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-gray-100">
                    <button
                      onClick={() => { setShowNotifications(false); setViewMode('submissions'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="w-full text-center text-xs text-orange-600 hover:text-orange-700 font-medium"
                    >
                      View all submissions →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Admin Avatar + Change Password */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdminPasswordModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-medium transition-all border border-orange-200"
                title="Change Admin Password"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                Change Password
              </button>
              <div
                className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:ring-2 hover:ring-orange-400 transition-all"
                onClick={() => setShowAdminPasswordModal(true)}
                title="Change Password"
              >
                {adminProfile?.profile_picture ? (
                  <img
                    src={adminProfile.profile_picture}
                    alt="Admin"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-white font-semibold text-sm">
                    {adminProfile?.full_name?.charAt(0) || 'A'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area - Scrollable */}
        <main className="flex-1 overflow-y-auto p-8">

        {/* Analytics View */}
        {(viewMode === 'analytics') && (
          <AdminAnalytics submissions={submissions} students={students} />
        )}

        {/* Mental Health View */}
        {viewMode === 'mental-health' && (
          <MentalHealthAdmin />
        )}

        {/* Follow-up Tracking View */}
        {viewMode === 'follow-up' && (
          <FollowUpTracker />
        )}

        {/* Mental Health Trends View */}
        {viewMode === 'mh-trends' && (
          <MentalHealthTrends />
        )}

        {/* Session Notes View */}
        {viewMode === 'session-notes' && (
          <CounselingSessionNotes />
        )}

        {/* Consent Tracker View */}
        {viewMode === 'consent' && (
          <ConsentTracker />
        )}

        {/* Reports & Export View */}
        {viewMode === 'reports' && (
          <ReportsExport />
        )}

        {/* Send Notification View */}
        {viewMode === 'send-notification' && (
          <SendNotification students={students} />
        )}

        {/* Bulk Import View */}
        {viewMode === 'bulk-import' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">📥 Bulk Import Students</h2>
              <p className="text-sm text-gray-500">Upload a CSV file to register multiple students at once</p>
            </div>
            <BulkImport onDone={loadData} />
          </div>
        )}

        {/* User Management View */}
        {viewMode === 'users' && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-red-50 px-8 py-6 border-b-2 border-orange-100">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">🔐 User Account Management</h2>
                  <p className="text-sm text-gray-600">Manage student login accounts, passwords, and permissions</p>
                </div>
                <button
                  onClick={handleCreateUser}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 transition shadow-lg hover:shadow-xl font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Create User
                </button>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.map((user) => (
                  <div key={user.id} className="bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-xl p-6 hover:shadow-lg transition">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {user.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800">{user.full_name}</h3>
                          <p className="text-xs text-gray-500">{user.student_id}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {user.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition font-medium"
                        title="Edit User"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.full_name)}
                        className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition font-medium"
                        title="Delete User"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {users.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-lg font-medium">No user accounts found</p>
                  <p className="text-sm mt-1">Create a new user account to get started</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content Card */}
        {(viewMode === 'students' || viewMode === 'submissions') && (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-white px-8 py-6 border-b-2 border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-1">
                  {viewMode === 'students' ? '👥 Registered Students' : '📋 Student Inventory Records'}
                </h2>
                <p className="text-sm text-gray-600">
                  {viewMode === 'students' 
                    ? 'Manage student profiles and information' 
                    : 'View and manage inventory form submissions'}
                </p>
              </div>
              <div className="flex gap-3">
                {viewMode === 'students' && (
                  <>
                    {/* Grid / List toggle */}
                    <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setStudentListView('grid')}
                        title="Grid view"
                        className={`px-3 py-2 transition ${studentListView === 'grid' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setStudentListView('list')}
                        title="List view"
                        className={`px-3 py-2 transition ${studentListView === 'list' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </button>
                    </div>
                    <button
                      onClick={() => setShowNotSubmitted(!showNotSubmitted)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition shadow-md font-medium text-sm ${showNotSubmitted ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 border-2 border-amber-300 hover:bg-amber-100'}`}
                    >
                      {showNotSubmitted ? '👥 All Students' : '⚠️ Not Submitted'}
                      {!showNotSubmitted && (
                        <span className="bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                          {students.filter(s => !submissions.some(sub => sub.student_id === s.student_id)).length}
                        </span>
                      )}
                    </button>
                    <button
                      onClick={handleCreateUser}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-lg hover:shadow-xl font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Register Student
                    </button>
                  </>
                )}
                {viewMode === 'submissions' && (
                  <>
                    {/* Grid / List toggle */}
                    <div className="flex border-2 border-gray-200 rounded-xl overflow-hidden">
                      <button onClick={() => setSubmissionListView('grid')} title="Grid view"
                        className={`px-3 py-2 transition ${submissionListView === 'grid' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                      </button>
                      <button onClick={() => setSubmissionListView('list')} title="List view"
                        className={`px-3 py-2 transition ${submissionListView === 'list' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                      </button>
                    </div>
                    <button
                      onClick={handleCreate}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition shadow-lg hover:shadow-xl font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Student
                    </button>
                    <button
                      onClick={() => { exportAllSubmissionsPDF(filteredAndSortedSubmissions); logAudit('export', 'inventory_submission', 'all', `Printed report for ${filteredAndSortedSubmissions.length} submissions`); }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition shadow-lg hover:shadow-xl font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print Report
                    </button>
                    <button
                      onClick={exportToCSV}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition shadow-lg hover:shadow-xl font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export CSV
                    </button>
                    <button
                      onClick={() => { exportAllSubmissionsPDF(filteredAndSortedSubmissions); logAudit('export', 'inventory_submission', 'all', `Exported ${filteredAndSortedSubmissions.length} submissions to PDF`); }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl hover:from-red-700 hover:to-pink-700 transition shadow-lg hover:shadow-xl font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export PDF
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-48 relative">
                <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={viewMode === 'students' ? 'Search by name, student ID, or email...' : 'Search by name or student ID...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              {viewMode === 'students' && (
                <input
                  type="text"
                  placeholder="Filter by course..."
                  value={studentCourseFilter}
                  onChange={(e) => setStudentCourseFilter(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition w-48"
                />
              )}
              {viewMode === 'submissions' && (
                <>
                  <select
                    value={submissionCourseFilter}
                    onChange={(e) => setSubmissionCourseFilter(e.target.value)}
                    className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-medium"
                  >
                    <option value="">All Courses</option>
                    <option value="Bachelor of Science in Information Technology">Bachelor of Science in Information Technology</option>
                    <option value="Bachelor of Science in Business Administration">Bachelor of Science in Business Administration</option>
                    <option value="Bachelor of Education">Bachelor of Education</option>
                  </select>
                  <select
                    value={submissionYearFilter}
                    onChange={(e) => setSubmissionYearFilter(e.target.value)}
                    className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-medium"
                  >
                    <option value="">All Years</option>
                    <option value="First Year">1st Year</option>
                    <option value="Second Year">2nd Year</option>
                    <option value="Third Year">3rd Year</option>
                    <option value="Fourth Year">4th Year</option>
                    <option value="Fifth Year">5th Year</option>
                  </select>
                </>
              )}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'lastName' | 'date')}
                className="px-5 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-medium"
              >
                <option value="lastName">📝 Sort by Last Name</option>
                <option value="date">📅 Sort by Date</option>
              </select>
            </div>
          </div>

          {/* Students View */}
          {viewMode === 'students' && (
            <div className="p-8">
              {/* Grid View */}
              {studentListView === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {paginatedStudents.map((student) => (
                    <div key={student.id} className="group bg-gradient-to-br from-white to-gray-50 border-2 border-gray-200 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden transform hover:-translate-y-1">
                      <div className="aspect-square bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center relative overflow-hidden">
                        {student.photo_url ? (
                          <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-purple-400/20"></div>
                            <svg className="w-28 h-28 text-blue-600 relative z-10" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </>
                        )}
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-gray-800 text-lg mb-2 truncate">{student.full_name}</h3>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                            </svg>
                            <span className="font-medium">{student.student_id}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 truncate">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate">{student.email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Joined {new Date(student.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            {(() => {
                              const count = submissions.filter(s => s.student_id === student.student_id).length;
                              return (
                                <span className={`px-2 py-0.5 rounded-full font-bold ${count > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                  {count} submission{count !== 1 ? 's' : ''}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleViewStudent(student)} className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition font-medium shadow-md">View</button>
                          <button onClick={() => handleEditStudent(student)} className="flex-1 px-3 py-2 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 transition font-medium shadow-md">Edit</button>
                        </div>
                        <button onClick={() => handleDeleteStudent(student.id, student.full_name)} className="mt-2 w-full px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition font-medium shadow-md">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty state — students grid view */}
              {studentListView === 'grid' && paginatedStudents.length === 0 && (
                <EmptyState
                  icon="👥"
                  title={searchTerm ? 'No students match your search' : showNotSubmitted ? 'All students have submitted' : 'No students registered yet'}
                  description={searchTerm ? 'Try a different search term.' : 'Register a student to get started.'}
                  action={!searchTerm ? { label: 'Register Student', onClick: handleCreateUser } : undefined}
                />
              )}

              {/* List View */}
              {studentListView === 'list' && (
                <div className="overflow-x-auto">
                <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden min-w-[640px]">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <div className="col-span-4">Student</div>
                    <div className="col-span-3">Email</div>
                    <div className="col-span-2">Joined</div>
                    <div className="col-span-1 text-center">Forms</div>
                    <div className="col-span-2 text-center">Actions</div>
                  </div>
                  {paginatedStudents.map((student) => {
                    const subCount = submissions.filter(s => s.student_id === student.student_id).length;
                    return (
                      <div key={student.id} className="grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-gray-50 transition">
                        {/* Photo + Name */}
                        <div className="col-span-4 flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
                            {student.photo_url
                              ? <img src={student.photo_url} alt={student.full_name} className="w-full h-full object-cover" />
                              : <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 text-sm truncate">{student.full_name}</p>
                            <p className="text-xs text-gray-400">{student.student_id}</p>
                          </div>
                        </div>
                        {/* Email */}
                        <div className="col-span-3 text-sm text-gray-500 truncate">{student.email}</div>
                        {/* Joined */}
                        <div className="col-span-2 text-xs text-gray-400">{new Date(student.created_at).toLocaleDateString()}</div>
                        {/* Submissions */}
                        <div className="col-span-1 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${subCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{subCount}</span>
                        </div>
                        {/* Actions */}
                        <div className="col-span-2 flex items-center justify-center gap-1">
                          <button onClick={() => handleViewStudent(student)} className="px-2 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition font-medium">View</button>
                          <button onClick={() => handleEditStudent(student)} className="px-2 py-1 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition font-medium">Edit</button>
                          <button onClick={() => handleDeleteStudent(student.id, student.full_name)} className="px-2 py-1 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 transition font-medium">Del</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state — students list view */}
          {viewMode === 'students' && studentListView === 'list' && paginatedStudents.length === 0 && (
            <EmptyState
              icon="👥"
              title={searchTerm ? 'No students match your search' : showNotSubmitted ? 'All students have submitted' : 'No students registered yet'}
              description={searchTerm ? 'Try a different search term.' : 'Register a student to get started.'}
              action={!searchTerm ? { label: 'Register Student', onClick: handleCreateUser } : undefined}
            />
          )}

          {/* Submissions View */}
          {viewMode === 'submissions' && (
            <>
            {/* Bulk Actions Toolbar */}
            {selectedSubmissionIds.size > 0 && (
              <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
                <span className="text-sm font-semibold text-orange-800">{selectedSubmissionIds.size} selected</span>
                <button
                  onClick={handleBulkDeleteSubmissions}
                  className="flex items-center gap-1 px-4 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 font-medium"
                >
                  🗑️ Delete Selected
                </button>
                <button
                  onClick={exportSelectedCSV}
                  className="flex items-center gap-1 px-4 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 font-medium"
                >
                  📥 Export CSV
                </button>
                <button
                  onClick={() => { exportAllSubmissionsPDF(filteredAndSortedSubmissions.filter(s => selectedSubmissionIds.has(s.id))); }}
                  className="flex items-center gap-1 px-4 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 font-medium"
                >
                  📄 Export PDF
                </button>
                <button
                  onClick={() => setSelectedSubmissionIds(new Set())}
                  className="px-4 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={toggleSelectAllSubmissions}
                  className="ml-auto px-4 py-1.5 bg-orange-100 text-orange-700 text-sm rounded-lg hover:bg-orange-200 font-medium"
                >
                  {selectedSubmissionIds.size === filteredAndSortedSubmissions.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
            )}
            {submissionListView === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {paginatedSubmissions.map((submission) => {
              const formData = submission.form_data || {};
              const hasDocuments = false; // document upload removed
              return (
                <div key={submission.id} className={`bg-white border-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden ${selectedSubmissionIds.has(submission.id) ? 'border-orange-400 ring-2 ring-orange-300' : 'border-gray-200 hover:border-green-400'}`}>
                  {/* Photo */}
                  <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 relative">
                    {submission.photo_url ? (
                      <img
                        src={submission.photo_url}
                        alt={submission.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-20 h-20 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    {/* Checkbox Overlay */}
                    <div className="absolute top-2 left-2">
                      <input
                        type="checkbox"
                        checked={selectedSubmissionIds.has(submission.id)}
                        onChange={() => toggleSelectSubmission(submission.id)}
                        className="w-4 h-4 accent-orange-600 cursor-pointer"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    {/* Status Badge Overlay */}
                    <div className="absolute top-2 right-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border-2 ${
                        hasDocuments 
                          ? 'bg-green-50 text-green-700 border-green-300' 
                          : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}>
                        {hasDocuments ? '✅' : '⏳'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-bold text-gray-800 text-lg mb-1 truncate">
                      {formData.lastName || ''}, {formData.firstName || ''}
                    </h3>
                    <p className="text-xs text-gray-500 mb-3 font-medium">ID: {submission.student_id}</p>
                    
                    <div className="space-y-1 mb-3">
                      <p className="text-sm text-gray-700 font-medium">{submission.course}</p>
                      <p className="text-sm text-gray-600">Year {submission.year_level}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {submission.contact_number}
                      </div>
                    </div>

                    {/* Documents Badge */}
                    {hasDocuments && (
                      <div className="flex items-center gap-1 mb-3 px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-700 font-medium">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formData.documentUrls.length} docs
                      </div>
                    )}
                    
                    {/* Submission Status Badge */}
                    {submission.submission_status && submission.submission_status !== 'submitted' && (
                      <div className={`flex items-center gap-1 mb-2 px-2 py-1 rounded text-xs font-medium border ${
                        submission.submission_status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                        submission.submission_status === 'needs-revision' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {submission.submission_status === 'approved' ? '✅ Approved' :
                         submission.submission_status === 'needs-revision' ? '✏️ Needs Revision' : '🔍 Under Review'}
                      </div>
                    )}
                    {submission.admin_remarks && (
                      <p className="text-xs text-gray-500 italic mb-2 line-clamp-1">"{submission.admin_remarks}"</p>
                    )}
                    
                    <p className="text-xs text-gray-400 mb-3 pb-3 border-b border-gray-200">
                      📅 {new Date(submission.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>                    
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleView(submission)}
                        className="px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs rounded-lg hover:from-blue-700 hover:to-indigo-700 transition font-medium shadow-md"
                      >
                        👁️ View
                      </button>
                      <button
                        onClick={() => handleEdit(submission)}
                        className="px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs rounded-lg hover:from-amber-600 hover:to-orange-600 transition font-medium shadow-md"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={async () => { const full = await fetchFullSubmission(submission); printSubmission(full); }}
                        className="px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs rounded-lg hover:from-purple-700 hover:to-indigo-700 transition font-medium shadow-md"
                      >
                        🖨️ Print
                      </button>
                      <button
                        onClick={async () => { const full = await fetchFullSubmission(submission); exportSubmissionPDF(full); }}
                        className="px-3 py-2 bg-gradient-to-r from-red-600 to-pink-600 text-white text-xs rounded-lg hover:from-red-700 hover:to-pink-700 transition font-medium shadow-md"
                      >
                        📄 PDF
                      </button>
                      <button
                        onClick={() => handleDelete(submission.id, submission.full_name)}
                        className="col-span-2 px-3 py-2 bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs rounded-lg hover:from-red-700 hover:to-rose-700 transition font-medium shadow-md"
                      >
                        🗑 Delete
                      </button>
                      <button
                        onClick={() => handleUpdateSubmissionStatus(submission.id, 'approved', '', submission.student_id, submission.user_id)}
                        className="px-3 py-2 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition font-medium shadow-md"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => {
                          const remarks = prompt('Enter revision notes for the student:');
                          if (remarks !== null) handleUpdateSubmissionStatus(submission.id, 'needs-revision', remarks, submission.student_id, submission.user_id);
                        }}
                        className="px-3 py-2 bg-amber-500 text-white text-xs rounded-lg hover:bg-amber-600 transition font-medium shadow-md"
                      >
                        ✏️ Revise
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
            )}

            {/* Empty state — submissions grid */}
            {submissionListView === 'grid' && paginatedSubmissions.length === 0 && (
              <EmptyState
                icon="📋"
                title={searchTerm || submissionCourseFilter || submissionYearFilter ? 'No submissions match your search' : 'No submissions yet'}
                description={searchTerm || submissionCourseFilter || submissionYearFilter ? 'Try adjusting your filters.' : 'Students who submit their inventory form will appear here.'}
                action={!searchTerm && !submissionCourseFilter ? { label: 'Add Student', onClick: handleCreate } : undefined}
              />
            )}

            {/* List View */}
            {submissionListView === 'list' && (
              <div className="overflow-x-auto">
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden min-w-[700px]">
                <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <div className="col-span-1"></div>
                  <div className="col-span-3">Student</div>
                  <div className="col-span-3">Course</div>
                  <div className="col-span-2">Contact</div>
                  <div className="col-span-1">Date</div>
                  <div className="col-span-2 text-center">Actions</div>
                </div>
                {paginatedSubmissions.map((submission) => {
                  const formData = submission.form_data || {};
                  return (
                    <div key={submission.id} className={`grid grid-cols-12 gap-3 px-4 py-3 items-center hover:bg-gray-50 transition ${selectedSubmissionIds.has(submission.id) ? 'bg-orange-50' : ''}`}>
                      <div className="col-span-1 flex items-center gap-2">
                        <input type="checkbox" checked={selectedSubmissionIds.has(submission.id)} onChange={() => toggleSelectSubmission(submission.id)} className="w-4 h-4 accent-orange-600 cursor-pointer" />
                        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-gray-100">
                          {submission.photo_url
                            ? <img src={submission.photo_url} alt={submission.full_name} className="w-full h-full object-cover" />
                            : <svg className="w-full h-full text-gray-400 p-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                          }
                        </div>
                      </div>
                      <div className="col-span-3 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm truncate">{formData.lastName || ''}, {formData.firstName || ''}</p>
                        <p className="text-xs text-gray-400">{submission.student_id}</p>
                        {submission.submission_status && submission.submission_status !== 'submitted' && (
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${submission.submission_status === 'approved' ? 'bg-green-100 text-green-700' : submission.submission_status === 'needs-revision' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                            {submission.submission_status === 'approved' ? '✅ Approved' : submission.submission_status === 'needs-revision' ? '✏️ Revision' : '🔍 Review'}
                          </span>
                        )}
                      </div>
                      <div className="col-span-3 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{submission.course}</p>
                        <p className="text-xs text-gray-400">Year {submission.year_level}</p>
                      </div>
                      <div className="col-span-2 text-xs text-gray-500 truncate">{submission.contact_number}</div>
                      <div className="col-span-1 text-xs text-gray-400">{new Date(submission.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                      <div className="col-span-2 flex items-center justify-center gap-1 flex-wrap">
                        <button onClick={() => handleView(submission)} className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition">View</button>
                        <button onClick={() => handleEdit(submission)} className="px-2 py-1 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 transition">Edit</button>
                        <button onClick={async () => { const full = await fetchFullSubmission(submission); printSubmission(full); }} className="px-2 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition">Print</button>
                        <button onClick={async () => { const full = await fetchFullSubmission(submission); exportSubmissionPDF(full); }} className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition">PDF</button>
                        <button onClick={() => handleDelete(submission.id, submission.full_name)} className="px-2 py-1 bg-red-700 text-white text-xs rounded hover:bg-red-800 transition">Del</button>
                        <button onClick={() => handleUpdateSubmissionStatus(submission.id, 'approved', '', submission.student_id, submission.user_id)} className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition">✅</button>
                        <button onClick={() => { const r = prompt('Revision notes:'); if (r !== null) handleUpdateSubmissionStatus(submission.id, 'needs-revision', r, submission.student_id, submission.user_id); }} className="px-2 py-1 bg-amber-500 text-white text-xs rounded hover:bg-amber-600 transition">✏️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              </div>
            )}
            {/* Empty state — submissions list */}
            {submissionListView === 'list' && paginatedSubmissions.length === 0 && (
              <EmptyState
                icon="📋"
                title={searchTerm ? 'No submissions match your search' : 'No submissions yet'}
                description={searchTerm ? 'Try a different search term.' : 'Students who submit their inventory form will appear here.'}
              />
            )}
            </>
          )}

          {/* Pagination */}
          {viewMode === 'submissions' && totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-2">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500">
                  Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredAndSortedSubmissions.length)} of {filteredAndSortedSubmissions.length} submissions
                </p>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1"
                >
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const page = totalPages <= 7 ? i + 1 : currentPage <= 4 ? i + 1 : currentPage >= totalPages - 3 ? totalPages - 6 + i : currentPage - 3 + i;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 text-sm rounded-lg border ${currentPage === page ? 'bg-orange-600 text-white border-orange-600' : 'border-gray-300 hover:bg-gray-50'}`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Students Pagination */}
          {viewMode === 'students' && totalStudentPages > 1 && (
            <div className="flex items-center justify-between mt-6 px-8 pb-4">
              <div className="flex items-center gap-3">
                <p className="text-sm text-gray-500">
                  Showing {(studentsPage - 1) * pageSize + 1}–{Math.min(studentsPage * pageSize, sortedStudents.length)} of {sortedStudents.length} students
                </p>
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setStudentsPage(1); }}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1"
                >
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStudentsPage(p => Math.max(1, p - 1))}
                  disabled={studentsPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(totalStudentPages, 7) }, (_, i) => {
                  const page = totalStudentPages <= 7 ? i + 1 : studentsPage <= 4 ? i + 1 : studentsPage >= totalStudentPages - 3 ? totalStudentPages - 6 + i : studentsPage - 3 + i;
                  return (
                    <button
                      key={page}
                      onClick={() => setStudentsPage(page)}
                      className={`px-3 py-1.5 text-sm rounded-lg border ${studentsPage === page ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 hover:bg-gray-50'}`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setStudentsPage(p => Math.min(totalStudentPages, p + 1))}
                  disabled={studentsPage === totalStudentPages}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Empty States */}
          {viewMode === 'students' && sortedStudents.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-lg font-medium">No registered students found</p>
              <p className="text-sm mt-1">Students will appear here after registration</p>
            </div>
          )}

          {viewMode === 'submissions' && filteredAndSortedSubmissions.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium">No inventory submissions found</p>
              <p className="text-sm mt-1">Submissions will appear here after students complete the form</p>
            </div>
          )}
        </div>
        )}

        {/* Modal for View/Create/Edit */}
        {showModal && (
          <StudentModal
            mode={modalMode}
            submission={selectedSubmission}
            onClose={() => setShowModal(false)}
            onSave={selectedSubmission?.email && !selectedSubmission?.course ? handleSaveStudent : handleSave}
          />
        )}

        {/* Password Reset Requests View */}
        {viewMode === 'reset-requests' && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Password Reset Requests</h3>
                <p className="text-sm text-gray-500 mt-1">Students who forgot their password — set a new password for them below.</p>
              </div>
              <button onClick={loadResetRequests} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition">Refresh</button>
            </div>
            {resetRequests.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <p>No password reset requests yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {resetRequests.map(req => (
                  <div key={req.id} className={`p-5 flex flex-col sm:flex-row sm:items-center gap-4 ${req.status === 'resolved' ? 'opacity-50' : ''}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800">{req.full_name || 'Unknown'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                          {req.status === 'pending' ? 'Pending' : 'Resolved'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">Student ID: <span className="font-medium text-gray-700">{req.student_id}</span></p>
                      {req.email && <p className="text-sm text-gray-500">Email: {req.email}</p>}
                      {req.reason && <p className="text-sm text-gray-500 mt-1">Reason: {req.reason}</p>}
                      <p className="text-xs text-gray-400 mt-1">{new Date(req.created_at).toLocaleString()}</p>
                    </div>
                    {req.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <input
                          type="password"
                          placeholder="New password (min 6)"
                          value={resetPasswordInputs[req.id] || ''}
                          onChange={e => setResetPasswordInputs(prev => ({ ...prev, [req.id]: e.target.value }))}
                          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-44 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                        <button
                          onClick={() => handleResolveResetRequest(req)}
                          disabled={actionLoading}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
                        >
                          Set Password
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Audit Log View */}
        {viewMode === 'audit-log' && (
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-gray-800">Audit Log</h3>
                <p className="text-sm text-gray-500 mt-1">Track all admin actions performed in the system.</p>
              </div>
              <button onClick={loadAuditLogs} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition">Refresh</button>
            </div>

            {/* Filters */}
            <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap gap-3">
              <div className="flex-1 min-w-48 relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by action, table, or details..."
                  value={auditSearchTerm}
                  onChange={e => setAuditSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
              <select
                value={auditActionFilter}
                onChange={e => setAuditActionFilter(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500"
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="export">Export</option>
                <option value="login">Login</option>
              </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {(() => {
                const filtered = auditLogs.filter(log => {
                  const matchSearch = !auditSearchTerm ||
                    (log.action || '').toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
                    (log.table_name || '').toLowerCase().includes(auditSearchTerm.toLowerCase()) ||
                    (log.details || '').toLowerCase().includes(auditSearchTerm.toLowerCase());
                  const matchAction = !auditActionFilter || (log.action || '').toLowerCase() === auditActionFilter;
                  return matchSearch && matchAction;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="p-12 text-center text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="font-medium">{auditSearchTerm || auditActionFilter ? 'No logs match your filters' : 'No audit logs yet'}</p>
                    </div>
                  );
                }

                const actionColor: Record<string, string> = {
                  create: 'bg-green-100 text-green-700',
                  update: 'bg-blue-100 text-blue-700',
                  delete: 'bg-red-100 text-red-700',
                  export: 'bg-purple-100 text-purple-700',
                  login:  'bg-gray-100 text-gray-700',
                };

                return (
                  <table className="w-full text-sm min-w-[600px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Table</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Details</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtered.map((log, i) => (
                        <tr key={log.id || i} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${actionColor[log.action?.toLowerCase()] || 'bg-gray-100 text-gray-600'}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600 font-mono text-xs">{log.table_name}</td>
                          <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={log.details}>{log.details}</td>
                          <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                            {new Date(log.performed_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </div>
        )}

        {/* User Management Modal */}
        {showUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="bg-gradient-to-r from-orange-600 to-red-600 px-6 py-4 rounded-t-2xl">
                <h2 className="text-2xl font-bold text-white">
                  {userModalMode === 'create' && '➕ Create New User'}
                  {userModalMode === 'edit' && '✏️ Edit User'}
                  {userModalMode === 'password' && '🔑 Change Password'}
                </h2>
              </div>

              <form onSubmit={handleSaveUser} className="p-6 space-y-4">
                {userModalMode !== 'password' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        name="full_name"
                        value={userFormData.full_name}
                        onChange={handleUserFormChange}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student ID *</label>
                      <input
                        type="text"
                        name="student_id"
                        value={userFormData.student_id}
                        onChange={handleUserFormChange}
                        className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Institutional Email * <span className="text-xs text-gray-500">(@nbsc.edu.ph)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          name="emailUsername"
                          value={userFormData.email.replace('@nbsc.edu.ph', '')}
                          onChange={(e) => {
                            const username = e.target.value.replace(/@/g, '');
                            setUserFormData({
                              ...userFormData,
                              email: username + '@nbsc.edu.ph'
                            });
                          }}
                          className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          placeholder="Enter Student ID"
                          required
                        />
                        <span className="text-gray-600 font-medium">@nbsc.edu.ph</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Example: 2021-12345@nbsc.edu.ph (Use Student ID as email)
                      </p>
                    </div>
                  </>
                )}

                {/* Password Section - Show for Create and Edit */}
                {userModalMode === 'create' && (
                  <>
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-bold text-gray-700 mb-3">Set Password</h3>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                          <input
                            type="password"
                            name="password"
                            value={userFormData.password}
                            onChange={handleUserFormChange}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="Minimum 6 characters"
                            required
                            minLength={6}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                          <input
                            type="password"
                            name="confirmPassword"
                            value={userFormData.confirmPassword}
                            onChange={handleUserFormChange}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="Re-enter password"
                            required
                            minLength={6}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {userModalMode === 'edit' && (
                  <>
                    <div className="border-t pt-4">
                      <h3 className="text-sm font-bold text-gray-700 mb-2">🔑 Reset Password (Optional)</h3>
                      <p className="text-xs text-gray-600 mb-3 bg-yellow-50 border border-yellow-200 rounded p-2">
                        ⚠️ Fill in these fields only if you want to reset the student's password. Leave blank to keep current password.
                      </p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                          <input
                            type="password"
                            name="password"
                            value={userFormData.password}
                            onChange={handleUserFormChange}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="Leave blank to keep current password"
                            minLength={6}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                          <input
                            type="password"
                            name="confirmPassword"
                            value={userFormData.confirmPassword}
                            onChange={handleUserFormChange}
                            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            placeholder="Re-enter new password"
                            minLength={6}
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowUserModal(false)}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-6 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 font-medium disabled:opacity-50"
                  >
                    {actionLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Loading Overlay */}
        {actionLoading && <LoadingOverlay text="Processing..." />}

        {/* Audit Log View */}
        {viewMode === 'audit-log' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">📋 Audit Log</h2>
                  <p className="text-sm text-gray-500">Track all admin actions — creates, updates, deletes, and exports</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg font-medium">
                    {auditLogs.filter(log => {
                      const s = auditSearchTerm.toLowerCase();
                      const matchSearch = !s || (log.action||'').toLowerCase().includes(s) || (log.entity||'').toLowerCase().includes(s) || (log.details||'').toLowerCase().includes(s);
                      const matchAction = !auditActionFilter || log.action === auditActionFilter;
                      return matchSearch && matchAction;
                    }).length} entries
                  </span>
                  <button
                    onClick={loadAuditLogs}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition text-sm font-medium"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-5 gap-3 mt-5">
                {[
                  { action: '', label: 'All', color: 'gray', count: auditLogs.length },
                  { action: 'create', label: 'Create', color: 'green', count: auditLogs.filter(l => l.action === 'create').length },
                  { action: 'update', label: 'Update', color: 'amber', count: auditLogs.filter(l => l.action === 'update').length },
                  { action: 'delete', label: 'Delete', color: 'red', count: auditLogs.filter(l => l.action === 'delete').length },
                  { action: 'export', label: 'Export', color: 'blue', count: auditLogs.filter(l => l.action === 'export').length },
                ].map(stat => (
                  <button
                    key={stat.action}
                    onClick={() => setAuditActionFilter(stat.action)}
                    className={`rounded-xl p-3 text-center border-2 transition-all ${
                      auditActionFilter === stat.action
                        ? stat.color === 'gray' ? 'border-gray-500 bg-gray-50' :
                          stat.color === 'green' ? 'border-green-500 bg-green-50' :
                          stat.color === 'amber' ? 'border-amber-500 bg-amber-50' :
                          stat.color === 'red' ? 'border-red-500 bg-red-50' :
                          'border-blue-500 bg-blue-50'
                        : 'border-gray-100 bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <div className={`text-2xl font-bold ${
                      stat.color === 'gray' ? 'text-gray-700' :
                      stat.color === 'green' ? 'text-green-700' :
                      stat.color === 'amber' ? 'text-amber-700' :
                      stat.color === 'red' ? 'text-red-700' :
                      'text-blue-700'
                    }`}>{stat.count}</div>
                    <div className="text-xs text-gray-500 font-medium mt-0.5">{stat.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Search + Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex gap-3 items-center">
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by action, entity, or details..."
                    value={auditSearchTerm}
                    onChange={e => setAuditSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                  />
                </div>
                {(auditSearchTerm || auditActionFilter) && (
                  <button
                    onClick={() => { setAuditSearchTerm(''); setAuditActionFilter(''); }}
                    className="px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {auditLogs.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No audit logs yet</p>
                  <p className="text-sm text-gray-400 mt-1">Actions like delete and export will appear here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-5 py-3.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Action</th>
                        <th className="px-5 py-3.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Entity</th>
                        <th className="px-5 py-3.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">Details</th>
                        <th className="px-5 py-3.5 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide whitespace-nowrap">Date & Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {auditLogs
                        .filter(log => {
                          const s = auditSearchTerm.toLowerCase();
                          const matchSearch = !s || (log.action||'').toLowerCase().includes(s) || (log.entity||'').toLowerCase().includes(s) || (log.details||'').toLowerCase().includes(s);
                          const matchAction = !auditActionFilter || log.action === auditActionFilter;
                          return matchSearch && matchAction;
                        })
                        .map((log, i) => (
                          <tr key={log.id || i} className="hover:bg-orange-50/30 transition-colors">
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                log.action === 'delete' ? 'bg-red-100 text-red-700' :
                                log.action === 'export' ? 'bg-blue-100 text-blue-700' :
                                log.action === 'create' ? 'bg-green-100 text-green-700' :
                                log.action === 'update' ? 'bg-amber-100 text-amber-700' :
                                log.action === 'view' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {log.action === 'delete' ? '🗑️' :
                                 log.action === 'export' ? '📤' :
                                 log.action === 'create' ? '✅' :
                                 log.action === 'update' ? '✏️' :
                                 log.action === 'view' ? '👁️' : '•'}
                                {(log.action || '').toUpperCase()}
                              </span>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="text-gray-700 font-medium">{log.entity}</span>
                              {log.entity_id && log.entity_id !== 'bulk' && (
                                <div className="text-xs text-gray-400 mt-0.5 font-mono">{log.entity_id.slice(0, 8)}…</div>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-gray-600 max-w-xs">{log.details}</td>
                            <td className="px-5 py-3.5 text-gray-400 whitespace-nowrap text-xs">
                              <div className="font-medium text-gray-600">{new Date(log.performed_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                              <div>{new Date(log.performed_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Admin Password Change Modal */}
        {showAdminPasswordModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-800">🔑 Change Admin Password</h3>
                <button onClick={() => setShowAdminPasswordModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    value={adminPasswordData.newPass}
                    onChange={e => setAdminPasswordData(p => ({ ...p, newPass: e.target.value }))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={adminPasswordData.confirm}
                    onChange={e => setAdminPasswordData(p => ({ ...p, confirm: e.target.value }))}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Re-enter new password"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAdminPasswordModal(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">Cancel</button>
                <button
                  onClick={handleAdminPasswordChange}
                  disabled={adminPasswordLoading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 font-medium disabled:opacity-50"
                >
                  {adminPasswordLoading ? 'Saving...' : 'Change Password'}
                </button>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </div>

    {/* Global Confirm Dialog */}
    <ConfirmDialog
      open={confirmDialog.open}
      title={confirmDialog.title}
      message={confirmDialog.message}
      confirmLabel="Delete"
      onConfirm={confirmDialog.onConfirm}
      onCancel={closeConfirm}
    />
    </>
  );
}

// Student Modal Component
function StudentModal({ mode, submission, onClose, onSave }: any) {
  const toast = useToastContext();
  const formData = submission?.form_data || {};
  const isStudentProfile = formData.email && !submission?.course; // Check if it's a student profile view
  
  const [editData, setEditData] = useState({
    full_name: submission?.full_name || '',
    student_id: submission?.student_id || '',
    email: submission?.email || '',
    lastName: formData.lastName || '',
    firstName: formData.firstName || '',
    middleInitial: formData.middleInitial || '',
    idNo: submission?.student_id || '',
    programYear: submission?.course || '',
    mobilePhone: submission?.contact_number || '',
    birthDate: formData.birthDate || '',
    gender: formData.gender || '',
    ethnicity: formData.ethnicity || '',
    religion: formData.religion || '',
    civilStatus: formData.civilStatus || '',
    permanentAddress: formData.permanentAddress || '',
    photoUrl: submission?.photo_url || '',
  });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>(submission?.photo_url || '');

  const handleChange = (e: any) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Photo size must be less than 5MB');
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    
    let finalPhotoUrl = editData.photoUrl;

    // Upload new photo if provided
    if (photoFile) {
      try {
        finalPhotoUrl = await uploadToCloudinary(photoFile, 'nbsc-gco/student-photos');
      } catch (error: any) {
        toast.error('Error uploading photo: ' + error.message);
        return;
      }
    }

    onSave({ ...editData, photoUrl: finalPhotoUrl });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">
            {mode === 'view' 
              ? (isStudentProfile ? 'View Student Profile' : 'View Student Details')
              : mode === 'create' 
              ? 'Add New Student' 
              : (isStudentProfile ? 'Edit Student Profile' : 'Edit Student')}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <div className="p-6">
          {mode === 'view' ? (
            <div className="space-y-6">
              {/* View Mode - Display Only */}
              {isStudentProfile ? (
                // Student Profile View
                <div className="flex gap-6">
                  <div className="w-48 h-48 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg overflow-hidden flex-shrink-0">
                    {submission?.photo_url ? (
                      <img src={submission.photo_url} alt="Student" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-24 h-24 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">Student ID</label>
                      <p className="text-lg font-semibold">{submission?.student_id}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">Full Name</label>
                      <p className="text-lg font-semibold">{submission?.full_name}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <p className="text-lg">{formData.email}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-gray-600">Registered</label>
                      <p className="text-lg">{new Date(formData.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              ) : (
                // Inventory Submission View — FULL DATA
                <div className="space-y-6">
                  {/* Header: Photo + Basic */}
                  <div className="flex flex-col sm:flex-row gap-6 p-5 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-100">
                    <div className="w-36 h-36 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0 border-2 border-white shadow-md mx-auto sm:mx-0">
                      {submission?.photo_url
                        ? <img src={submission.photo_url} alt="Student" className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-gray-400 text-4xl">👤</div>
                      }
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <p className="text-xs text-gray-500">Full Name</p>
                        <p className="text-xl font-bold text-gray-800">{formData.lastName}, {formData.firstName} {formData.middleInitial}</p>
                      </div>
                      <div><p className="text-xs text-gray-500">Student ID</p><p className="font-semibold">{formData.idNo || submission?.student_id}</p></div>
                      <div><p className="text-xs text-gray-500">Program & Year</p><p className="font-semibold">{formData.programYear || submission?.course}</p></div>
                      <div><p className="text-xs text-gray-500">Gender</p><p className="font-semibold">{formData.gender || 'N/A'}</p></div>
                      <div><p className="text-xs text-gray-500">Civil Status</p><p className="font-semibold">{formData.civilStatus || 'N/A'}</p></div>
                      <div><p className="text-xs text-gray-500">Mobile</p><p className="font-semibold">{formData.mobilePhone || submission?.contact_number}</p></div>
                      <div><p className="text-xs text-gray-500">Birth Date</p><p className="font-semibold">{formData.birthDate || 'N/A'}</p></div>
                    </div>
                  </div>

                  {/* Section helper */}
                  {(() => {
                    const Sec = ({ title }: { title: string }) => (
                      <h3 className="text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-red-600 px-3 py-1.5 rounded-lg uppercase tracking-wide col-span-full">{title}</h3>
                    );
                    const F = ({ label, value }: { label: string; value?: string | null }) => {
                      if (!value) return null;
                      return (
                        <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                          <p className="text-sm font-semibold text-gray-800 break-words">{value}</p>
                        </div>
                      );
                    };
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        <Sec title="Contact Information" />
                        <F label="Personal Email" value={formData.personalEmail} />
                        <F label="Institutional Email" value={formData.institutionalEmail} />
                        <F label="Permanent Address" value={formData.permanentAddress} />
                        {!formData.currentAddressSame && <F label="Current Address" value={formData.currentAddress} />}
                        <F label="Religion" value={formData.religion} />
                        <F label="Ethnicity" value={formData.ethnicity} />

                        <Sec title="Family Background" />
                        <F label="Parents Status" value={formData.parentsStatus} />
                        <F label="No. of Siblings" value={formData.numberOfSiblings} />
                        <F label="Birth Order" value={formData.birthOrder} />
                        <F label="Mother's Name" value={formData.motherName} />
                        <F label="Mother's Age" value={formData.motherAge} />
                        <F label="Mother's Occupation" value={formData.motherOccupation} />
                        <F label="Mother's Income" value={formData.motherIncome} />
                        <F label="Mother's Contact" value={formData.motherContact} />
                        <F label="Father's Name" value={formData.fatherName} />
                        <F label="Father's Age" value={formData.fatherAge} />
                        <F label="Father's Occupation" value={formData.fatherOccupation} />
                        <F label="Father's Income" value={formData.fatherIncome} />
                        <F label="Father's Contact" value={formData.fatherContact} />
                        {formData.guardianName && <F label="Guardian's Name" value={formData.guardianName} />}
                        {formData.guardianName && <F label="Guardian's Occupation" value={formData.guardianOccupation} />}
                        {formData.guardianName && <F label="Guardian's Contact" value={formData.guardianContact} />}
                        {formData.guardianName && <F label="Guardian's Address" value={formData.guardianAddress} />}

                        <Sec title="Educational Background" />
                        <F label="Elementary School" value={formData.elementarySchool} />
                        <F label="Elementary Years" value={formData.elementaryYears} />
                        <F label="Elementary Awards" value={formData.elementaryAwards} />
                        <F label="Junior High School" value={formData.juniorHighSchool} />
                        <F label="Junior High Years" value={formData.juniorHighYears} />
                        <F label="Junior High Awards" value={formData.juniorHighAwards} />
                        <F label="Senior High School" value={formData.seniorHighSchool} />
                        <F label="Senior High Years" value={formData.seniorHighYears} />
                        <F label="Senior High Awards" value={formData.seniorHighAwards} />

                        <Sec title="Interests & Activities" />
                        <F label="Hobbies" value={formData.hobbies} />
                        <F label="Talents" value={formData.talents} />
                        <F label="Sports" value={formData.sports} />
                        <F label="Socio-Civic" value={formData.socioCivic} />
                        <F label="School Organizations" value={formData.schoolOrg} />

                        <Sec title="Health History" />
                        <F label="Hospitalized" value={formData.hospitalized} />
                        {formData.hospitalized === 'Yes' && <F label="Hospitalization Reason" value={formData.hospitalizationReason} />}
                        <F label="Surgery" value={formData.surgery} />
                        {formData.surgery === 'Yes' && <F label="Surgery Reason" value={formData.surgeryReason} />}
                        <F label="Chronic Illness" value={formData.chronicIllness} />
                        <F label="Family Illness" value={formData.familyIllness} />
                        <F label="Last Doctor Visit" value={formData.lastDoctorVisit} />

                        {formData.lifeCircumstances?.length > 0 && <>
                          <Sec title="Life Circumstances" />
                          <div className="col-span-full flex flex-wrap gap-2">
                            {formData.lifeCircumstances.map((item: string) => (
                              <span key={item} className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">{item}</span>
                            ))}
                            {formData.lifeCircumstancesOthers && <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">{formData.lifeCircumstancesOthers}</span>}
                          </div>
                        </>}

                        {formData.counselorRemarks && <>
                          <Sec title="Counselor Remarks" />
                          <div className="col-span-full bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">{formData.counselorRemarks}</div>
                        </>}

                        {/* WHODAS Score */}
                        {formData.whodas && Object.keys(formData.whodas).length > 0 && <>
                          <Sec title="WHODAS 2.0 Score" />
                          <div className="col-span-full bg-teal-50 border border-teal-200 rounded-lg p-3">
                            <p className="text-sm font-bold text-teal-700">
                              Total: {Object.values(formData.whodas as Record<string, number>).reduce((a, b) => a + b, 0)} / {Object.keys(formData.whodas).length * 4}
                              <span className="text-xs font-normal text-teal-500 ml-2">({Object.keys(formData.whodas).length}/36 items answered)</span>
                            </p>
                          </div>
                        </>}

                        {/* PID-5 Score */}
                        {formData.pid5 && Object.keys(formData.pid5).length > 0 && <>
                          <Sec title="PID-5-BF Score" />
                          <div className="col-span-full bg-violet-50 border border-violet-200 rounded-lg p-3">
                            <p className="text-sm font-bold text-violet-700">
                              Total: {Object.values(formData.pid5 as Record<string, number>).reduce((a, b) => a + b, 0)} / 75
                              <span className="text-xs font-normal text-violet-500 ml-2">({Object.keys(formData.pid5).length}/25 items answered)</span>
                            </p>
                          </div>
                        </>}
                      </div>
                    );
                  })()}

                  <div className="text-xs text-gray-400 pt-2 border-t">
                    Submitted: {new Date(submission?.created_at).toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' })}
                    {submission?.updated_at && submission.updated_at !== submission.created_at &&
                      ` · Updated: ${new Date(submission.updated_at).toLocaleString('en-PH', { dateStyle: 'long', timeStyle: 'short' })}`}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button onClick={onClose} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                  Close
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={(e) => {
              e.preventDefault();
              // Prevent accidental form submission
            }} onKeyDown={(e) => {
              // Prevent form submission on Enter key
              if (e.key === 'Enter') {
                e.preventDefault();
              }
            }} className="space-y-4">
              {/* Create/Edit Mode - Form Fields */}
              
              {/* Photo Upload Section */}
              {mode === 'edit' && (
                <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 bg-blue-50">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Update Profile Photo (Optional)
                  </label>
                  <div className="flex items-center gap-6">
                    <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-lg">
                      {photoPreview ? (
                        <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                      />
                      <p className="text-xs text-gray-500 mt-2">
                        JPG, PNG or WEBP (MAX. 5MB). Leave empty to keep current photo.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {isStudentProfile ? (
                // Student Profile Edit Form
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      name="full_name"
                      value={editData.full_name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student ID *</label>
                      <input
                        type="text"
                        name="student_id"
                        value={editData.student_id}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={editData.email}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                      />
                    </div>
                  </div>
                </>
              ) : (
                // Inventory Submission Edit Form
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                      <input
                        type="text"
                        name="lastName"
                        value={editData.lastName}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                      <input
                        type="text"
                        name="firstName"
                        value={editData.firstName}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">M.I.</label>
                      <input
                        type="text"
                        name="middleInitial"
                        value={editData.middleInitial}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg"
                        maxLength={1}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Student ID *</label>
                      <input
                        type="text"
                        name="idNo"
                        value={editData.idNo}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Program & Year *</label>
                      <input
                        type="text"
                        name="programYear"
                        value={editData.programYear}
                        onChange={handleChange}
                        placeholder="e.g., BSIT - First year"
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number *</label>
                      <input
                        type="tel"
                        name="mobilePhone"
                        value={editData.mobilePhone}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Birth Date</label>
                      <input
                        type="date"
                        name="birthDate"
                        value={editData.birthDate}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                      <select
                        name="gender"
                        value={editData.gender}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg"
                      >
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ethnicity</label>
                      <select
                        name="ethnicity"
                        value={editData.ethnicity}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg"
                      >
                        <option value="">Select</option>
                        <option value="Tagalog">Tagalog</option>
                        <option value="Cebuano">Cebuano</option>
                        <option value="Ilocano">Ilocano</option>
                        <option value="Bicolano">Bicolano</option>
                        <option value="Waray">Waray</option>
                        <option value="Hiligaynon">Hiligaynon</option>
                        <option value="Kapampangan">Kapampangan</option>
                        <option value="Pangasinense">Pangasinense</option>
                        <option value="Indigenous People">Indigenous People</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Religion</label>
                      <select
                        name="religion"
                        value={editData.religion}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg"
                      >
                        <option value="">Select</option>
                        <option value="Roman Catholic">Roman Catholic</option>
                        <option value="Islam">Islam</option>
                        <option value="Iglesia ni Cristo">Iglesia ni Cristo</option>
                        <option value="Born Again Christian">Born Again Christian</option>
                        <option value="Seventh-day Adventist">Seventh-day Adventist</option>
                        <option value="Jehovah's Witness">Jehovah's Witness</option>
                        <option value="Buddhism">Buddhism</option>
                        <option value="Others">Others</option>
                        <option value="None">None</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Civil Status</label>
                      <select
                        name="civilStatus"
                        value={editData.civilStatus}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border rounded-lg"
                      >
                        <option value="">Select</option>
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Separated">Separated</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <textarea
                      name="permanentAddress"
                      value={editData.permanentAddress}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border rounded-lg"
                      rows={2}
                    />
                  </div>

                  {mode === 'create' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL (optional)</label>
                      <input
                        type="url"
                        name="photoUrl"
                        value={editData.photoUrl}
                        onChange={handleChange}
                        placeholder="https://example.com/photo.jpg"
                        className="w-full px-4 py-2 border rounded-lg"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {mode === 'create' ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
