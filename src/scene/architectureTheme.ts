/**
 * Mimari katmanın renkleri. Seçim rengi buraya kopyalanmaz —
 * sceneTheme.ts → SCENE_COLORS.selection kullanılır.
 */
export const ARCHITECTURE_COLORS = {
  wall: '#3e4a5a',
  /** Deliği "boşluk" gibi göstermek için opak dolgu: altındaki duvarı kapatır. */
  openingFill: '#ffffff',
  opening: '#5a6675',
  previewValid: '#4a5a6d',
  /** Reddedilen yerleştirme. Marka sarısı DEĞİL — tuvalde sarı = gaz hattı. */
  previewInvalid: '#d64545',
  /** Nokta sembolünün çizgi rengi; duvardan koyu, plandan ayırt edilsin. */
  pointSymbol: '#2f3a49',
  /**
   * Alt kat gölgesi (KK-13). Duvar renginden belirgin biçimde soluk: hizalama
   * referansı okunabilmeli ama aktif katın duvarıyla karıştırılmamalı.
   */
  floorBelowGhost: '#d3d8e0',
} as const
