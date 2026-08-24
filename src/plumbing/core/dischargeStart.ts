import {
  canAttachDischarge,
  getAttachedDischargeKinds,
  getOutletMarginLocal,
  resolveOutletOnBox,
  toApplianceOutlet,
} from './dischargeOutlet'
import { pickElementAt, type SymbolMetadataLookup } from './elementPicking'
import type {
  ApplianceOutlet,
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from './installationModel'
import type { DischargeLineKind } from './lineKinds'
import { getPortWorldDirection, getPortWorldPosition, planToSvgLocal } from './ports'
import { isBurnerAppliance, type SymbolMetadata } from './symbolMetadata'
import type { PlanPoint } from '../../core/coords'

export type DischargeStart = {
  /** Bağlantı kaydına AYNEN yazılacak ağız — sembol yerel koordinatında. */
  outlet: ApplianceOutlet
  /** Güzergâhın ilk köşesi: ağzın dünya konumu, imlecin yeri DEĞİL. */
  position: PlanPoint
  /** Ağzın dünya yönü: ilk segment buna kilitlenir, kanal cihazdan düz çıkar. */
  direction: PlanPoint
}

/**
 * Baca/havalandırma güzergâhının başlayabileceği yer: imlecin altındaki YAKICI
 * CİHAZIN gövde kenarı. Sabit bir port DEĞİL — ağız kenar boyunca serbesttir ve
 * imlece en yakın kenara oturur (`resolveOutletOnBox`).
 *
 * Üç koşuldan biri bile sağlanmazsa `null` döner ve araç ne önizleme çizer ne de
 * tıklamada bir şey yazar (`onLine` elemanlarının "önizleme yoksa yerleştirme de
 * yok" kuralıyla aynı): imleç bir cihazın üstünde değilse, cihaz yakıcı değilse,
 * ya da o cihaz bu türden bir kanal daha kaldıramıyorsa (ya tek baca ya çok
 * havalandırma — `canAttachDischarge`).
 *
 * Serbest baca YOK: kanal cihazdan çıkar, boşlukta başlayamaz.
 */
export function resolveDischargeStart(
  elements: readonly InstallationElement[],
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  getMetadata: SymbolMetadataLookup,
  kind: DischargeLineKind,
  cursor: PlanPoint,
  toleranceCm: number,
): DischargeStart | null {
  const element = pickElementAt(cursor, elements, getMetadata, toleranceCm)
  if (!element || !isBurnerAppliance(element.type)) return null

  const metadata = getMetadata(element.type)
  // Şema yakıcı cihazda dischargeBox'ı ZORUNLU tutuyor; yine de tip düzeyinde
  // opsiyonel olduğu için burada susturulmaz, açıkça elenir.
  if (!metadata.dischargeBox) return null

  const attached = getAttachedDischargeKinds(lines, connections, element.id)
  if (!canAttachDischarge(attached, kind)) return null

  return resolveOutletTowards(element, metadata, kind, cursor)
}

/**
 * Ağzı imlece göre YENİDEN oturtur: ilk köşe daha tıklanmadan kullanıcı hangi
 * tarafa gidiyorsa ağız o kenara kayar (kullanıcı isteği, 2026-08: "istediğimiz
 * taraftan çizebilelim"). Tıklama anındaki kenara kilitlenseydi ters yöne giden
 * kanal cihazın gövdesini kesip geçerdi.
 *
 * Uygunluk denetimleri (`resolveDischargeStart`) BİR KEZ, çizim başlarken
 * yapılır; burada yalnız geometri yeniden çözülür.
 */
export function resolveOutletTowards(
  element: InstallationElement,
  metadata: SymbolMetadata,
  kind: DischargeLineKind,
  cursor: PlanPoint,
): DischargeStart | null {
  if (!metadata.dischargeBox) return null

  const local = planToSvgLocal(element, metadata, cursor)
  const outletOnBox = resolveOutletOnBox(
    metadata.dischargeBox,
    local,
    getOutletMarginLocal(kind, element.scale),
  )

  return {
    outlet: toApplianceOutlet(element.id, outletOnBox),
    position: getPortWorldPosition(element, outletOnBox, metadata),
    direction: getPortWorldDirection(element, outletOnBox),
  }
}
