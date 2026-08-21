import { resolvePlacementPosition } from './placementSnap'
import { getSnapRadiusCm } from './snapRadius'
import { getSymbolMetadata } from './symbolLoader'
import type { PlanPoint } from '../../core/coords'
import { useCadStore } from '../../store/cadStore'
import { getInlineSpecs, type ElementAttachMode } from '../core/attachModes'
import {
  resolveFreeEndAttachment,
  resolveNearestLineAttachment,
  resolveOnLineAttachment,
  resolveVerticalArmAttachment,
  resolveVerticalEndAttachment,
  type ElementPlacement,
  type FreeEndAttachment,
  type NearestLineAttachment,
  type OnLineAttachment,
  type VerticalArmAttachment,
  type VerticalEndAttachment,
} from '../core/elementAttach'
import type { InstallationLine } from '../core/installationModel'
import { isGasCarryingKind } from '../core/lineKinds'
import { DEFAULT_ELEMENT_ANGLE_DEG } from '../core/placement'
import type { InstallationElementType } from '../core/symbolMetadata'

/** Cihaz kolunun iki ucu. */
export type StubPreview = readonly [PlanPoint, PlanPoint]

export type ResolvedPlacement =
  | { mode: 'free'; placements: readonly ElementPlacement[] }
  | { mode: 'onLine'; placements: readonly ElementPlacement[]; attachment: OnLineAttachment }
  | { mode: 'lineEnd'; placements: readonly ElementPlacement[]; attachment: FreeEndAttachment }
  | {
      mode: 'verticalArm'
      placements: readonly ElementPlacement[]
      attachment: VerticalArmAttachment
    }
  | {
      mode: 'verticalEnd'
      placements: readonly ElementPlacement[]
      attachment: VerticalEndAttachment
    }
  | {
      mode: 'nearestLine'
      placements: readonly ElementPlacement[]
      attachment: NearestLineAttachment
      stub: StubPreview
    }

/**
 * Yalnız GAZ hatları hedef: armatür bacaya oturmamalı, sayaç kanalın ucuna
 * takılmamalı, cihaz koluyla kanala bağlanmamalı. Özellikle `nearestLine`
 * yarıçapsız çalışıyor ("en yakın açık uca yapışır") — süzülmeseydi yeni
 * konan bir cihaz planın öbür ucundaki bacaya kol atardı.
 *
 * `branchStub` de hedef DEĞİL (kullanıcı isteği, 2026-08: "branşmanın mavi
 * ucuna bir şey eklenmesin"): o kol zaten kendi sayacını/vanasını taşıyor,
 * boş kalan yer seviyesi ucu başka bir armatür/cihaz için bir bağlantı
 * noktası değil. Branşmanın kendi sayacını yerleştirmesi bu filtreden
 * ETKİLENMEZ — `useLineTool`'daki `commitBranchGroundStep` yeni yazılan tek
 * kolu doğrudan, bu listeden bağımsız verir.
 */
function readFloorLines(): readonly InstallationLine[] {
  const cad = useCadStore.getState()
  return cad.installationLines.filter(
    (line) =>
      line.floorId === cad.activeFloorId &&
      isGasCarryingKind(line.kind) &&
      line.kind !== 'branchStub',
  )
}

/**
 * Boruya yapışan modlarda HAM imleç kullanılır, ızgaraya oturtulmuş olan
 * değil: hedef boru zaten yakalamayı belirliyor, araya giren ızgara adımı
 * yakalamayı kaçırtırdı (hat aracındaki "port > ızgara" önceliğiyle aynı).
 */
export function resolvePlacement(
  elementType: InstallationElementType,
  mode: ElementAttachMode,
  planPoint: PlanPoint,
  zoom: number,
): ResolvedPlacement | null {
  if (mode === 'free') {
    const position = resolvePlacementPosition(planPoint, zoom)
    return {
      mode,
      placements: [{ type: elementType, position, angleDeg: DEFAULT_ELEMENT_ANGLE_DEG }],
    }
  }

  const lines = readFloorLines()

  if (mode === 'onLine') {
    const attachment = resolveOnLineAttachment(
      lines,
      getSymbolMetadata,
      elementType,
      planPoint,
      getSnapRadiusCm(zoom),
    )
    // Dikey boru (K102) gövdesiyle yakalanamaz: plan boyu sıfır, bölünecek
    // parçası yok. Armatür o zaman kolonun UÇ düğümüne oturur ve kotunu oradan
    // alır. Refakatçili elemanlar (regülatör grubu) hariç: dört sembol tek
    // düğüme sığmaz, sessizce üst üste binerdi.
    const vertical =
      getInlineSpecs(elementType).length > 1
        ? null
        : resolveVerticalEndAttachment(
            lines,
            getSymbolMetadata,
            elementType,
            planPoint,
            getSnapRadiusCm(zoom),
          )

    // YAKIN olan kazanır. Kolon çoğu zaman bir yatay borunun UCUNDA durur; gövde
    // yakalaması koşulsuz öncelikli olsaydı imleç kolonun üstündeyken bile
    // komşu yatay boru kazanır ve kolona hiçbir armatür eklenemezdi (kullanıcı
    // bulgusu, 2026-08). Eşitlikte kolon kazanır: kolon TEK bir noktadır, gövde
    // ise bir doğru — nokta hedef daha kesin bir niyettir.
    if (vertical && (!attachment || vertical.distanceCm <= attachment.distanceCm)) {
      return { mode: 'verticalEnd', attachment: vertical, placements: [vertical.placement] }
    }
    if (attachment) {
      return { mode, attachment, placements: attachment.nodes.map((node) => node.placement) }
    }
    return null
  }

  if (mode === 'lineEnd') {
    const attachment = resolveFreeEndAttachment(
      lines,
      useCadStore.getState().installationConnections,
      getSymbolMetadata,
      elementType,
      planPoint,
      getSnapRadiusCm(zoom),
    )
    if (attachment) return { mode, attachment, placements: attachment.placements }

    // Kolonun ucu: hat UZATILAMAZ (plan yönü yok), bunun yerine aynı kotta
    // kısa bir yatay kol doğar ve eleman onun ucuna oturur.
    const arm = resolveVerticalArmAttachment(
      lines,
      getSymbolMetadata,
      elementType,
      planPoint,
      getSnapRadiusCm(zoom),
    )
    if (!arm) return null
    return { mode: 'verticalArm', attachment: arm, placements: arm.placements }
  }

  const attachment = resolveNearestLineAttachment(
    lines,
    useCadStore.getState().installationConnections,
    getSymbolMetadata,
    elementType,
    resolvePlacementPosition(planPoint, zoom),
  )
  if (!attachment) return null
  return {
    mode,
    attachment,
    placements: attachment.placements,
    stub: [attachment.nodePosition, attachment.inputPortPosition],
  }
}
