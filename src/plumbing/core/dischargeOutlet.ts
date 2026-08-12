import type { ApplianceOutlet, InstallationConnection, InstallationLine } from './installationModel'
import { isDischargeKind, DISCHARGE_WIDTH_CM, type DischargeLineKind } from './lineKinds'
import type { SymbolBox } from './symbolMetadata'
import type { Id } from '../../core/model'

export type OutletSide = 'top' | 'right' | 'bottom' | 'left'

/** Sembol yerel uzayında çözülmüş ağız: konum + kenardan dışa bakan normal. */
export type OutletOnBox = {
  side: OutletSide
  position: readonly [number, number]
  direction: readonly [number, number]
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Ağzın kenar boyunca kayabileceği aralık. Kanal kenardan TAŞMASIN diye iki uçta
 * yarım genişlik pay bırakılır; gövde kanaldan darsa (şofben 24 cm, havalandırma
 * 30 cm) pay sığmaz ve ağız kenarın ORTASINA sabitlenir — taşma kaçınılmazdır,
 * hiç değilse simetrik olur.
 */
function clampAlongEdge(min: number, max: number, value: number, marginLocal: number): number {
  if (max - min <= marginLocal * 2) return (min + max) / 2
  return clamp(value, min + marginLocal, max - marginLocal)
}

/**
 * Yerel bir noktanın gövde dikdörtgeninin ÇEVRESİNE düşen en yakın ağzı.
 *
 * Önce nokta kutuya kıstırılır, sonra dört kenardan en yakını seçilir: imleç
 * cihazın içindeyken de dışındayken de aynı hesap çalışır, kullanıcı gövdenin
 * ortasına tıklasa bile ağız en yakın kenara oturur.
 *
 * SVG'de +Y AŞAĞI: `min[1]` üst kenardır, dışa bakan normali [0,-1].
 */
export function resolveOutletOnBox(
  box: SymbolBox,
  local: readonly [number, number],
  marginLocal: number,
): OutletOnBox {
  const [minX, minY] = box.min
  const [maxX, maxY] = box.max
  const x = clamp(local[0], minX, maxX)
  const y = clamp(local[1], minY, maxY)

  const toLeft = x - minX
  const toRight = maxX - x
  const toTop = y - minY
  const toBottom = maxY - y
  const nearest = Math.min(toLeft, toRight, toTop, toBottom)

  if (nearest === toTop) {
    return {
      side: 'top',
      position: [clampAlongEdge(minX, maxX, x, marginLocal), minY],
      direction: [0, -1],
    }
  }
  if (nearest === toBottom) {
    return {
      side: 'bottom',
      position: [clampAlongEdge(minX, maxX, x, marginLocal), maxY],
      direction: [0, 1],
    }
  }
  if (nearest === toLeft) {
    return {
      side: 'left',
      position: [minX, clampAlongEdge(minY, maxY, y, marginLocal)],
      direction: [-1, 0],
    }
  }
  return {
    side: 'right',
    position: [maxX, clampAlongEdge(minY, maxY, y, marginLocal)],
    direction: [1, 0],
  }
}

/** Ağzın kenar boyunca bırakacağı pay, sembol YEREL biriminde. */
export function getOutletMarginLocal(kind: DischargeLineKind, scale: number): number {
  return DISCHARGE_WIDTH_CM[kind] / 2 / scale
}

/**
 * Cihaza şu an bağlı deşarj türleri. Hat türünden okunur, bağlantı kaydından
 * değil: kayıt yalnız "bu ucu şu cihaza tutunuyor" der, kanalın baca mı
 * havalandırma mı olduğunu hattın kendisi bilir.
 */
export function getAttachedDischargeKinds(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  elementId: Id,
): Set<DischargeLineKind> {
  const kindByLineId = new Map<Id, DischargeLineKind>()
  for (const line of lines) {
    if (isDischargeKind(line.kind)) kindByLineId.set(line.id, line.kind)
  }

  const attached = new Set<DischargeLineKind>()
  for (const connection of connections) {
    if (connection.target.kind !== 'outlet') continue
    if (connection.target.elementId !== elementId) continue
    const kind = kindByLineId.get(connection.lineId)
    if (kind) attached.add(kind)
  }
  return attached
}

/**
 * Cihaza bu türden bir kanal daha eklenebilir mi? Kural (kullanıcı kararı):
 * bir cihazda YA tek baca YA da bir veya daha çok havalandırma bulunur —
 * ikisi bir arada olmaz.
 */
export function canAttachDischarge(
  attached: ReadonlySet<DischargeLineKind>,
  kind: DischargeLineKind,
): boolean {
  if (attached.size === 0) return true
  // Baca tekildir ve yanına havalandırma da kabul etmez.
  if (attached.has('chimney')) return false
  // Havalandırma varsa yalnız havalandırma çoğalabilir.
  return kind === 'ventilationDuct'
}

/** Bağlantı kaydına yazılacak hâl. Tuple'lar KOPYALANIR: kayıt store'da yaşıyor,
 *  çözümleyicinin readonly dizisini paylaşmamalı. */
export function toApplianceOutlet(elementId: Id, outlet: OutletOnBox): ApplianceOutlet {
  return {
    elementId,
    position: [outlet.position[0], outlet.position[1]],
    direction: [outlet.direction[0], outlet.direction[1]],
  }
}
