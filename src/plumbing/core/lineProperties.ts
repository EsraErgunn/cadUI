/**
 * Hat türü başına özellik paneli alanları. Her tür KENDİ opsiyonel tipini
 * alır (`InstallationLine.pipe`, `.chimney`, ...) — elementProperties.ts ile
 * aynı desen, bkz. tesisat-panel-adimlari.md.
 */
export type PipeLineProperties = {
  startHeightCm: number
  endHeightCm: number
  description: string
}
