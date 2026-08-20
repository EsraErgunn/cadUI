import { getIsometricLine3dLengthCm } from './isometricElevation'
import type { IsometricElevationContext } from './isometricElevation'
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
