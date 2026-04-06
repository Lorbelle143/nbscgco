import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: window.localStorage,
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
