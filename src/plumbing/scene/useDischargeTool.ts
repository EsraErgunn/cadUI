import { useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import { OrthographicCamera } from 'three'

import { resolvePlacementPosition } from './placementSnap'
import { getSnapRadiusCm } from './snapRadius'
import { getSymbolMetadata } from './symbolLoader'
import type { PlanPoint } from '../../core/coords'
import { readCameraViewport } from '../../scene/cameraViewport'
import { subscribeDrawSurface } from '../../scene/drawSurfaceEvents'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import {
  appendDischargePoint,
  isDischargeDraftWritable,
  popDischargePoint,
  projectOntoOutletAxis,
  startDischargeDraft,
  type DischargeDraft,
} from '../core/dischargeDraft'
import { resolveDischargeStart, type DischargeStart } from '../core/dischargeStart'
import {
  getDischargeLineKind,
  INSTALLATION_SELECTION_TOOL_ID,
} from '../core/installationTools'
import { isSamePoint } from '../core/lineGeometry'
import type { DischargeLineKind } from '../core/lineKinds'
import { resolveRightClick, type RightClickInput } from '../core/pointerGestures'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

const LEFT_BUTTON = 0

export type DischargeToolState = {
  /** Baca aracı kapalıysa null — önizleme de çizilmez. */
  kind: DischargeLineKind | null
  /** Snap uygulanmış imleç; useFrame okur, her pointermove render tetiklemesin. */
  cursorRef: RefObject<PlanPoint | null>
  /**
   * Taslak yokken imlecin altındaki geçerli başlangıç; yoksa null. Önizlemenin
   * çıkıp çıkmayacağı buna bağlı — "hedef yoksa önizleme de yok".
   */
  startRef: RefObject<DischargeStart | null>
}

/**
 * Baca ve havalandırma kanalı çizimi. İkisi aynı hook'u paylaşır; fark yalnız
 * `kind` alanı (boru/branşman ikilisiyle aynı desen).
 *
 * Boru aracından üç yerde AYRILIR, bu yüzden ayrı bir hook:
 * - Başlangıç ZORUNLU olarak bir yakıcı cihazın boş deşarj portudur. Cihaz
 *   üstünde değilken önizleme çıkmaz ve sol tık hiçbir şey yapmaz. Serbest
 *   baca yok; `getLineSeedElementType` gibi bir "önce elemanı koy" yolu da yok.
 * - Yakalama zinciri kısa: cihaz portu (yalnız ilk tık) → ızgara. Porta/boruya/
 *   duvara yapışma YOK — kanal gaz grafiğine hiç dokunmaz.
 * - Güzergâh TEK hat olarak yazılır (bkz. `core/dischargeDraft.ts`): taslak
 *   store'a hiç dokunmaz, bitişte tek `addLine` çalışır ve tek Ctrl+Z geri alır.
 */
export function useDischargeTool(): DischargeToolState {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const camera = useThree((state) => state.camera)
  const cursorRef = useRef<PlanPoint | null>(null)
  const startRef = useRef<DischargeStart | null>(null)
  const kind = getDischargeLineKind(activeToolId)

  useEffect(() => {
    if (!kind || !(camera instanceof OrthographicCamera)) return undefined

    let pendingRightClickAtMs: number | null = null
    let timerId: number | undefined

    const clearTimer = () => {
      if (timerId === undefined) return
      window.clearTimeout(timerId)
      timerId = undefined
    }

    const readDraft = () => usePlumbingUiStore.getState().dischargeDraft
    const writeDraft = (draft: DischargeDraft | null) =>
      usePlumbingUiStore.getState().setDischargeDraft(draft)

    const findStart = (planPoint: PlanPoint): DischargeStart | null => {
      const { zoom } = readCameraViewport(camera)
      const cad = useCadStore.getState()
      const floorElements = cad.installationElements.filter(
        (element) => element.floorId === cad.activeFloorId,
      )
      return resolveDischargeStart(
        floorElements,
        cad.installationLines,
        cad.installationConnections,
        getSymbolMetadata,
        kind,
        planPoint,
        getSnapRadiusCm(zoom),
      )
    }

    /** Ctrl ızgarayı kapatır — boru aracıyla aynı jest. */
    const readCornerPosition = (planPoint: PlanPoint, isCtrlPressed: boolean): PlanPoint => {
      if (isCtrlPressed) return planPoint
      const { zoom } = readCameraViewport(camera)
      return resolvePlacementPosition(planPoint, zoom)
    }

    /**
     * Taslağın bir sonraki köşesi. Cihazdan çıkan İLK segment ağzın eksenine
     * kilitlidir; önizleme ile tıklama aynı fonksiyondan geçer ki bant nereyi
     * gösteriyorsa köşe oraya düşsün.
     */
    const readNextCorner = (
      draft: DischargeDraft,
      planPoint: PlanPoint,
      isCtrlPressed: boolean,
    ): PlanPoint => {
      const corner = readCornerPosition(planPoint, isCtrlPressed)
      if (draft.points.length > 1) return corner
      return projectOntoOutletAxis(draft.start.position, draft.start.direction, corner)
    }

    /** Güzergâhı kalıcı hâle getirir; iki köşeden azı YAZILMAZ. */
    const commitDraft = (draft: DischargeDraft) => {
      if (!isDischargeDraftWritable(draft)) return
      useCadStore.getState().addLine({
        kind: draft.kind,
        points: draft.points,
        startTarget: { kind: 'outlet', ...draft.start.outlet },
      })
    }

    const finishRun = () => {
      const draft = readDraft()
      if (draft) commitDraft(draft)
      writeDraft(null)
      useUiStore.getState().setActiveTool(INSTALLATION_SELECTION_TOOL_ID)
    }

    /** Tek sağ tık son köşeyi geri alır — store'a hiç dokunulmadı, silinecek hat yok. */
    const undoLastPoint = () => {
      const draft = readDraft()
      if (!draft) return
      writeDraft(popDischargePoint(draft))
    }

    const applyRightClick = (input: RightClickInput) => {
      const resolution = resolveRightClick(pendingRightClickAtMs, input)
      pendingRightClickAtMs = resolution.pendingSinceMs

      clearTimer()
      if (resolution.scheduleInMs !== null) {
        timerId = window.setTimeout(
          () => applyRightClick({ kind: 'timeout' }),
          resolution.scheduleInMs,
        )
      }

      if (resolution.action === 'undoPoint') undoLastPoint()
      if (resolution.action === 'finish') finishRun()
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerMove: (event) => {
        const draft = readDraft()
        if (!draft) {
          startRef.current = findStart(event.planPoint)
          cursorRef.current = null
          return
        }
        startRef.current = null
        cursorRef.current = readNextCorner(draft, event.planPoint, event.ctrlKey)
      },

      onPointerDown: (event) => {
        // Sağ tık pointerdown'ı da tetikler; yalnız sol tuş köşe bırakır.
        if (event.button !== LEFT_BUTTON) return

        const draft = readDraft()

        // Konum pointermove'a bırakılmaz: dokunmatikte tıklamadan önce hareket gelmez.
        if (!draft) {
          const start = findStart(event.planPoint)
          startRef.current = start
          // Geçerli bir cihaz portu yoksa çizim BAŞLAMAZ.
          if (!start) return
          writeDraft(startDischargeDraft(kind, start))
          return
        }

        const point = readNextCorner(draft, event.planPoint, event.ctrlKey)
        // Aynı yere ikinci tık sıfır boy segment üretirdi.
        if (isSamePoint(draft.points.at(-1)!, point)) return
        writeDraft(appendDischargePoint(draft, point))
      },

      // contextmenu'yü DrawSurface yakalayıp preventDefault ediyor.
      onContextMenu: () => applyRightClick({ kind: 'click', atMs: performance.now() }),

      /**
       * Esc güzergâhı ATAR — yazılmamış olduğu için geriye bir şey kalmaz (boru
       * aracında yazılmış adımlar kalıyordu, burada kalacak adım yok). Araç
       * aktif kalır ki paleti yeniden seçmeden yeni bir kanala başlanabilsin.
       */
      onCancel: () => {
        clearTimer()
        pendingRightClickAtMs = null
        writeDraft(null)
        startRef.current = null
        cursorRef.current = null
      },
    })

    return () => {
      unsubscribe()
      clearTimer()
      // Araç değişince yarım kanal asılı kalmasın.
      writeDraft(null)
      startRef.current = null
      cursorRef.current = null
    }
  }, [camera, kind])

  return { kind, cursorRef, startRef }
}
