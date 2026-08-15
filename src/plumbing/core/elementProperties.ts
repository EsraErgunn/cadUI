/**
 * Eleman türü başına özellik paneli alanları. Her tür KENDİ opsiyonel tipini
 * alır (`InstallationElement.regulator`, `.gasMeter`, ...) — tek dev bir
 * "properties" torbası değil: her adım yalnız kendi tipini ekler, çakışma
 * riski yok (bkz. tesisat-panel-adimlari.md).
 */
export type RegulatorProperties = {
  brand: string
  model: string
  /** Birim dokümanda yok (tesisat_eleman.md) — serbest metin, birim dayatılmaz. */
  pressure: string
  description: string
}

/**
 * `groundingType` yalnız `isGrounded` true iken panelde GÖSTERİLİR (koşullu
 * render, bkz. InsulationProperties.tsx) — ama modelde her zaman tutulur,
 * kapatılıp açılınca önceki değer kaybolmasın diye.
 */
export type InsulationProperties = {
  isGrounded: boolean
  groundingType: string
  description: string
}
