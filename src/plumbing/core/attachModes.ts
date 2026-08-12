import type { InstallationElementType, SymbolId } from './symbolMetadata'

/**
 * Elemanın çizime nasıl tutunduğu.
 *
 * - `onLine`      : boruya oturur, boru orada AYRILIR (armatür = düğüm, K-W3).
 *                   Boru üstünde değilken önizleme ÇIKMAZ, tıklama da bir şey koymaz.
 * - `lineEnd`     : boş (bağlantısız) bir boru ucuna eklenir; araya vana girer.
 * - `nearestLine` : imlecin bıraktığı yerde durur, en yakın boruya kısa bir kolla
 *                   bağlanır; kolun boruya değdiği düğüme vana oturur.
 * - `free`        : herhangi bir yere bırakılır (servis kutusu).
 *
 * Baca ve havalandırma kanalı bu tabloda YOK: onlar eleman değil, yakıcı cihazın
 * deşarj portundan çizilen birer GÜZERGÂH (`InstallationLineKind`).
 */
export type ElementAttachMode = 'onLine' | 'lineEnd' | 'nearestLine' | 'free'

export const ELEMENT_ATTACH_MODES: Record<InstallationElementType, ElementAttachMode> = {
  serviceBox: 'free',

  regulator: 'onLine',
  strainerMeter: 'onLine',
  manometer: 'onLine',
  filterKit: 'onLine',
  valve: 'onLine',
  solenoidValve: 'onLine',
  insulation: 'onLine',

  gasMeter: 'lineEnd',

  // Yakıcı cihazların tamamı aynı davranışta: tek gaz girişi, vana cihazda değil
  // BORUDA (K15 / doküman § 15 "Ortak Davranış").
  stove: 'nearestLine',
  spaceHeater: 'nearestLine',
  waterHeater: 'nearestLine',
  combiBoiler: 'nearestLine',
  boiler: 'nearestLine',
  otherAppliance: 'nearestLine',
}

export function getElementAttachMode(type: InstallationElementType): ElementAttachMode {
  return ELEMENT_ATTACH_MODES[type]
}

/**
 * Bu türlerin portu görsel bir yuvarlakla işaretlenmez. Vana/selenoid vana/filtre
 * kiti/süzme sayaç akış geçişli `onLine` elemanlardır: portları boruyu AYIRAN
 * gerçek bir düğüm, WebCAD'deki "buraya bağlan" anlamında serbest bir hedef
 * değil. `isPortOccupied` bu elemanların portları için hiçbir zaman `true`
 * dönmez (armatür bağlantı kaydı değil `inlineElementId`'dir, K-W3) — işaret
 * gösterilseydi hep "boş" (mavi) görünüp yanlış bir sinyal verirdi.
 */
const NO_PORT_MARKER_TYPES: ReadonlySet<SymbolId> = new Set([
  'valve',
  'solenoidValve',
  'filterKit',
  'strainerMeter',
])

export function hasPortMarkers(id: SymbolId): boolean {
  return !NO_PORT_MARKER_TYPES.has(id)
}

/** Bir elemana yapışan otomatik vana. Tür tek yerde yazılır — üç mod da bunu kullanır. */
export const ATTACHED_VALVE_TYPE: InstallationElementType = 'valve'

/**
 * Ana elemanla BİRLİKTE aynı boruya oturan eleman. `offsetCm` ana elemanın
 * merkezinden boru yönündeki kayma: negatif = giriş (gaz gelen) tarafı.
 */
export type InlineSpec = {
  type: InstallationElementType
  offsetCm: number
}

/**
 * Regülatör tek başına konmaz: giriş ve çıkış tarafına birer kesme vanası VE birer
 * manometre gelir — manometreler vana ile regülatör arasında, regülatöre YAKIN
 * durur (SVG artık sadece gövdeyi çiziyor, vana/manometre gerçek ayrı elemanlar).
 * Ofsetler semboller ÜST ÜSTE BİNMEYECEK şekilde seçildi (regülatör 24, vana 32,
 * manometre 22 cm genişliğinde — ikisi de eskiden gerçek çizimden İKİ KAT geniş
 * `bounds` taşıyordu, SVG'ler sıkılaştırılınca burası da güncellendi; manometre-
 * regülatör payı vana payından dar).
 */
const REGULATOR_HALF_CM = 12
const VALVE_HALF_CM = 16
const MANOMETER_HALF_CM = 11
/** Payları elementAttach.ts'teki genel ATTACH_CLEARANCE_CM'den (10) bilerek DAR
 * tutuldu: regülatör grubu tek bir bileşenmiş gibi sıkı durmalı. */
const REGULATOR_MANOMETER_CLEARANCE_CM = 3
const VALVE_MANOMETER_CLEARANCE_CM = 6

const REGULATOR_INLET_MANOMETER_OFFSET_CM =
  -(REGULATOR_HALF_CM + REGULATOR_MANOMETER_CLEARANCE_CM + MANOMETER_HALF_CM)
const REGULATOR_OUTLET_MANOMETER_OFFSET_CM = -REGULATOR_INLET_MANOMETER_OFFSET_CM
const REGULATOR_INLET_VALVE_OFFSET_CM =
  REGULATOR_INLET_MANOMETER_OFFSET_CM -
  (MANOMETER_HALF_CM + VALVE_MANOMETER_CLEARANCE_CM + VALVE_HALF_CM)
const REGULATOR_OUTLET_VALVE_OFFSET_CM = -REGULATOR_INLET_VALVE_OFFSET_CM

const ELEMENT_COMPANIONS: Partial<Record<InstallationElementType, readonly InlineSpec[]>> = {
  regulator: [
    { type: ATTACHED_VALVE_TYPE, offsetCm: REGULATOR_INLET_VALVE_OFFSET_CM },
    { type: 'manometer', offsetCm: REGULATOR_INLET_MANOMETER_OFFSET_CM },
    { type: 'manometer', offsetCm: REGULATOR_OUTLET_MANOMETER_OFFSET_CM },
    { type: ATTACHED_VALVE_TYPE, offsetCm: REGULATOR_OUTLET_VALVE_OFFSET_CM },
  ],
}

/**
 * Ana eleman + refakatçileri, boru yönünde ARTAN ofset sırasında. Sıra burada
 * sabitlenir: hem önizleme hem de boruyu ayırma bu diziyi kullanır, ikisi farklı
 * sırada gezseydi önizlemedeki sembol başka bir düğüme yerleşirdi.
 */
export function getInlineSpecs(type: InstallationElementType): readonly InlineSpec[] {
  const companions = ELEMENT_COMPANIONS[type] ?? []
  return [{ type, offsetCm: 0 }, ...companions].sort((a, b) => a.offsetCm - b.offsetCm)
}

/**
 * Yerleştirme önizlemesinde çizilecek semboller — araç seçilince SABİTTİR ve
 * çözülen yerleşim dizisiyle birebir aynı sıradadır (önizleme grupları mount
 * edildikten sonra yalnız konumları güncellenir).
 */
export function getPlacementPreviewTypes(
  type: InstallationElementType,
): readonly InstallationElementType[] {
  const mode = getElementAttachMode(type)
  if (mode === 'onLine') return getInlineSpecs(type).map((spec) => spec.type)
  if (mode === 'free') return [type]
  // lineEnd ve nearestLine: ana eleman + boruya oturan vanası.
  return [type, ATTACHED_VALVE_TYPE]
}
