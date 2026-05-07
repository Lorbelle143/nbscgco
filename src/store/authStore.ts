import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export type UserRole = 'student' | 'staff' | 'admin';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  role: UserRole;
  loading: boolean;
  sessionChecked: boolean;
  setUser: (user: User | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
  setRole: (role: UserRole) => void;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
  initializeAuth: () => Promise<void>;
}

let authListenerSubscription: { unsubscribe: () => void } | null = null;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAdmin: false,
      role: 'student' as UserRole,
      loading: true,
      sessionChecked: false,

      setUser: (user) => set({ user }),
      setIsAdmin: (isAdmin) => set({ isAdmin }),
      setRole: (role) => set({ role }),

      signOut: async () => {
        await supabase.auth.signOut();
        authListenerSubscription?.unsubscribe();
        authListenerSubscription = null;
        set({ user: null, isAdmin: false, loading: false, sessionChecked: true });
      },

      checkAuth: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('is_admin, role')
              .eq('id', user.id)
              .single();
            const role: UserRole = profile?.role || (profile?.is_admin ? 'admin' : 'student');
            set({ user, isAdmin: profile?.is_admin || false, role, loading: false, sessionChecked: true });
          } else {
            set({ user: null, isAdmin: false, role: 'student', loading: false, sessionChecked: true });
          }
        } catch {
          set({ user: null, isAdmin: false, role: 'student', loading: false, sessionChecked: true });
        }
      },

      initializeAuth: async () => {
        const currentState = get();

        // If we already have a persisted user, unblock the UI immediately
        // then re-validate in the background
        if (currentState.user) {
          set({ loading: false, sessionChecked: true });
          // Background re-validation
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
              set({ user: null, isAdmin: false });
            }
          });
          registerAuthListener(set);
          return;
        }

        // No persisted user — do a real session check
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error || !session?.user) {
            set({ user: null, isAdmin: false, role: 'student', loading: false, sessionChecked: true });
          } else {
            const { data: profile } = await supabase
              .from('profiles')
              .select('is_admin, role')
              .eq('id', session.user.id)
              .single();
            const role: UserRole = profile?.role || (profile?.is_admin ? 'admin' : 'student');
            set({
              user: session.user,
              isAdmin: profile?.is_admin || false,
              role,
              loading: false,
              sessionChecked: true,
            });
          }
        } catch {
          set({ user: null, isAdmin: false, role: 'student', loading: false, sessionChecked: true });
        }

        registerAuthListener(set);
      },
    }),
    {
      name: 'auth-storage',
      // Persist enough to unblock UI on refresh instantly
      partialize: (state) => ({
        isAdmin: state.isAdmin,
        role: state.role,
        sessionChecked: state.sessionChecked,
        user: state.user,
      }),
    }
  )
);

function registerAuthListener(set: (partial: Partial<AuthState>) => void) {
  if (authListenerSubscription) return;

  const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, role, pending_password')
        .eq('id', session.user.id)
        .single();

      const isAdmin = profile?.is_admin || false;
      const role: UserRole = profile?.role || (isAdmin ? 'admin' : 'student');
      set({ user: session.user, isAdmin, role, loading: false, sessionChecked: true });

      if (profile?.pending_password) {
        try {
          await supabase.auth.updateUser({ password: profile.pending_password });
          await supabase.from('profiles').update({ pending_password: null }).eq('id', session.user.id);
        } catch (e) {
          console.error('Failed to apply pending password:', e);
        }
      }
    } else if (event === 'SIGNED_OUT') {
      set({ user: null, isAdmin: false, role: 'student', loading: false, sessionChecked: true });
    } else if (event === 'TOKEN_REFRESHED' && session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, role')
        .eq('id', session.user.id)
        .single();
      const role: UserRole = profile?.role || (profile?.is_admin ? 'admin' : 'student');
      set({ user: session.user, isAdmin: profile?.is_admin || false, role });
    } else if (event === 'USER_UPDATED' && session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin, role')
        .eq('id', session.user.id)
        .single();
      const role: UserRole = profile?.role || (profile?.is_admin ? 'admin' : 'student');
      set({ user: session.user, isAdmin: profile?.is_admin || false, role });
    }
  });
  authListenerSubscription = data.subscription;
}
