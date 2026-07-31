/**
 * Tesisat katmanının renkleri. Seçim rengi buraya kopyalanmaz —
 * src/scene/sceneTheme.ts → SCENE_COLORS.selection kullanılır.
 */
export const PLUMBING_COLORS = {
  /** Soluk mimari referans — seçilemez, salt görsel bağlam. */
  architectureGhost: '#c4cad4',
  // Tuvalde sarı = gaz hattı: marka sarısının çizim alanındaki TEK meşru kullanımı.
  gasLine: '#FFC107',
  /** Sembol yüklenemediğinde çizilen yer tutucu — seçim mavisiyle karışmayan uyarı rengi. */
  assetError: '#dc2626',
} as const
