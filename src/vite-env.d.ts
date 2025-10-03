/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_PUBLIC_SUPABASE_URL: string
  readonly VITE_PUBLIC_SUPABASE_ANON_KEY: string
  readonly VITE_ENABLE_ANONYMOUS_MODE?: string
}
