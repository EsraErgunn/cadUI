import type { PointSymbolType } from '../core/model'

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
  /** Sembol konturunun varsayılan rengi; tip rengi verilmediğinde kullanılır. */
  pointSymbol: '#2f3a49',
  /**
   * Alt kat gölgesi (KK-13). Duvar renginden belirgin biçimde soluk: hizalama
   * referansı okunabilmeli ama aktif katın duvarıyla karıştırılmamalı.
   */
  floorBelowGhost: '#d3d8e0',
} as const

/**
 * Cihaz türüne göre renk. Referans uygulama planda her cihazı ayrı renkte
 * çiziyor — pano turkuaz, alarm mor. Bu ikisi WebCAD'de gözlenerek alındı
 * (ekrandan okunduğu için yaklaşık).
 *
 * ⚠️ Kalan beşi TEYİDE AÇIK: gözlenmedi, yalnızca birbirinden ve duvardan
 * ayırt edilebilir olacak şekilde seçildi. Referansta karşılıkları görülünce
 * bu tablo güncellenir — başka hiçbir yer değişmez.
 */
export const SYMBOL_COLORS: Record<PointSymbolType, string> = {
  panel: '#7fd4cd',
  alarmDevice: '#8b7fd4',
  mainCutoffSwitch: '#d49b7f',
  earthquakeSensor: '#7f9bd4',
  fireExtinguisher: '#d47f8b',
  vent: '#a8b3c4',
  lighting: '#d4c67f',
}
