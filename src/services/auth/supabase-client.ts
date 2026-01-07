import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '@/config';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Get or create Supabase client singleton
 * Uses app config for URL and anon key
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        // Disable auto-refresh - we handle this manually for offline support
        autoRefreshToken: false,
        // Disable persistent session - we use SecureStore instead
        persistSession: false,
        // Detect session in URL (for OAuth flows, not used here)
        detectSessionInUrl: false,
      },
    });
  }
  return supabaseInstance;
}

/**
 * Reset client (for testing purposes)
 */
export function resetSupabaseClient(): void {
  supabaseInstance = null;
}
