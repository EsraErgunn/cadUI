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
