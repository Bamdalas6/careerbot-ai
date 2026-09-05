import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function isPlaceholderOrInvalidUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return true;
  const trimmed = url.trim();
  if (!trimmed || !/^https?:\/\//i.test(trimmed)) return true;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (
      host.includes('your-project') ||
      host.includes('your_project') ||
      host.includes('placeholder') ||
      host.includes('example.com') ||
      host.includes('xyzcompany') ||
      host.includes('change-me') ||
      host.includes('changeme')
    ) {
      return true;
    }
  } catch {
    return true;
  }
  return false;
}

export function isPlaceholderOrInvalidKey(key?: string | null): boolean {
  if (!key || typeof key !== 'string') return true;
  const trimmed = key.trim();
  if (!trimmed || trimmed.length < 15) return true;
  const lower = trimmed.toLowerCase();
  if (
    lower.includes('your_supabase') ||
    lower.includes('your-supabase') ||
    lower.includes('your_anon_key') ||
    lower.includes('your-anon-key') ||
    lower.includes('your_service_role') ||
    lower.includes('your-service-role') ||
    lower.includes('your_secret_key') ||
    lower.includes('your_api_key') ||
    lower.includes('your-api-key') ||
    lower.includes('placeholder') ||
    lower.includes('dummy') ||
    lower.includes('example') ||
    lower.includes('change_me') ||
    lower.includes('changeme') ||
    lower.includes('replace_me') ||
    lower.startsWith('your_') ||
    lower.startsWith('your-') ||
    lower.startsWith('<') ||
    lower.endsWith('>')
  ) {
    return true;
  }
  return false;
}

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const rawSupabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SECRET_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

function initSupabaseServerClient(): { isConfigured: boolean; client: SupabaseClient | null } {
  const urlTrimmed = rawSupabaseUrl.trim();
  const keyTrimmed = rawSupabaseKey.trim();

  if (!urlTrimmed || !keyTrimmed) {
    return { isConfigured: false, client: null };
  }

  if (isPlaceholderOrInvalidUrl(urlTrimmed)) {
    console.warn(
      '[Supabase Config] Diagnostic: NEXT_PUBLIC_SUPABASE_URL appears to be a placeholder or invalid format. Supabase is disabled; falling back to local database and stateless sessions.'
    );
    return { isConfigured: false, client: null };
  }

  if (isPlaceholderOrInvalidKey(keyTrimmed)) {
    console.warn(
      '[Supabase Config] Diagnostic: Supabase API key appears to be a placeholder or invalid format. Supabase is disabled; falling back to local database and stateless sessions.'
    );
    return { isConfigured: false, client: null };
  }

  try {
    const client = createClient(urlTrimmed, keyTrimmed, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return { isConfigured: true, client };
  } catch (err: unknown) {
    console.warn('[Supabase Config] Diagnostic: Failed to initialize Supabase client:', err);
    return { isConfigured: false, client: null };
  }
}

const serverConfig = initSupabaseServerClient();
export const isSupabaseConfigured = serverConfig.isConfigured;

// Server-side administrative client (uses service role key if available)
export const supabase = serverConfig.client;

// Client-side browser client (uses public anon key with persistent sessions for recovery & OTP)
let browserClientInstance: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    return supabase;
  }
  if (!browserClientInstance) {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const anonKey = (
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      ''
    ).trim();

    if (url && anonKey && !isPlaceholderOrInvalidUrl(url) && !isPlaceholderOrInvalidKey(anonKey)) {
      try {
        browserClientInstance = createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
      } catch (err: unknown) {
        console.warn('[Supabase Browser Client] Initialization error:', err);
      }
    }
  }
  return browserClientInstance || supabase;
}
