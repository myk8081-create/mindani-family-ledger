import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig =
  typeof supabaseUrl === 'string' &&
  typeof supabaseAnonKey === 'string' &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 20;

export const supabase = hasSupabaseConfig ? createClient(supabaseUrl, supabaseAnonKey) : null;
