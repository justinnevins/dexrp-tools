import { createClient, AuthChangeEvent, Session, User } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing environment variables. Authentication features will be disabled.');
}

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storage: localStorage,
        storageKey: 'dexrp-auth-token',
      },
    })
  : null;

export const isSupabaseConfigured = (): boolean => {
  return supabaseUrl !== undefined && 
         supabaseAnonKey !== undefined && 
         supabaseUrl !== '' && 
         supabaseAnonKey !== '';
};

export type { AuthChangeEvent, Session, User };
