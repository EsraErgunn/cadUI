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
  wallFill: '#6b7280',
  wallOutline: '#1f2329',
} as const
