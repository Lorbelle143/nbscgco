import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false, // reduces unnecessary URL checks
    storage: window.localStorage,
    flowType: 'implicit', // simpler flow, fewer round trips
  },
  global: {
    headers: {
      'x-client-info': 'nbsc-gco', // identify requests
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 2, // throttle realtime events
    },
  },
});

// Admin client — only created when service role key is present and different from anon key.
// NOTE: This key is used for admin-only operations (create/delete users, bypass RLS).
// Since RLS is disabled on this project, the risk is lower, but you should still
// restrict access to this key and never share it publicly.
// For production with RLS enabled, move these operations to a Supabase Edge Function.
export const supabaseAdmin = supabaseServiceRoleKey && supabaseServiceRoleKey !== supabaseAnonKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${supabaseServiceRoleKey}` } },
    })
  : null;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          student_id: string;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          student_id: string;
          is_admin?: boolean;
        };
      };
      inventory_submissions: {
        Row: {
          id: string;
          user_id: string;
          student_id: string;
          full_name: string;
          course: string;
          year_level: string;
          contact_number: string;
          photo_url: string;
          google_form_response_id: string;
          created_at: string;
        };
      };
    };
  };
};

// ─── Fallback-aware query wrapper ────────────────────────────────
// Usage: instead of supabase.from('profiles').select(...)
// use: withFallback(() => supabase.from('profiles').select(...), () => neonDb.getProfiles())

import { markSupabaseUnhealthy, markSupabaseHealthy, isNeonConfigured, neonDb } from './neon';

export { neonDb };

export async function withFallback<T>(
  supabaseQuery: () => Promise<{ data: T | null; error: any }>,
  neonFallback: () => Promise<T>
): Promise<T> {
  try {
    const { data, error } = await supabaseQuery();
    if (error) {
      // Check if it's a disk IO / resource exhaustion error
      const msg = error.message?.toLowerCase() || '';
      const isExhausted =
        msg.includes('disk') ||
        msg.includes('io') ||
        msg.includes('resource') ||
        msg.includes('throttl') ||
        msg.includes('timeout') ||
        msg.includes('unavailable') ||
        error.code === '53100' || // disk_full
        error.code === '53200' || // out_of_memory
        error.code === '53300';   // too_many_connections

      if (isExhausted && isNeonConfigured()) {
        markSupabaseUnhealthy();
        console.warn('🔄 Supabase exhausted — falling back to Neon:', error.message);
        return await neonFallback();
      }
      throw error;
    }
    markSupabaseHealthy();
    return data as T;
  } catch (err: any) {
    // Network error or timeout — try Neon
    if (isNeonConfigured()) {
      markSupabaseUnhealthy();
      console.warn('🔄 Supabase unreachable — falling back to Neon:', err.message);
      return await neonFallback();
    }
    throw err;
  }
}
