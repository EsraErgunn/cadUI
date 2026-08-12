import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { OrthographicCamera } from 'three'

import { getSnapRadiusCm } from './snapRadius'
import { getSymbolMetadata } from './symbolLoader'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import { getPlacementPosition } from '../../core/placement'
import { readCameraViewport } from '../../scene/cameraViewport'
import { subscribeDrawSurface } from '../../scene/drawSurfaceEvents'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { getElementAttachMode, getPlacementPreviewTypes } from '../core/attachModes'
import {
  resolveFreeEndAttachment,
  resolveNearestLineAttachment,
  resolveOnLineAttachment,
  type ElementPlacement,
  type FreeEndAttachment,
  type NearestLineAttachment,
  type OnLineAttachment,
} from '../core/elementAttach'
import {
  getPlacementElementType,
  INSTALLATION_PIPE_TOOL_ID,
} from '../core/installationTools'
import { isGasCarryingKind } from '../core/lineKinds'
import { getSeedPort } from '../core/lineSeed'
import { DEFAULT_ELEMENT_ANGLE_DEG } from '../core/placement'
import { getPortWorldPosition } from '../core/ports'
import type { InstallationElementType } from '../core/symbolMetadata'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

const LEFT_BUTTON = 0

/** Araç kapalıyken paylaşılan boş dizi: her render'da yeni referans üretilmesin. */
const NO_PREVIEW_TYPES: readonly InstallationElementType[] = []

/** Cihaz kolunun iki ucu. */
export type StubPreview = readonly [PlanPoint, PlanPoint]

export type PlacementPreviewState = {
  /** Yerleştirme aracı kapalıysa null — önizleme de çizilmez. */
  elementType: InstallationElementType | null
  /** Önizlemede çizilecek semboller; araç seçilince SABİTTİR (ana eleman + refakatçileri). */
  previewTypes: readonly InstallationElementType[]
  /**
   * `previewTypes` ile AYNI sıradaki çözülmüş yerleşim. null = geçerli hedef yok
   * (boruya yapışan eleman boru üstünde değil) → önizleme gizlenir ve tıklama da
   * bir şey koymaz. useFrame okur; her pointermove React render'ı tetiklemesin.
   */
  placementsRef: RefObject<readonly ElementPlacement[] | null>
  /** Cihazı boruya bağlayan kolun önizlemesi; kol yoksa null. */
  stubRef: RefObject<StubPreview | null>
}

type ResolvedPlacement =
  | { mode: 'free'; placements: readonly ElementPlacement[] }
  | { mode: 'onLine'; placements: readonly ElementPlacement[]; attachment: OnLineAttachment }
  | { mode: 'lineEnd'; placements: readonly ElementPlacement[]; attachment: FreeEndAttachment }
  | {
      mode: 'nearestLine'
      placements: readonly ElementPlacement[]
      attachment: NearestLineAttachment
      stub: StubPreview
    }

/**
 * Eleman yerleştirme aracı. DrawSurface yalnız ham pointer olayı yayınlar; araç
 * mantığı CLAUDE.md kural 7 gereği burada durur.
 *
 * Elemanın nereye tutunacağı türden gelir (`core/attachModes.ts`): armatür boruya
 * oturur, sayaç boş bir uca takılır, yakıcı cihaz en yakın boruya kısa bir kolla
 * bağlanır, servis kutusu/baca serbest bırakılır. Geometrinin tamamı saf
 * `core/elementAttach.ts`'te; burada yalnız olay ve store çağrısı var.
 *
 * Yerleştirme pointerUP'ta yapılır. Böylece iki giriş yolu TEK kod yolu olur:
 * tuvale tıklama (down+up) ve palet butonundan sürükleyip tuvale bırakma
 * (down butonda, up tuvalde) — aynı jest iki kez eleman eklemez.
 */
export function usePlacementTool(): PlacementPreviewState {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const camera = useThree((state) => state.camera)
  const placementsRef = useRef<readonly ElementPlacement[] | null>(null)
  const stubRef = useRef<StubPreview | null>(null)
  const elementType = getPlacementElementType(activeToolId)
  const previewTypes = useMemo(
    () => (elementType ? getPlacementPreviewTypes(elementType) : NO_PREVIEW_TYPES),
    [elementType],
  )

  useEffect(() => {
    if (!elementType || !(camera instanceof OrthographicCamera)) return undefined

    const mode = getElementAttachMode(elementType)

    /**
     * Yalnız GAZ hatları hedef: armatür bacaya oturmamalı, sayaç kanalın ucuna
     * takılmamalı, cihaz koluyla kanala bağlanmamalı. Özellikle `nearestLine`
     * yarıçapsız çalışıyor ("en yakın açık uca yapışır") — süzülmeseydi yeni
     * konan bir cihaz planın öbür ucundaki bacaya kol atardı.
     */
    const readFloorLines = () => {
      const cad = useCadStore.getState()
      return cad.installationLines.filter(
        (line) => line.floorId === cad.activeFloorId && isGasCarryingKind(line.kind),
      )
    }

    /**
     * Boruya yapışan modlarda HAM imleç kullanılır, ızgaraya oturtulmuş olan
     * değil: hedef boru zaten yakalamayı belirliyor, araya giren ızgara adımı
     * yakalamayı kaçırtırdı (hat aracındaki "port > ızgara" önceliğiyle aynı).
     */
    const resolve = (planPoint: PlanPoint): ResolvedPlacement | null => {
      const { zoom } = readCameraViewport(camera)

      if (mode === 'free') {
        const position = getPlacementPosition(planPoint, zoom)
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
        if (!attachment) return null
        return { mode, attachment, placements: attachment.nodes.map((node) => node.placement) }
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
        if (!attachment) return null
        return { mode, attachment, placements: attachment.placements }
      }

      const attachment = resolveNearestLineAttachment(
        lines,
        useCadStore.getState().installationConnections,
        getSymbolMetadata,
        elementType,
        getPlacementPosition(planPoint, zoom),
      )
      if (!attachment) return null
      return {
        mode,
        attachment,
        placements: attachment.placements,
        stub: [attachment.nodePosition, attachment.inputPortPosition],
      }
    }

    const write = (resolved: ResolvedPlacement | null) => {
      placementsRef.current = resolved?.placements ?? null
      stubRef.current = resolved?.mode === 'nearestLine' ? resolved.stub : null
    }

    /**
     * Sayaç konunca boru çizimi KENDİLİĞİNDEN başlar: araç boruya geçer ve taslak
     * sayacın çıkış portundan açılır (gaz yönü sayaç → tüketim). Kullanıcı sayacı
     * koyup paletten boruyu ayrıca seçmek zorunda kalmaz.
     */
    const startPipeFrom = (elementId: Id | null) => {
      const element = useCadStore
        .getState()
        .installationElements.find((candidate) => candidate.id === elementId)
      if (!element) return

      const metadata = getSymbolMetadata(element.type)
      const outputPort = getSeedPort(metadata)
      if (outputPort) {
        usePlumbingUiStore.getState().setDraftLine({
          kind: 'pipe',
          anchor: getPortWorldPosition(element, outputPort, metadata),
          startTarget: { kind: 'port', elementId: element.id, portId: outputPort.id },
          steps: [],
        })
      }
      useUiStore.getState().setActiveTool(INSTALLATION_PIPE_TOOL_ID)
    }

    const apply = (resolved: ResolvedPlacement) => {
      const cad = useCadStore.getState()

      if (resolved.mode === 'free') {
        // Araç bilerek aktif kalır: arka arkaya eleman eklenebilsin.
        cad.addElement({ type: elementType, position: resolved.placements[0].position })
        return
      }
      if (resolved.mode === 'onLine') {
        cad.placeOnLineElements(resolved.attachment)
        return
      }
      if (resolved.mode === 'nearestLine') {
        cad.placeElementWithStub(
          resolved.attachment,
          usePlumbingUiStore.getState().activePipeTypeName,
        )
        return
      }
      startPipeFrom(cad.placeElementAtLineEnd(resolved.attachment))
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerMove: (event) => {
        write(resolve(event.planPoint))
      },

      onPointerUp: (event) => {
        if (event.button !== LEFT_BUTTON) return

        // Konum pointermove'a bırakılmaz: dokunmatikte tıklamadan önce hareket gelmez.
        const resolved = resolve(event.planPoint)
        write(resolved)
        // Geçerli hedef yoksa hiçbir şey konmaz — "boru üstünde değilken önizleme
        // yok" kuralının veri tarafındaki karşılığı.
        if (resolved) apply(resolved)
      },

      onCancel: () => {
        write(null)
      },
    })

    return () => {
      unsubscribe()
      // Araç değişince önizleme son konumunda asılı kalmasın.
      write(null)
    }
  }, [camera, elementType])

  return { elementType, previewTypes, placementsRef, stubRef }
}
