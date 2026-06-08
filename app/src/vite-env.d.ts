/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** dev-only mock login password (.env.development, gitignored) — gates the
   *  LoginScreen mock sign-in; never a real secret */
  readonly VITE_DEV_PASSWORD?: string
  /** Supabase project URL — `https://<ref>.supabase.co`. Absent until a real
   *  project is wired; when missing the app stays on the dev-mock auth path. */
  readonly VITE_SUPABASE_URL?: string
  /** Supabase anon/publishable key. Safe to ship in the client bundle (RLS is
   *  the security boundary). Absent until a real project is wired. */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
