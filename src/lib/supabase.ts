import { createClient } from '@supabase/supabase-js';

// Prefer build-time Vite envs, but allow runtime fallbacks (useful for advanced deploys)
const _envUrl = import.meta.env.VITE_SUPABASE_URL ?? (typeof window !== 'undefined' ? (window as any).__SUPABASE_URL : undefined);
const _envKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? (typeof window !== 'undefined' ? (window as any).__SUPABASE_ANON_KEY : undefined);

// Normalize values and strip trailing slashes from URL
const supabaseUrlRaw = typeof _envUrl === 'string' ? _envUrl.trim() : String(_envUrl || '');
const supabaseAnonKeyRaw = typeof _envKey === 'string' ? _envKey.trim() : String(_envKey || '');
const supabaseUrl = supabaseUrlRaw.replace(/\/+$/g, '');
const supabaseAnonKey = supabaseAnonKeyRaw;

// Basic validation to avoid creating a client with placeholder/invalid values that trigger 400s
function looksLikeValidUrl(url: string) {
  return /^https?:\/\/.+/.test(url) && !url.includes('your-supabase');
}

function looksLikeAnonKey(key: string) {
  if (!key) return false;
  // anon keys are typically long (JWT-like) strings — use a conservative length check
  return key.length > 30 && !key.includes('your-supabase');
}

const isSupabaseConfigured = Boolean(
  looksLikeValidUrl(supabaseUrl) && looksLikeAnonKey(supabaseAnonKey)
);
export const supabaseConfigured = isSupabaseConfigured;

// Provide a safe no-op Supabase mock when env is missing so UI can still render and tests can run
function createSupabaseMock() {
  const makeErrorResponse = () => ({ 
    data: null, 
    error: { message: 'Supabase not configured', code: 'MOCK_ERROR' } 
  });
  const makeResponse = (extra: any = {}) => ({ data: [], error: null, ...extra });

  const chainAfterSelect = {
    in: () => chainAfterSelect,
    eq: () => chainAfterSelect,
    order: () => Promise.resolve(makeErrorResponse()),
    limit: () => Promise.resolve(makeErrorResponse()),
  } as any;

  const queryStub = () => ({
    select: (_cols?: any, options?: any) => {
      if (options?.head) return Promise.resolve({ count: 0, error: null });
      return chainAfterSelect;
    },
    order: () => Promise.resolve(makeErrorResponse()),
    eq: () => chainAfterSelect,
    in: () => chainAfterSelect,
    insert: () => Promise.resolve(makeResponse(null)),
    upsert: () => Promise.resolve(makeResponse(null)),
    delete: () => Promise.resolve(makeResponse(null)),
    limit: () => Promise.resolve(makeErrorResponse()),
  });

  const storage = {
    from: () => ({
      upload: async () => ({ data: { path: '' }, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
      remove: async () => ({ data: null, error: null })
    })
  } as any;

  const authListeners: Array<(event: string, session: null) => void> = [];
  const auth = {
    signInWithOAuth: async () => ({ data: null, error: { message: 'Supabase not configured', code: 'MOCK_AUTH' } }),
    signInWithPassword: async () => ({ data: null, error: { message: 'Supabase not configured', code: 'MOCK_AUTH' } }),
    signOut: async () => ({ error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    onAuthStateChange: (callback: (event: string, session: null) => void) => {
      authListeners.push(callback);
      return { data: { subscription: { unsubscribe: () => { const i = authListeners.indexOf(callback); if (i > -1) authListeners.splice(i, 1); } } } };
    },
  } as any;

  // Count queries: .select('*', { count: 'exact', head: true })
  return {
    from: (_table: string) => queryStub(),
    rpc: async () => ({ data: null, error: null }),
    storage,
    auth,
  } as any;
}

// Suppress verbose console logs
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Suppress Supabase connection warnings
  console.error = function(...args: any[]) {
    if (args[0]?.toString?.().includes('Could not establish connection') || 
        args[0]?.toString?.().includes('Receiving end does not exist')) {
      return; // Suppress noisy Supabase errors
    }
    originalError.apply(console, args);
  };
  
  console.warn = function(...args: any[]) {
    if (args[0]?.toString?.().includes('Supabase not configured')) {
      return; // Suppress Supabase not configured warning
    }
    originalWarn.apply(console, args);
  };
}

// How long (ms) before a Supabase HTTP request is aborted.
// Free-tier projects cold-start in 10-15s — keep above that so the first
// query after a sleep succeeds rather than hitting the user_metadata fallback.
const SUPABASE_FETCH_TIMEOUT_MS = 20000;

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      global: {
        fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
          const controller = new AbortController();
          const timeoutId = setTimeout(
            () => controller.abort(),
            SUPABASE_FETCH_TIMEOUT_MS,
          );

          try {
            const res: Response = await fetch(input, {
              ...init,
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
              let bodyText = '';
              try {
                const ct = res.headers.get('content-type') || '';
                bodyText = ct.includes('application/json')
                  ? JSON.stringify(await res.clone().json())
                  : await res.clone().text();
              } catch (_) { /* ignore body-read errors */ }
              console.error('Supabase fetch error', {
                url: String(input),
                status: res.status,
                statusText: res.statusText,
                body: bodyText,
              });
            }
            return res;
          } catch (error: any) {
            clearTimeout(timeoutId);
            if (error?.name === 'AbortError') {
              // Surface a clear error so sign-in/queries fail fast instead of hanging
              throw new Error(
                'Supabase request timed out. Your project may be paused — visit the Supabase dashboard to resume it, then try again.',
              );
            }
            if (error?.message?.includes('Could not establish connection')) {
              return new Response(JSON.stringify({ error: 'offline' }), { status: 0 });
            }
            console.error('Supabase fetch exception', error);
            throw error;
          }
        },
      },
    })
  : (() => {
      if (isSupabaseConfigured === false) {
        console.info('ℹ️ Supabase not fully configured. Using offline mode.');
      }
      return createSupabaseMock();
    })();