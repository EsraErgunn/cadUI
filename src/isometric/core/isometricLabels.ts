import { getIsometricLine3dLengthCm } from './isometricElevation'
import type { IsometricElevationContext } from './isometricElevation'
import { projectIsometric } from './isometricProjection'
import type { IsometricAngles } from './isometricProjection'
import type { PlanPoint, ThreePosition } from '../../core/coords'
import { formatLengthMeters } from '../../core/lengthFormat'
import { INSTALLATION_ELEMENT_TYPE_LABELS } from '../../plumbing/core/elementLabels'
import {
  APPLIANCE_TYPE_LABELS,
  OTHER_APPLIANCE_KIND_LABELS,
} from '../../plumbing/core/elementProperties'
import type {
  InstallationElement,
  InstallationLine,
} from '../../plumbing/core/installationModel'
import { isGasCarryingKind } from '../../plumbing/core/lineKinds'

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
 * Hat etiketi: `(3)` / `4,74 m` / `DN25`. WebCAD'in izometrik hat etiketiyle
 * aynı düzen, tek farkı ikinci satırdaki debi (`6.9m³/h`) — hidrolik hesap
 * bizde YOK, o satır hiç yazılmıyor (bkz. izometrik-adimlari.md).
 *
 * `order` hattın çizimdeki sırası; kimlik değil okuma kolaylığı için — id'ler
 * proje bazlı artan tamsayı olduğu için kullanıcıya anlamsız büyük sayılar
 * gösterirdi.
 */
export function getIsometricLineLabelLines(
  line: InstallationLine,
  order: number,
  context: IsometricElevationContext,
): string[] {
  const labelLines: string[] = [`(${order})`]

  const lengthCm = getIsometricLine3dLengthCm(line, context)
  if (lengthCm > 0) labelLines.push(formatLengthMeters(lengthCm))

  // Çap yalnız gaz taşıyan hatta anlamlı: deşarj hattında alan yazılır ama
  // okunmaz (bkz. lineKinds.ts).
  if (isGasCarryingKind(line.kind)) labelLines.push(line.pipeTypeName)

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
 * Eleman etiketi. Sayaç ve yakıcı cihaz künyeli, geri kalan yalnız adıyla
 * yazılır — vana/dirsek gibi armatürlerin künyesi izometriği okunmaz yapardı.
 */
export function getIsometricElementLabelLines(element: InstallationElement): string[] {
  if (element.type === 'gasMeter') return getGasMeterLabelLines(element)

  const applianceSource = getApplianceLabelSource(element)
  if (applianceSource) return getApplianceLabelLines(element, applianceSource)

  return [INSTALLATION_ELEMENT_TYPE_LABELS[element.type]]
}

/**
 * Varsayılan etiket uzaklığının çizim boyutuna oranı ve alt sınırı. SABİT bir
 * cm değeri OLAMAZ: 10 metrelik bir dairede 45 cm etiketi borunun üstüne
 * bindiriyor, 40 metrelik bir binada ise hiç fark edilmiyordu.
 */
const LABEL_DISTANCE_RATIO = 0.50
const LABEL_MIN_DISTANCE_CM = 240

/**
 * Hat etiketi elemanınkinden DAHA YAKIN durur: bir cihaz ile ona giden kısa kol
 * neredeyse aynı ışınsal yönde olduğu için ikisi eşit uzaklıkta olsaydı
 * künyeler üst üste binerdi.
 */
export const LINE_LABEL_DISTANCE_FACTOR = 0.85
export const ELEMENT_LABEL_DISTANCE_FACTOR = 2

/** Merkezle çakışan çapada yön tanımsız; yukarı kaçmak en az zararlısı. */
const FALLBACK_DIRECTION: PlanPoint = { x: 0, y: 1 }

/**
 * Etiketin varsayılan kayması (izdüşüm düzleminde, cm): çapadan çizimin
 * MERKEZİNDEN DIŞARI doğru. Sabit bir yön kullanılsaydı bütün etiketler aynı
 * tarafa kaçar, birbirinin ve gövdenin üstüne binerdi; ışınsal yerleşimde her
 * etiket çizimin dışına açılır ve kılavuz çizgisi izlenebilir kalır.
 *
 * Kullanıcı etiketi elle taşırsa (`isometricLabelOffsetCm`) bu hiç çağrılmaz.
 */
export function getIsometricLabelOffsetCm(
  anchor: ThreePosition,
  center: ThreePosition,
  angles: IsometricAngles,
  sceneExtentCm: number,
  distanceFactor: number,
): PlanPoint {
  const anchorScreen = projectIsometric(anchor, angles)
  const centerScreen = projectIsometric(center, angles)

  const dx = anchorScreen.x - centerScreen.x
  const dy = anchorScreen.y - centerScreen.y
  const magnitude = Math.hypot(dx, dy)
  const direction =
    magnitude === 0 ? FALLBACK_DIRECTION : { x: dx / magnitude, y: dy / magnitude }

  const distanceCm =
    Math.max(LABEL_MIN_DISTANCE_CM, sceneExtentCm * LABEL_DISTANCE_RATIO) * distanceFactor

  return { x: direction.x * distanceCm, y: direction.y * distanceCm }
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
