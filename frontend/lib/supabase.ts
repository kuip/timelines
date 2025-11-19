import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// These values are safe to expose in the frontend
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://alslzntgnfqqbptgbpsf.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON_KEY) {
  console.warn('SUPABASE_ANON_KEY is not set. Please add NEXT_PUBLIC_SUPABASE_ANON_KEY to your .env.local file.');
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'X-Client-Info': 'timeline-frontend',
    },
  },
});
