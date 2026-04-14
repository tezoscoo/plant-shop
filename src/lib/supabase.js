import { createClient } from "@supabase/supabase-js";

// These are public, anon-key values intended to ship in the client bundle.
// Row Level Security (see supabase/schema.sql) is what actually protects data.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loudly in dev; production builds inline the values at build time.
  console.error(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
    "Copy .env.example to .env.local and fill in your project values."
  );
}

export const supabase = createClient(url || "", anonKey || "", {
  auth: { persistSession: true, autoRefreshToken: true },
});
