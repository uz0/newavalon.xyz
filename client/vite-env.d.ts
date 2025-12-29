/// <reference types="vite/client" />

// Vite provides ImportMetaEnv and ImportMeta interfaces via vite/client
// Add custom VITE_ env vars below by extending ImportMetaEnv interface
interface ImportMetaEnv {
  readonly VITE_CUSTOM_VAR?: string
}
