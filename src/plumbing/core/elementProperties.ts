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

/**
 * "Tüketim noktası" tesisat_eleman.md'de iki kez geçiyor — kullanıcı onayıyla
 * (2026-08) bunlar İKİ ayrı alan: sayacın zaten bağlı olduğu (giriş) hat ve
 * yeni kurulacak (çıkış) hat için birer serbest metin notu.
 */
export type GasMeterProperties = {
  classLabel: string
  inletConsumptionPoint: string
  outletConsumptionPoint: string
  isIndoor: boolean
  isAccessible247: boolean
  hasCorrector: boolean
}

/**
 * tesisat_eleman.md'de "Kit" kelimesinden sonra net okunamayan bir kelime var
 * ("konik" gibi görünüyor). Kullanıcı onayıyla (2026-08) bu kelime GÖRMEZDEN
 * GELİNDİ — `kit` TEK serbest metin alanı, ayrı bir "kit tipi" alanı YOK.
 */
export type FilterKitProperties = {
  kit: string
  brand: string
  model: string
  description: string
}

/**
 * Regülatörün refakatçi vanaları da bu tipi taşır (ELEMENT_COMPANIONS,
 * attachModes.ts) — ayrı bir elementType/properties tipi YOK, aynı form.
 */
export type ValveProperties = {
  type: string
  description: string
}

/** Sınıf için örnek dokümanda "G4" gibi geçiyor ama sabit seçenek listesi YOK, serbest metin. */
export type StrainerMeterProperties = {
  classLabel: string
  description: string
}

export type SolenoidValveProperties = {
  type: string
  brand: string
  model: string
}

/** capacity/power birimi dokümanda yok — serbest metin, sayısal alan ZORLANMAZ. */
export type StoveProperties = {
  brand: string
  model: string
  description: string
  capacity: string
  power: string
}

/**
 * Soba ilk kullanan adım — Kombi/Şofben/(Kazan) kendi enumunu YENİDEN
 * TANIMLAMAZ, bunu import eder.
 */
export type ApplianceType = 'hermetic' | 'flued'

export const APPLIANCE_TYPE_LABELS: Record<ApplianceType, string> = {
  hermetic: 'Hermetik',
  flued: 'Bacalı',
}

/**
 * "Güç" alanının yanında daire içine alınmış bir "X" işareti var, anlamı
 * belirsiz (tesisat_eleman.md). Kullanıcı onayıyla (2026-08) GÖRMEZDEN
 * GELİNDİ — `power` diğerleri gibi normal, koşulsuz bir serbest metin alanı.
 */
export type SpaceHeaterProperties = {
  applianceType: ApplianceType
  brand: string
  model: string
  description: string
  capacity: string
  power: string
}

export type CombiBoilerProperties = {
  applianceType: ApplianceType
  brand: string
  model: string
  description: string
  capacity: string
  power: string
}
