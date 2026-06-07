/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** dev-only mock login password (.env.development, gitignored) — gates the
   *  LoginScreen mock sign-in; never a real secret */
  readonly VITE_DEV_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
