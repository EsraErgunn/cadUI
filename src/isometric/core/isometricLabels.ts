import {
  getIsometricLine3dLengthCm,
  getIsometricLineElevationsCm,
} from './isometricElevation'
import type { IsometricElevationContext } from './isometricElevation'
import type { IsometricLineGeometry } from './isometricModel'
import type { ThreePosition } from '../../core/coords'
import { formatLengthMeters } from '../../core/lengthFormat'
import type { Id } from '../../core/model'
import { INSTALLATION_ELEMENT_TYPE_LABELS } from '../../plumbing/core/elementLabels'
import {
  APPLIANCE_TYPE_LABELS,
  OTHER_APPLIANCE_KIND_LABELS,
} from '../../plumbing/core/elementProperties'
import {
  getTargetElementId,
  type InstallationConnection,
  type InstallationElement,
  type InstallationLine,
} from '../../plumbing/core/installationModel'
import { isGasCarryingKind } from '../../plumbing/core/lineKinds'
import { formatPipeOuterDiameter } from '../../plumbing/core/pipeTypes'
import { isBurnerAppliance } from '../../plumbing/core/symbolMetadata'

const NUMBER_FORMATTER = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })

/** Boş/`undefined` alan SATIR ÜRETMEZ — "0 m³/h" yazmak bilgi değil gürültü. */
function pushIfPresent(lines: string[], value: string | undefined | null): void {
  const trimmed = value?.trim()
  if (trimmed) lines.push(trimmed)
}

function formatFlow(flowCubicMeterPerHour: number | undefined): string | undefined {
  if (flowCubicMeterPerHour === undefined) return undefined
  return `${NUMBER_FORMATTER.format(flowCubicMeterPerHour)} m³/h`
}

/**
 * Hat etiketi: `(3)` / `4,74 m` / `DN25` / `Ø33,7 mm`. WebCAD'in izometrik hat
 * etiketiyle aynı düzen, tek farkı ikinci satırdaki debi (`6.9m³/h`) —
 * hidrolik hesap bizde YOK, o satır hiç yazılmıyor (bkz. izometrik-adimlari.md).
 *
 * Dış çap ANMA ÇAPININ altına yazılır: "DN25" bir anma değeri, borunun gerçek
 * dış çapı 33,7 mm — malzeme seçerken okunan sayı bu ve künyeden başka yerde
 * yazmıyor.
 *
 * `order` hattın çizimdeki sırası; kimlik değil okuma kolaylığı için — id'ler
 * proje bazlı artan tamsayı olduğu için kullanıcıya anlamsız büyük sayılar
 * gösterirdi.
 *
 * `order === null` → numara YAZILMAZ. Numaralandırma paftadaki tüketim
 * hatlarına ait bir sıra; ekranda tıklanarak geçici olarak okunan bir ara
 * boruya numara vermek o sırayı bozardı (bkz. IsometricLabels).
 */
export function getIsometricLineLabelLines(
  line: InstallationLine,
  order: number | null,
  context: IsometricElevationContext,
): string[] {
  const labelLines: string[] = order === null ? [] : [`(${order})`]

  const lengthCm = getIsometricLine3dLengthCm(line, context)
  if (lengthCm > 0) labelLines.push(formatLengthMeters(lengthCm))

  // Çap yalnız gaz taşıyan hatta anlamlı: deşarj hattında alan yazılır ama
  // okunmaz (bkz. lineKinds.ts).
  if (isGasCarryingKind(line.kind)) {
    labelLines.push(line.pipeTypeName)
    labelLines.push(formatPipeOuterDiameter(line.pipeTypeName))
  }

  return labelLines
}

function getGasMeterLabelLines(element: InstallationElement): string[] {
  const properties = element.gasMeter
  const typeLabel = INSTALLATION_ELEMENT_TYPE_LABELS.gasMeter
  if (!properties) return [typeLabel]

  const labelLines: string[] = []
  labelLines.push(
    properties.unitNumber?.trim() ? `${typeLabel} Daire ${properties.unitNumber.trim()}` : typeLabel,
  )
  pushIfPresent(labelLines, properties.classLabel)
  if (properties.areaSquareMeters !== undefined) {
    labelLines.push(`Birim Alanı (m²): ${NUMBER_FORMATTER.format(properties.areaSquareMeters)}`)
  }
  pushIfPresent(labelLines, formatFlow(properties.flowCubicMeterPerHour))
  return labelLines
}

/**
 * Yakıcı cihazların özellik alanları tür başına AYRI tipte ama alan adları
 * aynı; etiket için ortak yüzeyi burada topluyoruz. `efficiency` (verim) alanı
 * modelimizde YOK — referans çizimdeki "Verim: %90" satırı bu yüzden yazılamaz.
 */
type ApplianceLabelSource = {
  applianceTypeLabel?: string
  /** Türün adı; `otherAppliance` bunu kendi alt türüyle (Ocak/Fırın) EZER. */
  nameLabel?: string
  brand?: string
  model?: string
  capacity?: string
  power?: string
  flowCubicMeterPerHour?: number
}

function getApplianceLabelSource(element: InstallationElement): ApplianceLabelSource | null {
  if (element.stove) {
    return { ...element.stove }
  }
  if (element.otherAppliance) {
    const { classLabel, type, ...rest } = element.otherAppliance
    // "Hermetik Fırın" yeter; üstüne genel "Diğer Yakıcı Cihaz" adı eklenirse
    // etiket kendini tekrar eder.
    return {
      ...rest,
      applianceTypeLabel: APPLIANCE_TYPE_LABELS[classLabel],
      nameLabel: OTHER_APPLIANCE_KIND_LABELS[type],
    }
  }

  const typed =
    element.spaceHeater ?? element.combiBoiler ?? element.waterHeater ?? element.boiler
  if (!typed) return null

  const { applianceType, ...rest } = typed
  return { ...rest, applianceTypeLabel: APPLIANCE_TYPE_LABELS[applianceType] }
}

function getApplianceLabelLines(
  element: InstallationElement,
  source: ApplianceLabelSource,
): string[] {
  const typeLabel = source.nameLabel ?? INSTALLATION_ELEMENT_TYPE_LABELS[element.type]
  const labelLines: string[] = [
    source.applianceTypeLabel ? `${source.applianceTypeLabel} ${typeLabel}`.trim() : typeLabel,
  ]

  pushIfPresent(labelLines, [source.brand, source.model].filter(Boolean).join(' '))
  // Kapasite ve güç SERBEST METİN: birimi kullanıcı yazıyor, biz eklemiyoruz
  // (bkz. elementProperties.ts — dokümanda birim yok, dayatılmadı).
  pushIfPresent(labelLines, [source.capacity, source.power].filter(Boolean).join(' · '))
  pushIfPresent(labelLines, formatFlow(source.flowCubicMeterPerHour))

  return labelLines
}

/**
 * Bu elemanın KÜNYESİ var mı? Yalnız sayaç ve yakıcı cihazlar taşır.
 *
 * Geri kalan sekiz tür (vana, solenoid vana, filtre, manometre, regülatör,
 * süzme sayaç, servis kutusu, izolasyon) etiket olarak yalnız KENDİ ADINI
 * yazıyordu — sembolün zaten söylediği şey. Kâğıtta her biri bir satır artı bir
 * kılavuz çizgisi üretiyor ve çok katlı binada onlarca "Vana" yazısına
 * dönüşüyordu (K156, kullanıcı bildirimi); referans paftada bu etiketlerin
 * hiçbiri yok.
 *
 * ⚠️ Künyesi olmayan yakıcı cihaz yine etiketlenir, yalnız türünün adıyla
 * ("Ocak"): hangi cihaz olduğu paftanın KONUSU, armatürün adı değil.
 *
 * ⚠️ Şu an yalnız KÂĞIT bu kurala uyuyor; ekran hepsini yazmaya devam ediyor
 * (orada etiket seçilebilir/sürüklenebilir ve gezinmeye yarıyor).
 */
export function hasIsometricElementLabel(element: InstallationElement): boolean {
  return (
    element.type === 'gasMeter' ||
    // SERVİS KUTUSU istisna (K157): gazın binaya girdiği tek nokta, referans
    // paftada künyesi var ve armatürlerle aynı kefeye konamaz.
    //
    // ⚠️ Etiketi tek satır ("Servis Kutusu") kalıyor. Referanstaki "S200 /
    // 21 mbar / Yandan Çıkış" satırlarının modelde KARŞILIĞI YOK — servis
    // kutusunun hiç özellik alanı yok (`elementLabel.ts` boş döner). Alanlar
    // eklenene kadar bu satırlar uydurulmaz.
    element.type === 'serviceBox' ||
    isBurnerAppliance(element.type)
  )
}

/**
 * Eleman etiketi. Sayaç ve yakıcı cihaz künyeli, geri kalan yalnız adıyla
 * yazılır — vana/dirsek gibi armatürlerin künyesi izometriği okunmaz yapardı.
 *
 * ⚠️ "Yazılır mı" kararı BURADA DEĞİL, `hasIsometricElementLabel`de: metin
 * üretimi ile görünürlük kuralı ayrı, çünkü ekran ile kâğıt aynı metni
 * kullanıp farklı süzüyor.
 */
export function getIsometricElementLabelLines(element: InstallationElement): string[] {
  if (element.type === 'gasMeter') return getGasMeterLabelLines(element)

  const applianceSource = getApplianceLabelSource(element)
  if (applianceSource) return getApplianceLabelLines(element, applianceSource)

  return [INSTALLATION_ELEMENT_TYPE_LABELS[element.type]]
}

/**
 * Hat etiketinin çapası: ORTA segmentin ortası. İlk segment (WebCAD'in seçimi)
 * L biçimli borularda etiketi hattın ucuna atıyordu; iki uç noktanın ortası ise
 * borunun dışına düşebiliyor. Orta segment her zaman gövdenin üstünde.
 */
export function getIsometricLineLabelAnchor(
  positions: readonly ThreePosition[],
): ThreePosition | null {
  if (positions.length < 2) return null

  const segmentIndex = Math.floor((positions.length - 1) / 2)
  const from = positions[segmentIndex]
  const to = positions[segmentIndex + 1]
  return [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2, (from[2] + to[2]) / 2]
}

/**
 * Yükseklik etiketinin ÖNEKİ. Referans gaz paftasında düşey parçalar `h=`
 * ile yazılıyor; birimi metre olduğu için sayı `formatLengthMeters`ten gelir.
 */
const RISE_LABEL_PREFIX = 'h='

/**
 * Yuvarlanınca "0,00 m" yazacak fark etiket ÜRETMEZ: kot serbest sayı, kalan
 * milimetrik artık bilgi değil gürültü olurdu.
 */
const MIN_RISE_CM = 0.5

export type IsometricRiseLabel = {
  key: string
  lineId: Id
  /** Düşey parçanın ortası — hat etiketiyle AYNI çapa. */
  anchor: ThreePosition
  text: string
}

/**
 * Kot DEĞİŞTİREN hattın yükseklik etiketi: `h=2,00 m` (kullanıcı isteği,
 * 2026-08 — "izometride yükseklik olan yerlere h yüksekliğini belirt").
 *
 * Koşul plan görünümündekiyle AYNI (K129): hattın İLK ve SON kotu farklıysa
 * yazılır. Segment segment yazılmaz, çünkü kot hat boyunca PLAN uzunluğuna
 * göre dağıtılıyor (`getLinePointElevationsCm`) — eğimli bir hattın her
 * parçası farkın bir kesrini taşır ve her birine ayrı sayı yazmak tek bir
 * yükselişi rakam bulutuna çevirirdi.
 *
 * İŞARET YOK: h bir mesafe, kot değil (`formatSignedMeters` bu yüzden
 * kullanılmıyor). Yukarı mı aşağı mı gidildiği izometrik çizimin kendisinden
 * okunuyor — plan görünümünde okunmadığı için orada ▲/▼ var (K133).
 *
 * Katlar arası bağlantı (`FloorPipeLink`) etiketlenmez: o döşemeyi delen
 * teknik bir ek, kullanıcının verdiği bir yükseklik değil — verdiği kot zaten
 * iki yandaki hatta yazılı.
 */
export function getIsometricRiseLabel(
  line: InstallationLine,
  geometry: IsometricLineGeometry,
  context: IsometricElevationContext,
): IsometricRiseLabel | null {
  const elevationsCm = getIsometricLineElevationsCm(line, context)
  const firstCm = elevationsCm[0]
  const lastCm = elevationsCm.at(-1)
  if (firstCm === undefined || lastCm === undefined) return null

  const riseCm = Math.abs(lastCm - firstCm)
  if (riseCm < MIN_RISE_CM) return null

  const anchor = getIsometricLineLabelAnchor(geometry.positions)
  if (!anchor) return null

  return {
    key: `rise-${line.id}`,
    lineId: line.id,
    anchor,
    text: `${RISE_LABEL_PREFIX}${formatLengthMeters(riseCm)}`,
  }
}

/**
 * Bu hat bir TÜKETİM noktasına mı varıyor? Yalnız yakıcı cihaza (ocak, kombi,
 * soba, şofben, kazan, diğer) bağlanan hatlar etiketlenir.
 *
 * Neden ara hatlar etiketlenmiyor (kullanıcı kararı): bir binada gövde borusu
 * onlarca parçaya bölünüyor ve her parçaya boy/çap yazılınca çizim rakam
 * bulutuna dönüyor. Okunması gereken bilgi tüketim noktasında: hangi cihaza
 * hangi çapla, ne kadar boruyla gidilmiş.
 *
 * Deşarj hatları (baca, havalandırma) da dışarıda kalır — onlar gaz taşımıyor.
 */
export function isConsumptionLine(
  line: InstallationLine,
  elements: readonly InstallationElement[],
  connections: readonly InstallationConnection[],
): boolean {
  for (const connection of connections) {
    if (connection.lineId !== line.id) continue

    const elementId = getTargetElementId(connection.target)
    if (elementId === null) continue

    const element = elements.find((candidate) => candidate.id === elementId)
    if (element && isBurnerAppliance(element.type)) return true
  }
  return false
}
