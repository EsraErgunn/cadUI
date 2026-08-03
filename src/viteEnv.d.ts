/// <reference types="vite/client" />

// vite/client'ın ImportMetaEnv'i indeks imzalı: bildirilmeyen her anahtar `any`
// döner ve CLAUDE.md `any` yasağı sessizce delinir. Kullandığımız değişkenler
// burada tek tek yazılır — .env.example ile aynı liste.
interface ImportMetaEnv {
  /** API kökü, sonunda eğik çizgi YOK. Örn. http://localhost:5193 */
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
