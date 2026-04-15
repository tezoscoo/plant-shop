import { createClient } from "@supabase/supabase-js";

// These are public, anon-key values intended to ship in the client bundle.
// Row Level Security (see supabase/schema.sql) is what actually protects data.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If env vars are missing (e.g. the deploy host hasn't had them added yet),
// we export a stub client whose every method resolves to a friendly error.
// This lets the app render a clean "Unable to load inventory" screen instead
// of crashing at module load with an opaque URL-parse exception.
const MISSING_MSG =
  "Supabase is not configured. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY " +
  "must be set in the build environment.";

function makeStub() {
  const err = { message: MISSING_MSG };
  const thenable = Promise.resolve({ data: null, error: err });
  const builder = new Proxy(function () {}, {
    get: () => builder,
    apply: () => thenable,
  });
  return {
    from: () => builder,
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: err }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: () => Promise.resolve({ data: null, error: err }),
      signOut: () => Promise.resolve({ error: null }),
    },
  };
}

export const supabase = url && anonKey
  ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } })
  : (console.error("[supabase]", MISSING_MSG), makeStub());
