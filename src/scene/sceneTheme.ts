/**
 * Çizim alanının renkleri. Tailwind burada kullanılamaz (WebGL), bu yüzden hex.
 * Marka sarısı #FFC107 buraya GİRMEZ — tuvalde sarı = gaz hattı.
 * Seçim rengi mavi ve başka katmanda kullanılmaz.
 */
export const SCENE_COLORS = {
  background: '#ffffff',
  gridMinor: '#eaeef4',
  gridMajor: '#cbd3e0',
  selection: '#2d7ff9',
  /** Duvarın TEK rengi — kontur yok, düz dolgu (K23). */
  wallFill: '#6b7280',
  /** Henüz store'a yazılmamış zincir. */
  preview: '#8a94a3',
  /** İmleç bir hedefe yapıştığında görünen işaret. Sarı değil: tuvalde sarı = gaz hattı. */
  snapMarker: '#0aa06e',
} as const
