import { useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import { OrthographicCamera } from 'three'

import { getSnapRadiusCm } from './snapRadius'
import { getSymbolMetadata } from './symbolLoader'
import type { PlanPoint } from '../../core/coords'
import { getPlacementPosition } from '../../core/placement'
import { readCameraViewport } from '../../scene/cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from '../../scene/drawSurfaceEvents'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import type { InstallationLineKind, LineEndAttachment } from '../core/installationModel'
import { getLineKind, INSTALLATION_SELECTION_TOOL_ID } from '../core/installationTools'
import { appendPoint, removeLastPoint } from '../core/lineGeometry'
import { getLineSeedElementType, getSeedPort, hasServiceBox } from '../core/lineSeed'
import { findNearestPointOnLines, type LineSnapCandidate } from '../core/lineSnap'
import { resolveRightClick, type RightClickInput } from '../core/pointerGestures'
import { findNearestFreePort, type PortCandidate } from '../core/portSnap'
import { getPortWorldPosition } from '../core/ports'
import { findNearestWallPoint } from '../core/wallSnap'
import { usePlumbingUiStore, type LineDraft } from '../store/plumbingUiStore'

const LEFT_BUTTON = 0

/** İmlecin yakalandığı yer. Sahne bunu vurgular; biçim türe göre değişir. */
export type LineToolSnap =
  | { kind: 'port'; position: PlanPoint; port: PortCandidate }
  | { kind: 'line'; position: PlanPoint; line: LineSnapCandidate }

export type LineToolState = {
  /** Hat aracı kapalıysa null — lastik bant da çizilmez. */
  kind: InstallationLineKind | null
  /** Snap uygulanmış imleç. useFrame okur; her pointermove React render'ı tetiklemesin. */
  cursorRef: RefObject<PlanPoint | null>
  /** İmlecin yakaladığı hedef; boşluktaysa null. */
  snapRef: RefObject<LineToolSnap | null>
}

/** Yakalanan hedefin store'a gidecek hâli. Boruya düşen uç, kaydı yazılırken o
 *  boruyu AYIRIR — köşeye düştüyse ayırmaz, var olan köşeye bağlanır. */
function toAttachment(snap: LineToolSnap): LineEndAttachment {
  if (snap.kind === 'port') {
    return { kind: 'port', elementId: snap.port.elementId, portId: snap.port.portId }
  }
  if (snap.line.pointId !== undefined) {
    return { kind: 'linePoint', lineId: snap.line.lineId, pointId: snap.line.pointId }
  }
  return {
    kind: 'lineSplit',
    lineId: snap.line.lineId,
    segmentIndex: snap.line.segmentIndex,
    position: snap.line.position,
  }
}

/**
 * Çok noktalı hat çizimi. `pipe` ve `branch` aynı hook'u paylaşır; fark yalnız
 * `kind` alanıdır. Araç mantığı DrawSurface'e YAZILMAZ (kural 7).
 *
 * Jestler (şartname): sol tık nokta ekler · tek sağ tık son noktayı geri alır ·
 * çift sağ tık hattı bitirir ve Seçim aracına döner · Esc yarım hattı tümüyle
 * iptal eder, araç aktif kalır · porta sol tık hattı orada BİTİRİR ve bağlar,
 * araç aktif kalır (arka arkaya hat çizilebilsin).
 *
 * Devam eden hat plumbingUiStore.draftLine'da yaşar; kalıcı state'e ancak
 * tamamlanınca tek `addLine` çağrısıyla girer → yarım çizim ne kaydedilir ne de
 * geçmişe adım bırakır.
 */
export function useLineTool(): LineToolState {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const camera = useThree((state) => state.camera)
  const cursorRef = useRef<PlanPoint | null>(null)
  const snapRef = useRef<LineToolSnap | null>(null)
  const kind = getLineKind(activeToolId)

  useEffect(() => {
    if (!kind || !(camera instanceof OrthographicCamera)) return undefined

    let pendingRightClickAtMs: number | null = null
    let timerId: number | undefined

    const clearTimer = () => {
      if (timerId === undefined) return
      window.clearTimeout(timerId)
      timerId = undefined
    }

    const readDraft = () => usePlumbingUiStore.getState().draftLine
    const writeDraft = (draft: LineDraft | null) =>
      usePlumbingUiStore.getState().setDraftLine(draft)

    /**
     * Öncelik: port > mevcut boru > duvar ekseni > ızgara. Ctrl ızgarayı kapatır
     * (eleman sürüklemesiyle aynı jest) ama port/boru/duvar yakalamasını kapatmaz:
     * bağlantı kurmak serbest konumlandırmadan daha güçlü bir niyettir.
     *
     * Duvar yakalaması BAĞLANTI KAYDI ÜRETMEZ (`snap: null`) — yalnız konumu
     * duvar eksenine çeker; ürün kuralı borunun duvara paralel, hat üzerinden
     * başlamasını ister ama boru grafiği duvarı tanımaz (core/model.ts).
     */
    const resolveSnap = (
      event: DrawSurfacePointerEvent,
    ): { point: PlanPoint; snap: LineToolSnap | null } => {
      const { zoom } = readCameraViewport(camera)
      const radiusCm = getSnapRadiusCm(zoom)
      const cad = useCadStore.getState()
      const floorElements = cad.installationElements.filter(
        (element) => element.floorId === cad.activeFloorId,
      )

      const port = findNearestFreePort(
        floorElements,
        cad.installationConnections,
        getSymbolMetadata,
        event.planPoint,
        radiusCm,
      )
      if (port) return { point: port.position, snap: { kind: 'port', position: port.position, port } }

      const floorLines = cad.installationLines.filter((line) => line.floorId === cad.activeFloorId)
      const line = findNearestPointOnLines(floorLines, event.planPoint, radiusCm)
      if (line) return { point: line.position, snap: { kind: 'line', position: line.position, line } }

      if (!event.ctrlKey) {
        const floorWalls = cad.walls.filter((wall) => wall.floorId === cad.activeFloorId)
        const wall = findNearestWallPoint(floorWalls, cad.points, event.planPoint, radiusCm)
        if (wall) return { point: wall.position, snap: null }
      }

      const point = event.ctrlKey ? event.planPoint : getPlacementPosition(event.planPoint, zoom)
      return { point, snap: null }
    }

    /**
     * İlk tıklama. Hat bir hedefe düştüyse başı oraya bağlanır; düşmediyse ve o
     * araç bir ÖN ELEMAN istiyorsa (branşman → sayaç, ilk boru → servis kutusu)
     * önce eleman yerleştirilir ve hat onun çıkış portundan başlar.
     *
     * Eleman kendi adımında yazılır: ayrı bir Ctrl+Z ile geri alınır. Hat ile
     * aynı adıma sokulsaydı yarım bırakılan (Esc'lenen) çizimde eleman da
     * kaybolurdu — oysa kullanıcı onu görerek koydu.
     */
    const startDraft = (point: PlanPoint, snap: LineToolSnap | null): LineDraft => {
      if (snap) return { kind, points: [point], startTarget: toAttachment(snap) }

      const cad = useCadStore.getState()
      const seedType = getLineSeedElementType(kind, hasServiceBox(cad.installationElements))
      if (!seedType) return { kind, points: [point], startTarget: null }

      const metadata = getSymbolMetadata(seedType)
      const seedPort = getSeedPort(metadata)
      const elementId = cad.addElement({ type: seedType, position: point })
      if (!seedPort) return { kind, points: [point], startTarget: null }

      const element = useCadStore
        .getState()
        .installationElements.find((candidate) => candidate.id === elementId)
      const startPoint = element ? getPortWorldPosition(element, seedPort, metadata) : point

      return {
        kind,
        points: [startPoint],
        startTarget: { kind: 'port', elementId, portId: seedPort.id },
      }
    }

    /** Hattı yazar ve taslağı bırakır. Bir hedefe bağlanarak biten çizimde araç aktif kalır. */
    const finishLine = (draft: LineDraft | null, endTarget?: LineEndAttachment) => {
      writeDraft(null)
      if (draft) {
        useCadStore.getState().addLine({
          kind: draft.kind,
          points: draft.points,
          pipeTypeName: usePlumbingUiStore.getState().activePipeTypeName,
          startTarget: draft.startTarget ?? undefined,
          endTarget,
        })
      }
      if (!endTarget) useUiStore.getState().setActiveTool(INSTALLATION_SELECTION_TOOL_ID)
    }

    const undoLastPoint = () => {
      const draft = readDraft()
      if (!draft) return

      const points = removeLastPoint(draft.points)
      // Son nokta da silindiyse taslak biter; başlangıç portu da onunla düşer.
      writeDraft(points.length === 0 ? null : { ...draft, points })
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
      if (resolution.action === 'finish') finishLine(readDraft())
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerMove: (event) => {
        const resolved = resolveSnap(event)
        cursorRef.current = resolved.point
        snapRef.current = resolved.snap
      },

      onPointerDown: (event) => {
        // Sağ tık pointerdown'ı da tetikler; yalnız sol tuş nokta koyar.
        if (event.button !== LEFT_BUTTON) return

        // Konum pointermove'a bırakılmaz: dokunmatikte tıklamadan önce hareket gelmez.
        const resolved = resolveSnap(event)
        cursorRef.current = resolved.point
        snapRef.current = resolved.snap

        const draft = readDraft()

        if (!draft) {
          writeDraft(startDraft(resolved.point, resolved.snap))
          return
        }

        const points = appendPoint(draft.points, resolved.point)
        // Porta ya da mevcut bir boruya tıklamak hattı orada SONLANDIRIR:
        // bağlantı kurulduysa çizilecek bir şey kalmamıştır.
        if (resolved.snap) {
          finishLine({ ...draft, points }, toAttachment(resolved.snap))
          return
        }
        writeDraft({ ...draft, points })
      },

      // contextmenu'yü DrawSurface yakalayıp preventDefault ediyor.
      onContextMenu: () => applyRightClick({ kind: 'click', atMs: performance.now() }),

      // Esc yarım hattın TAMAMINI iptal eder ve hiçbir şey kaydetmez; araç aktif
      // kalır ki kullanıcı paleti yeniden seçmeden yeni hatta başlayabilsin.
      onCancel: () => {
        clearTimer()
        pendingRightClickAtMs = null
        writeDraft(null)
      },
    })

    return () => {
      unsubscribe()
      clearTimer()
      // Araç değişince yarım hat asılı kalmasın.
      writeDraft(null)
      cursorRef.current = null
      snapRef.current = null
    }
  }, [camera, kind])

  return { kind, cursorRef, snapRef }
}
