import { resolvePlacementPosition } from './placementSnap'
import { getSnapRadiusCm } from './snapRadius'
import { getSymbolMetadata } from './symbolLoader'
import type { PlanPoint } from '../../core/coords'
import { useCadStore } from '../../store/cadStore'
import { getInlineSpecs, type ElementAttachMode } from '../core/attachModes'
import {
  resolveFreeEndAttachment,
  resolveFreeEndNodeAttachment,
  resolveNearestLineAttachment,
  resolveOnLineAttachment,
  resolveVerticalLineEndAttachment,
  resolveVerticalEndAttachment,
  type ElementPlacement,
  type FreeEndAttachment,
  type NearestLineAttachment,
  type OnLineAttachment,
  type VerticalLineEndAttachment,
  type EndNodeAttachment,
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
      mode: 'verticalLineEnd'
      placements: readonly ElementPlacement[]
      attachment: VerticalLineEndAttachment
    }
  | {
      mode: 'endNode'
      placements: readonly ElementPlacement[]
      attachment: EndNodeAttachment
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
    // Boru gövdesi yerine bir UÇ DÜĞÜMÜ hedeflenebilen iki hâl. Refakatçili
    // elemanlar (regülatör grubu) ikisinin de dışında: dört sembol tek düğüme
    // sığmaz, sessizce üst üste binerdi.
    //
    // 1) Dikey boru (K102) gövdesiyle yakalanamaz: plan boyu sıfır, bölünecek
    //    parçası yok — armatür kolonun uç düğümüne oturur.
    // 2) Yatay borunun AÇIK ucu: oraya oturan vana o ucu KAPATIR. Gövde bölmesi
    //    ucun dibine düğüm koyamıyor (`MIN_NODE_GAP_CM`), bu yüzden uç ayrı bir
    //    hedef (kullanıcı isteği, 2026-08: "boş yere vana ekleyince orası
    //    kapansın, ucuna yapışsın, hata kapansın").
    const snapRadiusCm = getSnapRadiusCm(zoom)
    const isSingleSymbol = getInlineSpecs(elementType).length === 1

    // Açık uç gövde bölmesini KOŞULSUZ yener (yarıçap zaten 14 EKRAN pikseli,
    // yani imleç ucun dibinde): gövde bölmesi ucun 1 cm berisine düğüm koyup
    // ötesinde küçücük SERBEST bir parça bırakıyordu, uç açık kaldığı için de
    // Hata6 kapanmıyordu (kullanıcı bildirimi, 2026-08).
    const freeEnd = isSingleSymbol
      ? resolveFreeEndNodeAttachment(
          lines,
          useCadStore.getState().installationConnections,
          getSymbolMetadata,
          elementType,
          planPoint,
          snapRadiusCm,
        )
      : null
    if (freeEnd) {
      return { mode: 'endNode', attachment: freeEnd, placements: [freeEnd.placement] }
    }

    const endNode = isSingleSymbol
      ? resolveVerticalEndAttachment(
          lines,
          getSymbolMetadata,
          elementType,
          planPoint,
          snapRadiusCm,
        )
      : null

    // YAKIN olan kazanır. Kolon çoğu zaman bir yatay borunun UCUNDA durur; gövde
    // yakalaması koşulsuz öncelikli olsaydı imleç kolonun üstündeyken bile
    // komşu yatay boru kazanır ve kolona hiçbir armatür eklenemezdi (kullanıcı
    // bulgusu, 2026-08). Eşitlikte düğüm kazanır: düğüm TEK bir noktadır, gövde
    // ise bir doğru — nokta hedef daha kesin bir niyettir.
    if (endNode && (!attachment || endNode.distanceCm <= attachment.distanceCm)) {
      return { mode: 'endNode', attachment: endNode, placements: [endNode.placement] }
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

    // Kolonun ucu: hat UZATILAMAZ (plan yönü yok). Eleman kolonun uç düğümüne
    // DOĞRUDAN bağlanır, arada kol borusu doğmaz (kullanıcı isteği, 2026-08).
    const vertical = resolveVerticalLineEndAttachment(
      lines,
      useCadStore.getState().installationConnections,
      getSymbolMetadata,
      elementType,
      planPoint,
      getSnapRadiusCm(zoom),
    )
    if (!vertical) return null
    return { mode: 'verticalLineEnd', attachment: vertical, placements: vertical.placements }
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
