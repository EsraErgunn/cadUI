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

/**
 * Baca gaz TAŞIMAZ — `type` burada `InstallationLine.pipeTypeName`den (DN-20 gibi
 * çap kataloğu) tamamen ayrı, serbest metin bir alan (bkz. installationModel.ts).
 */
export type ChimneyLineProperties = {
  type: string
  startHeightCm: number
  endHeightCm: number
}

export type BranchLineProperties = {
  elevationCm: number
}

/**
 * "Alt kanal" ve "Cebri" tesisat_eleman.md'de yalnız iki not olarak geçiyor,
 * birbirini dışlayan bir seçim değil — kullanıcı onayıyla (2026-08) BAĞIMSIZ
 * iki onay kutusu, ikisi birlikte de işaretlenebilir.
 */
export type VentilationDuctLineProperties = {
  isSubDuct: boolean
  isForced: boolean
}
