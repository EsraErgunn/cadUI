import { useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import { OrthographicCamera } from 'three'

import { resolvePlacementPosition } from './placementSnap'
import { getSnapRadiusCm } from './snapRadius'
import { getSymbolMetadata } from './symbolLoader'
import type { PlanPoint } from '../../core/coords'
import { readCameraViewport } from '../../scene/cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from '../../scene/drawSurfaceEvents'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import type { InstallationLineKind, LineEndAttachment } from '../core/installationModel'
import { getGasLineKind, INSTALLATION_SELECTION_TOOL_ID } from '../core/installationTools'
import { advanceChain, rewindChain, startChain } from '../core/lineChain'
import { isSamePoint } from '../core/lineGeometry'
import { isGasCarryingKind } from '../core/lineKinds'
import { getLineSeedElementType, getSeedPort, hasServiceBox } from '../core/lineSeed'
import { findNearestPointOnLines, type LineSnapCandidate } from '../core/lineSnap'
import { resolveRightClick, type RightClickInput } from '../core/pointerGestures'
import { findNearestFreePort, type PortCandidate } from '../core/portSnap'
import { getPortWorldPosition } from '../core/ports'
import { createWallParallelLock } from '../core/wallParallelLock'
import { usePlumbingUiStore, type LineDraft } from '../store/plumbingUiStore'

const LEFT_BUTTON = 0

/** Adım geri alınırken yalnız boru silinir; paylaşılan sabit dizi ayırmaz. */
const NO_ELEMENT_IDS = [] as const

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
 * Zincirleme boru çizimi. `pipe` ve `branch` aynı hook'u paylaşır; fark yalnız
 * `kind` alanıdır. Araç mantığı DrawSurface'e YAZILMAZ (kural 7).
 *
 * **Her sol tık KENDİ borusunu yazar** (K-W): iki tık arası bir adım = bir
 * `InstallationLine`. Bir sonraki adım bir öncekinin ucuna bağlantı kaydıyla
 * tutunur, böylece köşe sürüklenince komşu adım da gelir
 * (`core/lineCornerLink.ts`). Eskiden tüm zincir tek çok noktalı hat olarak
 * bitişte yazılıyordu; adımlar ayrı olunca her boru tek başına seçilebiliyor,
 * silinebiliyor ve kendi çapını alabiliyor.
 *
 * Jestler: sol tık adımı yazar ve köşe bırakır · tek sağ tık SON ADIMI geri
 * alır · çift sağ tık çizimi bitirir ve Seçim aracına döner · Esc çizimi
 * bırakır (yazılmış adımlar kalır, araç aktif kalır) · porta ya da mevcut bir
 * boruya sol tık zinciri orada bağlayıp BİTİRİR, araç aktif kalır.
 */
export function useLineTool(): LineToolState {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const camera = useThree((state) => state.camera)
  const cursorRef = useRef<PlanPoint | null>(null)
  const snapRef = useRef<LineToolSnap | null>(null)
  const kind = getGasLineKind(activeToolId)

  useEffect(() => {
    if (!kind || !(camera instanceof OrthographicCamera)) return undefined

    let pendingRightClickAtMs: number | null = null
    let timerId: number | undefined
    /** Duvara paralel yakalamanın histerezisli hâli (kararlılık, bkz. dosyanın kendisi). */
    const wallLock = createWallParallelLock()

    const clearTimer = () => {
      if (timerId === undefined) return
      window.clearTimeout(timerId)
      timerId = undefined
    }

    const readDraft = () => usePlumbingUiStore.getState().draftLine
    const writeDraft = (draft: LineDraft | null) =>
      usePlumbingUiStore.getState().setDraftLine(draft)

    /**
     * Öncelik: port > mevcut boru > duvara paralel yön > ızgara. Ctrl ızgarayı
     * kapatır (eleman sürüklemesiyle aynı jest) ama port/boru/duvar
     * yakalamasını kapatmaz: bağlantı kurmak serbest konumlandırmadan daha
     * güçlü bir niyettir.
     *
     * Duvar yakalaması BAĞLANTI KAYDI ÜRETMEZ (`snap: null`) ve BELİRLİ BİR
     * NOKTAYA da yapıştırmaz (kullanıcı isteği, 2026-08) — yalnız zincirin
     * ANCHOR'ından çıkan köşeyi en yakın duvarın AÇISINA paralel bir doğruya
     * kelepçeler (`findNearestWallParallel`). Zincirin İLK noktasında (henüz
     * anchor yokken, yani `draftLine` boşken) duvarın bu adımda hiç etkisi
     * yok — "paralel" iki noktalı bir segmentin özelliği, tek bir başlangıç
     * noktasının değil; ilk nokta düz ızgaraya düşer.
     */
    const resolveSnap = (
      event: DrawSurfacePointerEvent,
    ): { point: PlanPoint; snap: LineToolSnap | null } => {
      const { zoom } = readCameraViewport(camera)
      const radiusCm = getSnapRadiusCm(zoom)
      const cad = useCadStore.getState()
      const draftLine = readDraft()
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

      // Zincirin ucunun ÜSTÜNDE oturduğu boru aday değildir: kullanıcı oradan
      // geliyor: kısa bir adım yeni köşeyi kaçınılmaz olarak o borunun yakalama
      // yarıçapına düşürür ve adım, az önce yazdığı boruyu AYIRARAK biterdi.
      const anchorLineId =
        draftLine?.startTarget?.kind === 'linePoint' ? draftLine.startTarget.lineId : null
      // Baca/havalandırma aday DEĞİL: gaz borusu onlara yapışsaydı `lineSplit`
      // kanalı ortasından ayırır ve içine bir gaz düğümü açardı.
      const floorLines = cad.installationLines.filter(
        (line) =>
          line.floorId === cad.activeFloorId &&
          line.id !== anchorLineId &&
          isGasCarryingKind(line.kind),
      )
      const line = findNearestPointOnLines(floorLines, event.planPoint, radiusCm)
      if (line) return { point: line.position, snap: { kind: 'line', position: line.position, line } }

      if (!event.ctrlKey && draftLine) {
        const floorWalls = cad.walls.filter((wall) => wall.floorId === cad.activeFloorId)
        const wall = wallLock.resolve(floorWalls, cad.points, draftLine.anchor, event.planPoint, radiusCm)
        if (wall) return { point: wall.position, snap: null }
      }

      const point = event.ctrlKey ? event.planPoint : resolvePlacementPosition(event.planPoint, zoom)
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
      if (snap) return { kind, ...startChain(point, toAttachment(snap)) }

      const cad = useCadStore.getState()
      const seedType = getLineSeedElementType(kind, hasServiceBox(cad.installationElements))
      if (!seedType) return { kind, ...startChain(point, null) }

      const metadata = getSymbolMetadata(seedType)
      const seedPort = getSeedPort(metadata)
      const elementId = cad.addElement({ type: seedType, position: point })
      if (!seedPort) return { kind, ...startChain(point, null) }

      const element = useCadStore
        .getState()
        .installationElements.find((candidate) => candidate.id === elementId)
      const startPoint = element ? getPortWorldPosition(element, seedPort, metadata) : point

      return {
        kind,
        ...startChain(startPoint, { kind: 'port', elementId, portId: seedPort.id }),
      }
    }

    /**
     * Bir adımı (iki köşe arası boru) yazar. Hedefe bağlanarak biten adım
     * zinciri KAPATIR — bağlantı kurulduysa çizilecek bir şey kalmamıştır ve
     * araç aktif kalır.
     */
    const commitStep = (draft: LineDraft, point: PlanPoint, snap: LineToolSnap | null) => {
      const written = useCadStore.getState().addLine({
        kind: draft.kind,
        points: [draft.anchor, point],
        pipeTypeName: usePlumbingUiStore.getState().activePipeTypeName,
        startTarget: draft.startTarget ?? undefined,
        endTarget: snap ? toAttachment(snap) : undefined,
      })
      if (!written) return

      writeDraft(snap ? null : { kind: draft.kind, ...advanceChain(draft, point, written) })
    }

    /** Çizimi bırakır; yazılmış adımlar KALIR (her biri kendi başına bir borudur). */
    const finishChain = () => {
      writeDraft(null)
      useUiStore.getState().setActiveTool(INSTALLATION_SELECTION_TOOL_ID)
    }

    /** Tek sağ tık: son ADIMI siler ve ucu o adımın başına geri oturtur. */
    const undoLastStep = () => {
      const draft = readDraft()
      if (!draft) return

      const rewound = rewindChain(draft)
      if (rewound.removedLineId !== null) {
        useCadStore.getState().removeSelection(NO_ELEMENT_IDS, [rewound.removedLineId])
      }
      writeDraft(rewound.chain && { kind: draft.kind, ...rewound.chain })
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

      if (resolution.action === 'undoPoint') undoLastStep()
      if (resolution.action === 'finish') finishChain()
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

        // Aynı yere ikinci tık sıfır boy boru üretirdi.
        if (isSamePoint(draft.anchor, resolved.point)) return

        commitStep(draft, resolved.point, resolved.snap)
      },

      // contextmenu'yü DrawSurface yakalayıp preventDefault ediyor.
      onContextMenu: () => applyRightClick({ kind: 'click', atMs: performance.now() }),

      // Esc devam eden zinciri BIRAKIR; yazılmış adımlar kalır (her sol tık
      // kendi borusunu yazdı, kullanıcı onları görerek koydu — tıpkı başlangıç
      // elemanı gibi). Araç aktif kalır ki paleti yeniden seçmeden yeni bir
      // zincire başlanabilsin.
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
