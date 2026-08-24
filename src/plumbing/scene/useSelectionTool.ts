import { useThree } from '@react-three/fiber'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { OrthographicCamera } from 'three'

import { ELEVATION_NODE_RING_RADIUS_PX } from './ElevationNodeRing'
import { resolvePlacementPosition } from './placementSnap'
import { getSnapRadiusCm, getWallEdgeGapCm } from './snapRadius'
import { getLoadedSymbol } from './symbolLoader'
import { findSelectedElementRotateHandle } from './useElementRotateTool'
import type { PlanPoint } from '../../core/coords'
import { isTypingTarget } from '../../core/domEvents'
import type { Id } from '../../core/model'
import { getPlacementStepCm } from '../../core/placement'
import { toPlanRect } from '../../core/selection'
import { getSnapToleranceCm } from '../../core/snap'
import { readCameraViewport } from '../../scene/cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from '../../scene/drawSurfaceEvents'
import { useCadStore } from '../../store/cadStore'
import { isEditorReadOnly } from '../../store/editorReadOnly'
import { useUiStore } from '../../store/uiStore'
import { getElementAttachMode } from '../core/attachModes'
import {
  isFixedCompanionValve,
  resolveDropAttachment,
  resolveOnLineSlide,
  type OnLineSlideTarget,
} from '../core/elementAttach'
import { getElementLabelOffsetCm, pickElementLabelAt } from '../core/elementLabel'
import { getElementsInRect, pickElementAt } from '../core/elementPicking'
import { pruneElementIds } from '../core/elementSelection'
import { getTargetElementId } from '../core/installationModel'
import type { InstallationElement } from '../core/installationModel'
import { INSTALLATION_SELECTION_TOOL_ID } from '../core/installationTools'
import {
  getFloorLinkAnchoredPointIds,
  getLinkedLinePoints,
  getPortAnchoredPointIds,
} from '../core/lineCornerLink'
import { isSamePoint } from '../core/lineGeometry'
import { isGasCarryingKind } from '../core/lineKinds'
import { getLinesInRect, isPlanZeroLengthLine, pickLineAt } from '../core/linePicking'
import { findNearestLineCorner, findNearestPointOnLines } from '../core/lineSnap'
import { resolveMoveTargets } from '../core/moveTargets'
import {
  findNearestFreePort,
  findNearestInlineArmature,
  isLineEndConnected,
  type InlineArmatureCandidate,
  type LineEndDropTarget,
} from '../core/portSnap'
import type { InstallationElementType } from '../core/symbolMetadata'
import { findNearestWallCorner, findNearestWallFace } from '../core/wallSnap'
import {
  copySelectionToClipboard,
  cutSelectionToClipboard,
  pasteClipboard,
} from '../store/clipboardActions'
import { requestSelectionDeletion } from '../store/deletionActions'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

const PRIMARY_BUTTON = 0

/** Hattın iki ucu — porta yapışma taraması ikisini de dener. */
const LINE_ENDS = ['start', 'end'] as const

type LineEndDrop = { lineId: Id; pointId: Id; target: LineEndDropTarget }

/** Paylaşılan boş dizi: hatsız sürüklemede her çağrıda yeni dizi ayırmaz. */
const NO_LINE_IDS: readonly Id[] = []

type SelectionGrab = {
  /** Sürüklenen seçimdeki elemanlar; seçimin tamamı aynı kaymayla taşınır. */
  elementIds: Id[]
  /**
   * Sürüklenen seçimdeki hatlar. TEK bir boruya basıp sürüklemek onu HÂLÂ
   * taşımaz (o yalnız köşelerinden taşınır); burası ancak ZATEN SEÇİLİ bir
   * gruba basıldığında dolar — "hepsini seç, hepsini taşı".
   */
  lineIds: Id[]
  /** Basılan elemanın basış anındaki konumu — ızgara ona göre yakalanır. */
  anchorPosition: PlanPoint
  pointerOrigin: PlanPoint
  /**
   * TEK eleman + o eleman boruya oturan (`onLine`) bir armatürse dolu: borunun
   * ŞEKLİ SABİT kalır, eleman yalnız kendi iki komşusu arasında KAYAR (bkz.
   * `resolveOnLineSlide`). `result` her pointermove'da güncellenir, pointerup
   * onu MUTLAK olarak yazar — grup taşımasındaki kayma (delta) mantığından
   * FARKLI bir yazım yolu olduğu için `moveElements` yerine ayrı bir store
   * eylemi (`slideOnLineElement`) kullanılır.
   */
  slide?: {
    elementType: InstallationElementType
    angleDeg: number
    result: OnLineSlideTarget | null
  }
}

/**
 * Bir köşe tutulduğu an sabitlenen YAPISAL bilgi — canlı konum YOK, o
 * `plumbingUiStore.draggingLineCorner`'da (bkz. `architectureUiStore
 * .draggingPoint` ile aynı desen: sürükleme boyunca cadStore'a değil UI
 * store'una yazılır, sahne oradan okur). Yalnız ÇİZERKEN oluşan köşeler
 * sürüklenebilir — hattın gövdesine basmak YENİ köşe AÇMAZ.
 */
type CornerDragTracker = {
  lineId: Id
  pointId: Id
  startPosition: PlanPoint
  /** Sürüklemeden bırakılırsa jest bir TIKLAMADIR; seçim gövdeye basışla aynı kuralla değişir. */
  isAdditive: boolean
  /**
   * Bu köşeyle BİRLİKTE giden noktalar (`getLinkedLinePoints`). Köşe-köşe
   * yakalamasında elenir — yoksa köşe kendi kendine yapışırdı. Sürükleme
   * başında bir kez hesaplanır: jest boyunca bağlar değişmiyor ve her
   * pointermove'da yeniden taramak boşuna iş olurdu.
   */
  linkedPointIds: ReadonlySet<Id>
}

/**
 * Ad etiketi sürüklemesi. Canlı kayma `plumbingUiStore.draggingLabel`'da
 * (köşe sürüklemesiyle aynı desen); bırakılınca TEK `setElementLabelOffset`
 * yazımı olur. Kayma ızgaraya YAKALANMAZ: etiket bir açıklama notudur, çizim
 * geometrisi değil.
 */
type LabelDragTracker = {
  elementId: Id
  startOffsetCm: PlanPoint
  pointerOrigin: PlanPoint
  /** Sürüklemeden bırakılırsa jest bir TIKLAMADIR; etiketin elemanı seçilir. */
  isAdditive: boolean
}

export type SelectionToolState = {
  /** Sürüklenen elemanlar; sahne onları store konumu + kayma ile çizer. */
  draggedElementIds: readonly Id[]
  /** Sürüklenen hatlar; sahne onlara canlı kaymayı group ofseti olarak uygular. */
  draggedLineIds: readonly Id[]
  dragDeltaRef: RefObject<PlanPoint | null>
}

/**
 * Tesisat elemanı seçme, çerçeveyle çoklu seçme, sürükleme ve pano işlemleri.
 * Araç mantığı DrawSurface'e YAZILMAZ (kural 7).
 *
 * Tutma R3F'in ışın olaylarıyla değil, saf geometriyle yapılıyor
 * (core/elementPicking.ts). Sebep: DrawSurface tuvalin kendi DOM olayını
 * dinliyor, R3F de aynı tuvale kendi dinleyicisini kuruyor; "boş alana tıklayınca
 * seçim temizlensin" iki dinleyicinin kayıt SIRASINA bağlı kalırdı. Tek olay
 * kaynağı = kayıt sırasından bağımsız davranış (knowledge/gesture-bus-precedence.md),
 * üstelik tutma sınavı saf fonksiyon olarak test edilebiliyor.
 *
 * Sürükleme boyunca store'a YAZILMAZ: kayma ref'te birikir, pointerup'ta tek
 * moveElements çağrılır → tek markDirty → tek Ctrl+Z.
 */
export function useSelectionTool(): SelectionToolState {
  const camera = useThree((state) => state.camera)
  const activeToolId = useUiStore((state) => state.activeToolId)
  const isSelectionTool = activeToolId === INSTALLATION_SELECTION_TOOL_ID
  // Sürüklenen elemanlar React durumu: jest başına İKİ render (başlangıç + bitiş).
  // Kaymanın kendisi ref'te — her pointermove render tetikleseydi sürükleme takılırdı.
  const [draggedElementIds, setDraggedElementIds] = useState<readonly Id[]>([])
  const [draggedLineIds, setDraggedLineIds] = useState<readonly Id[]>([])
  const dragDeltaRef = useRef<PlanPoint | null>(null)

  useEffect(() => {
    if (!isSelectionTool || !(camera instanceof OrthographicCamera)) return undefined

    let grab: SelectionGrab | undefined
    let cornerDrag: CornerDragTracker | undefined
    let labelDrag: LabelDragTracker | undefined
    let marqueeAnchor: PlanPoint | undefined
    let isAdditiveMarquee = false
    /** İmlecin tuvaldeki son yeri; yapıştırma buraya düşer. İmleç hiç girmediyse null. */
    let lastCursor: PlanPoint | null = null

    const endDrag = () => {
      grab = undefined
      dragDeltaRef.current = null
      setDraggedElementIds([])
      setDraggedLineIds([])
    }

    const endCornerDrag = () => {
      cornerDrag = undefined
      usePlumbingUiStore.getState().setDraggingLineCorner(null)
    }

    const endLabelDrag = () => {
      labelDrag = undefined
      usePlumbingUiStore.getState().setDraggingLabel(null)
    }

    const endMarquee = () => {
      marqueeAnchor = undefined
      isAdditiveMarquee = false
      usePlumbingUiStore.getState().setMarquee(null)
    }

    /** Seçim yalnız aktif katta: hayalet katmanlar zaten seçilemez. */
    const readFloorElements = () => {
      const cad = useCadStore.getState()
      return cad.installationElements.filter((element) => element.floorId === cad.activeFloorId)
    }

    const readFloorLines = () => {
      const cad = useCadStore.getState()
      return cad.installationLines.filter((line) => line.floorId === cad.activeFloorId)
    }

    const readConnections = () => useCadStore.getState().installationConnections

    const readFloorPipeLinks = () => useCadStore.getState().floorPipeLinks

    const getMetadata = (type: Parameters<typeof getLoadedSymbol>[0]) =>
      getLoadedSymbol(type).metadata

    /**
     * Sürüklemenin canlı önizlemesi ne kayacağını commit'in KENDİ hesabından
     * okur (`resolveMoveTargets`): iki taraf ayrı ayrı hesaplasaydı önizleme ile
     * bırakınca oluşan sonuç ayrışır, kullanıcı bunu "yerinden oynadı" diye
     * görürdü. Bütünüyle kayan hatlar tek group ofsetiyle çizilebilir; yalnız bir
     * UCU çekilen komşu hat önizlenmez, bırakınca yerine oturur.
     *
     * Sayaç/cihazla gelen otomatik vana burada FARE ile taşınabilir kümeden
     * elenir — bu eleme yalnız etkileşim katmanında: `moveElements`'i doğrudan
     * çağıran kod (ör. testler) valveyi hâlâ taşıyabilir.
     */
    const startElementDrag = (
      elementIds: readonly Id[],
      lineIds: readonly Id[],
      anchorPosition: PlanPoint,
      pointerOrigin: PlanPoint,
    ) => {
      const lines = readFloorLines()
      const connections = readConnections()
      const elements = readFloorElements()
      const targets = resolveMoveTargets(lines, connections, readFloorPipeLinks(), elementIds, lineIds)
      const movableElementIds = [...targets.elementIds].filter((id) => {
        const type = elements.find((element) => element.id === id)?.type
        return type === undefined || !isFixedCompanionValve(lines, connections, id, type)
      })
      const rigidLines = lines.filter((line) =>
        line.points.every((point) => targets.pointIds.has(point.id)),
      )
      const rigidLineIds = rigidLines.map((line) => line.id)

      grab = {
        elementIds: movableElementIds,
        lineIds: [...lineIds],
        anchorPosition,
        pointerOrigin,
      }
      setDraggedElementIds(movableElementIds)
      setDraggedLineIds(rigidLineIds)
    }

    /**
     * Var olan bir köşeye (yalnız ÇİZERKEN oluşanlardan) basılıp basılmadığını
     * dener — isabet dar (bkz. `getSnapRadiusCm`), gövdeye basışla çakışmaz.
     *
     * Köşede bir ELEMAN PORTUNA oturan uç varsa sürükleme BAŞLAMAZ: o uç
     * konumunu porttan alıyor, yalnız elemanı taşıyarak hareket eder. Bir
     * `FloorPipeLink` ucu da AYNI gerekçeyle çapadır (`getFloorLinkAnchoredPointIds`,
     * kullanıcı isteği 2026-08). Denetim köşenin TAMAMINA bakar
     * (`getLinkedLinePoints` + çapa kümeleri), çünkü basılan uç serbest
     * görünürken aynı köşede buluşan başka bir hattın ucu porta/kata bağlı
     * olabilir — store da aynı kuralı uyguluyor, yoksa sahne
     * sürüklemeyi başlatır ama bırakınca hiçbir şey olmazdı.
     *
     * Hat-hat bağı ENGEL DEĞİL: her sol tık kendi borusunu yazdığı için (K-W)
     * zincirin her ara köşesi böyle bir bağdır; "bağlı uç" sayılsaydı çizilen
     * borunun hiçbir köşesi tutulamazdı.
     */
    const tryStartCornerDrag = (event: DrawSurfacePointerEvent, zoom: number): boolean => {
      const lines = readFloorLines()
      const hit = findNearestPointOnLines(lines, event.planPoint, getSnapRadiusCm(zoom))
      if (hit?.pointId === undefined) return false

      // Plan boyu SIFIR segmentin (kasıtlı dikey bağlantı, K102) ucu sürüklenmez:
      // iki noktası çakışık olduğu için biri çekilince kolon eğik bir plan
      // borusuna dönüşürdü. Görünümü SABİT kalır — kot yalnız panelden/sayısal
      // kutudan değiştirilir. Gövdeye basış SÜZÜLMEZ (aşağıda `selectLine`),
      // yalnız köşe sürüklemesi engellenir.
      const hitLine = lines.find((line) => line.id === hit.lineId)
      if (
        hitLine &&
        hitLine.points.length === 2 &&
        isSamePoint(hitLine.points[0].position, hitLine.points[1].position)
      ) {
        return false
      }

      const connections = readConnections()
      const anchored = getPortAnchoredPointIds(lines, connections)
      const floorLinkAnchored = getFloorLinkAnchoredPointIds(readFloorPipeLinks())
      const linked = getLinkedLinePoints(lines, connections, hit.lineId, hit.pointId)
      if (linked.some((link) => anchored.has(link.pointId) || floorLinkAnchored.has(link.pointId))) return false

      cornerDrag = {
        lineId: hit.lineId,
        pointId: hit.pointId,
        startPosition: hit.position,
        isAdditive: event.shiftKey,
        linkedPointIds: new Set(linked.map((link) => link.pointId)),
      }
      usePlumbingUiStore
        .getState()
        .setDraggingLineCorner({ lineId: hit.lineId, pointId: hit.pointId, position: hit.position })
      return true
    }

    /** Boruyu seçer; Shift seçime ekler/çıkarır (gövdeye ve köşeye basış aynı kural). */
    const selectLine = (lineId: Id, isAdditive: boolean) => {
      const ui = usePlumbingUiStore.getState()
      if (isAdditive) {
        ui.toggleSelectedLine(lineId)
        return
      }
      ui.setSelectedElements([])
      ui.setSelectedLines([lineId])
    }

    /**
     * Elemana basılmadığında: önce ZATEN SEÇİLİ bir gruba mı basıldı, sonra
     * köşe, sonra hat; hiçbiri değilse jest bir çerçeve seçimidir.
     *
     * Seçili gruba basmak köşe düzenlemesinin ÖNÜNE geçer: kullanıcı "hepsini
     * seçtim, hepsini taşıyorum" derken tek bir köşeyi çekmek istemez. Tek
     * boru seçiliyken köşeler yine çalışır (grup değil).
     */
    const handleEmptyPointerDown = (event: DrawSurfacePointerEvent, zoom: number) => {
      const ui = usePlumbingUiStore.getState()
      const lines = readFloorLines()
      const lineId = pickLineAt(
        event.planPoint,
        lines,
        getSnapToleranceCm(zoom),
        ELEVATION_NODE_RING_RADIUS_PX / zoom,
      )
      const isGroupSelection = ui.selectedElementIds.length + ui.selectedLineIds.length > 1

      if (lineId !== null && isGroupSelection && ui.selectedLineIds.includes(lineId)) {
        // Izgaraya yakalanan basış noktası dayanak: seçim kendi içindeki göreli
        // düzenini korur ve kayma ızgara katı olur (eleman sürüklemesiyle aynı).
        const anchor = resolvePlacementPosition(event.planPoint, zoom)
        startElementDrag(ui.selectedElementIds, ui.selectedLineIds, anchor, event.planPoint)
        return
      }

      // Saf dikey boru (K102) köşe sürüklemesinin ÖNÜNE geçer: planda tek nokta
      // olduğu için aynı yerde komşu yatay hattın köşesi de duruyor ve jesti o
      // kapıyordu — kullanıcı halkaya bassa da dikey boru hiç seçilemiyordu.
      const hitLine = lines.find((line) => line.id === lineId)
      if (hitLine && isPlanZeroLengthLine(hitLine)) {
        selectLine(hitLine.id, event.shiftKey)
        return
      }

      if (tryStartCornerDrag(event, zoom)) return

      if (lineId === null) {
        // Boşluğa basış: jest bir çerçevedir. Seçimin temizlenip temizlenmeyeceğine
        // pointerup karar verir — sürükleme eşiğin altında kalırsa bu bir tıklamadır.
        marqueeAnchor = event.planPoint
        isAdditiveMarquee = event.shiftKey
        return
      }

      // Hattın gövdesine basmak yalnız SEÇER — yeni köşe açmaz, boru rijit
      // gövdesinden de sürüklenmez (yalnız çizerken oluşan köşelerinden).
      selectLine(lineId, event.shiftKey)
    }

    /** Bir elemana basıldığında: seçim güncellenir, ardından kaydırma/grup
     *  sürüklemesi başlar (sayaç/cihazla gelen vana hariç, K-W3). */
    const handleElementPointerDown = (event: DrawSurfacePointerEvent, target: InstallationElement) => {
      const ui = usePlumbingUiStore.getState()

      // Shift+tık seçimi değiştirir ve sürükleme BAŞLATMAZ: aynı jestte hem
      // seçime ekleyip hem taşımak, kullanıcının hangisini istediğini belirsiz kılar.
      if (event.shiftKey) {
        ui.toggleSelectedElement(target.id)
        return
      }

      // Seçimin içindeki bir elemana basmak TÜM seçimi (hatlar dahil) KORUR
      // (karma grubu birlikte taşımak için); dışındakine basmak seçimi ona indirger.
      const isTargetAlreadySelected = ui.selectedElementIds.includes(target.id)
      if (!isTargetAlreadySelected) {
        ui.setSelectedElements([target.id])
        ui.setSelectedLines([])
      }
      const elementIds = isTargetAlreadySelected ? ui.selectedElementIds : [target.id]
      // Seçili gruba basıldıysa hatlar da aynı kaymayla gelir ("hepsini seç,
      // hepsini taşı"); seçim dışı bir elemana basmak seçimi ona indirgediği
      // için taşınacak hat kalmaz.
      const lineIds = isTargetAlreadySelected ? ui.selectedLineIds : NO_LINE_IDS

      // Sayaç/cihazla gelen otomatik vana ayrı taşınamaz: seçilir ama
      // sürüklenmez, yalnız ana eleman (sayaç/cihaz) hareket eder. BU KONTROL
      // kaydırmadan ÖNCE yapılır: sayacın vanası (`resolveFreeEndAttachment`)
      // hat uzadığı için İKİ komşuya da sahiptir, yani `resolveOnLineSlide`
      // BAŞARIYLA sonuç dönerdi — sırası ters olsaydı kilit hiç devreye girmezdi.
      if (
        elementIds.length === 1 &&
        isFixedCompanionValve(readFloorLines(), readConnections(), target.id, target.type)
      ) {
        return
      }

      // Tek eleman (grup değilken) + boruya oturan bir armatürse (iki komşusu
      // da varsa) sürükleme KAYDIRMA modunda başlar — grup taşımasında hep
      // SERBEST kayma kullanılır.
      const slideResult =
        elementIds.length === 1
          ? resolveOnLineSlide(
              readFloorLines(),
              getMetadata,
              target.id,
              target.type,
              target.angleDeg,
              event.planPoint,
            )
          : null

      if (slideResult) {
        grab = {
          elementIds: [...elementIds],
          lineIds: [],
          anchorPosition: target.position,
          pointerOrigin: event.planPoint,
          slide: { elementType: target.type, angleDeg: target.angleDeg, result: slideResult },
        }
        setDraggedElementIds(elementIds)
        return
      }

      startElementDrag(elementIds, lineIds, target.position, event.planPoint)
    }

    const handlePointerDown = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return

      const { zoom } = readCameraViewport(camera)

      // Döndürme tutamacı seçili elemanın gövdesinin DIŞINA taşıyor: bu basış
      // yakalanmasa "boşluk" gibi görünüp çerçeve seçimi başlatırdı (mimari
      // taraftaki K44 ile aynı tuzak, bkz. useElementRotateTool.ts).
      if (findSelectedElementRotateHandle(event.planPoint, zoom)) return

      // Etiket elemanların ÜSTÜNDE çizilir; tutma sınavı da aynı sırayla —
      // etiket isabeti eleman isabetinin önüne geçer. Gizli etiket TUTULMAZ:
      // görünmeyen bir şeyi sürüklemek "boşluk seçim yapmıyor" hissi verirdi.
      const labelTarget = useUiStore.getState().isElementLabelsVisible
        ? pickElementLabelAt(event.planPoint, readFloorElements(), getMetadata, zoom)
        : null
      if (labelTarget) {
        const startOffsetCm = getElementLabelOffsetCm(labelTarget, getMetadata(labelTarget.type), zoom)
        labelDrag = {
          elementId: labelTarget.id,
          startOffsetCm,
          pointerOrigin: event.planPoint,
          isAdditive: event.shiftKey,
        }
        usePlumbingUiStore
          .getState()
          .setDraggingLabel({ elementId: labelTarget.id, offsetCm: startOffsetCm })
        return
      }

      const target = pickElementAt(
        event.planPoint,
        readFloorElements(),
        getMetadata,
        getSnapToleranceCm(zoom),
      )

      if (!target) {
        handleEmptyPointerDown(event, zoom)
        return
      }

      handleElementPointerDown(event, target)
    }

    /**
     * Sürüklenen köşenin yeri — HER ZAMAN serbest (ızgaraya kilitli değil, tek
     * kısıtı Ctrl'siz duvara yapışma): önce duvar KÖŞESİ toleranstaysa KESKİN
     * (tam köşe koordinatı), yoksa duvarın GÖVDESİ toleranstaysa yüzüne
     * `getWallEdgeGapCm` payla (ekran pikseli) mıknatıslanır, ikisi de yoksa
     * imleç aynen izlenir (kullanıcı isteği, 2026-08: "borular her zaman
     * serbest hareket edebilsin"). Ctrl duvar yakalamasını da kapatır — tıpkı
     * eleman sürüklemesindeki ızgara kapatma jestiyle aynı.
     */
    const resolveCornerPosition = (
      event: DrawSurfacePointerEvent,
      drag: CornerDragTracker,
    ): PlanPoint => {
      if (event.ctrlKey) return event.planPoint

      const { zoom } = readCameraViewport(camera)
      const radiusCm = getSnapRadiusCm(zoom)
      const gapCm = getWallEdgeGapCm(zoom)
      const cad = useCadStore.getState()
      const floorWalls = cad.walls.filter((wall) => wall.floorId === cad.activeFloorId)

      // Elemanın BOŞ portu (sayacın gözü) her şeyden önce gelir (kullanıcı
      // isteği, 2026-08: "sonradan taşınan boru sayacın gözüne yapışabilsin ve
      // bağlanabilsin") — `useLineTool.resolveSnap`'teki port önceliğinin
      // aynısı: bağlantı kurmak konumlandırmadan güçlü bir niyettir.
      const port = findNearestFreePort(
        readFloorElements(),
        readConnections(),
        getMetadata,
        event.planPoint,
        radiusCm,
      )
      if (port) return port.position

      // Akış geçişli armatürün (vana…) tek bağlantı noktası MERKEZİDİR: boru
      // oraya gelir, armatür ucun üstüne düğüm olarak oturur.
      const armature = findNearestInlineArmature(
        readFloorElements(),
        readFloorLines(),
        event.planPoint,
        radiusCm,
      )
      if (armature) return armature.position

      // Başka bir hat köşesi duvardan ÖNCE gelir (`useLineTool.resolveSnap` ile
      // aynı öncelik).
      // Kotun net kalması buna bağlı: dikey borunun (K102) geride kalan ucuna
      // geri getirilen köşe TAM ÜSTÜNE oturur, kolon yeniden düşeyleşir —
      // yakın duvar yüzü kazansaydı birkaç cm'lik bir kayma kalır ve yükseklik
      // bir daha asla kesinleşmezdi (kullanıcı isteği, 2026-08).
      const lineCorner = findNearestLineCorner(
        readFloorLines(),
        event.planPoint,
        radiusCm,
        drag.linkedPointIds,
      )
      if (lineCorner) return lineCorner.position

      const corner = findNearestWallCorner(floorWalls, cad.points, event.planPoint, radiusCm, gapCm)
      if (corner) return corner

      const face = findNearestWallFace(floorWalls, cad.points, event.planPoint, radiusCm, gapCm)
      if (face) return face

      return event.planPoint
    }

    const handlePointerMove = (event: DrawSurfacePointerEvent) => {
      // Yapıştırma imlecin olduğu yere düşüyor; konum burada birikir (jest
      // sırasında React render'ı tetiklemesin diye state değil kapanış değişkeni).
      lastCursor = event.planPoint

      if (labelDrag) {
        usePlumbingUiStore.getState().setDraggingLabel({
          elementId: labelDrag.elementId,
          offsetCm: {
            x: labelDrag.startOffsetCm.x + (event.planPoint.x - labelDrag.pointerOrigin.x),
            y: labelDrag.startOffsetCm.y + (event.planPoint.y - labelDrag.pointerOrigin.y),
          },
        })
        return
      }

      if (marqueeAnchor) {
        usePlumbingUiStore.getState().setMarquee(toPlanRect(marqueeAnchor, event.planPoint))
        return
      }

      if (cornerDrag) {
        const position = resolveCornerPosition(event, cornerDrag)
        usePlumbingUiStore
          .getState()
          .setDraggingLineCorner({ lineId: cornerDrag.lineId, pointId: cornerDrag.pointId, position })
        return
      }

      if (!grab) return

      if (grab.slide) {
        const resolved = resolveOnLineSlide(
          readFloorLines(),
          getMetadata,
          grab.elementIds[0],
          grab.slide.elementType,
          grab.slide.angleDeg,
          event.planPoint,
        )
        grab.slide.result = resolved
        dragDeltaRef.current = resolved
          ? {
              x: resolved.elementPosition.x - grab.anchorPosition.x,
              y: resolved.elementPosition.y - grab.anchorPosition.y,
            }
          : null
        return
      }

      const rawAnchor = {
        x: grab.anchorPosition.x + (event.planPoint.x - grab.pointerOrigin.x),
        y: grab.anchorPosition.y + (event.planPoint.y - grab.pointerOrigin.y),
      }
      const { zoom } = readCameraViewport(camera)
      // Ctrl ızgarayı kapatır — duvar ve köşe sürüklemesiyle aynı jest. Izgaraya
      // BASILAN eleman yakalanır, kayma ondan türetilir: grup kendi içindeki
      // göreli düzenini korur, her eleman ayrı ayrı ızgaraya çekilmez.
      const snappedAnchor = event.ctrlKey ? rawAnchor : resolvePlacementPosition(rawAnchor, zoom)
      const delta = {
        x: snappedAnchor.x - grab.anchorPosition.x,
        y: snappedAnchor.y - grab.anchorPosition.y,
      }
      dragDeltaRef.current = event.ctrlKey
        ? delta
        : resolvePortMagnet(grab.elementIds, grab.lineIds, delta).delta
    }

    /** Bırakılan uç tam bir gözün ya da armatür merkezinin üstündeyse hedef. */
    const resolveDropTargetAt = (position: PlanPoint): LineEndDropTarget | null => {
      const radiusCm = getSnapRadiusCm(readCameraViewport(camera).zoom)

      const port = findNearestFreePort(
        readFloorElements(),
        readConnections(),
        getMetadata,
        position,
        radiusCm,
      )
      if (port && isSamePoint(port.position, position)) {
        return { kind: 'port', elementId: port.elementId, portId: port.portId }
      }

      const armature = findNearestInlineArmature(
        readFloorElements(),
        readFloorLines(),
        position,
        radiusCm,
      )
      if (armature && isSamePoint(armature.position, position)) {
        return { kind: 'inline', elementId: armature.elementId }
      }

      return null
    }

    /**
     * Taşınan borunun SERBEST bir ucu bir elemanın boş portuna (sayacın gözü)
     * yaklaşırsa kayma o uca oturacak şekilde düzeltilir — ızgara adımı
     * yüzünden birkaç cm yanına düşmesin (kullanıcı isteği, 2026-08).
     * Ctrl mıknatısı da kapatır: ızgarayı kapatan jest yakalamayı da kapatıyor.
     *
     * İlk bulunan aday kazanır: iki uç aynı anda iki ayrı porta çekilseydi tek
     * bir kaymayla ikisi birden sağlanamazdı.
     */
    const resolvePortMagnet = (
      elementIds: readonly Id[],
      lineIds: readonly Id[],
      delta: PlanPoint,
    ): { delta: PlanPoint; drops: LineEndDrop[] } => {
      if (lineIds.length === 0) return { delta, drops: [] }

      const cad = useCadStore.getState()
      const movedElementIds = new Set(elementIds)
      const candidates = readFloorElements().filter((element) => !movedElementIds.has(element.id))
      const radiusCm = getSnapRadiusCm(readCameraViewport(camera).zoom)

      for (const lineId of lineIds) {
        const line = cad.installationLines.find((candidate) => candidate.id === lineId)
        if (!line) continue

        for (const end of LINE_ENDS) {
          const point = end === 'start' ? line.points[0] : line.points.at(-1)
          if (!point || isLineEndConnected(cad.installationConnections, line.id, end)) continue

          const moved = { x: point.position.x + delta.x, y: point.position.y + delta.y }
          const port = findNearestFreePort(
            candidates,
            cad.installationConnections,
            getMetadata,
            moved,
            radiusCm,
          )
          const armature = port
            ? null
            : findNearestInlineArmature(candidates, cad.installationLines, moved, radiusCm)
          const magnet = port ?? armature
          if (!magnet) continue

          return {
            delta: {
              x: delta.x + (magnet.position.x - moved.x),
              y: delta.y + (magnet.position.y - moved.y),
            },
            drops: [
              {
                lineId: line.id,
                pointId: point.id,
                target: port
                  ? { kind: 'port', elementId: port.elementId, portId: port.portId }
                  : { kind: 'inline', elementId: (armature as InlineArmatureCandidate).elementId },
              },
            ],
          }
        }
      }

      return { delta, drops: [] }
    }

    const finishMarquee = (event: DrawSurfacePointerEvent) => {
      if (!marqueeAnchor) return

      const rect = toPlanRect(marqueeAnchor, event.planPoint)
      const wasAdditive = isAdditiveMarquee
      endMarquee()

      const ui = usePlumbingUiStore.getState()

      // Sürükleme eşiğin altındaysa bu bir çerçeve değil, boşluğa TIKLAMADIR:
      // seçim bırakılır. Eşik ekran mesafesi (snap toleransıyla aynı), yoksa
      // uzaklaşınca titrek el bile çerçeve başlatırdı.
      const slopCm = getSnapToleranceCm(readCameraViewport(camera).zoom)
      if (rect.maxX - rect.minX < slopCm && rect.maxY - rect.minY < slopCm) {
        if (!wasAdditive) ui.clearSelection()
        return
      }

      const framedElements = getElementsInRect(rect, readFloorElements(), getMetadata)
      const framedLines = getLinesInRect(rect, readFloorLines())
      if (wasAdditive) {
        ui.addSelectedElements(framedElements)
        ui.addSelectedLines(framedLines)
      } else {
        ui.setSelectedElements(framedElements)
        ui.setSelectedLines(framedLines)
      }
    }

    const handlePointerUp = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return

      if (labelDrag) {
        const drag = labelDrag
        const offsetCm = usePlumbingUiStore.getState().draggingLabel?.offsetCm
        endLabelDrag()
        if (!offsetCm) return

        // Yer değişmediyse jest bir TIKLAMADIR: store'a yazılmaz, etiketin
        // elemanı seçilir (köşe tıklamasının kuralıyla aynı).
        if (offsetCm.x === drag.startOffsetCm.x && offsetCm.y === drag.startOffsetCm.y) {
          const ui = usePlumbingUiStore.getState()
          if (drag.isAdditive) {
            ui.toggleSelectedElement(drag.elementId)
            return
          }
          ui.setSelectedElements([drag.elementId])
          ui.setSelectedLines([])
          return
        }
        useCadStore.getState().setElementLabelOffset(drag.elementId, offsetCm)
        return
      }

      if (marqueeAnchor) {
        finishMarquee(event)
        return
      }

      if (cornerDrag) {
        const drag = cornerDrag
        const position = usePlumbingUiStore.getState().draggingLineCorner?.position
        endCornerDrag()
        if (!position) return

        // Yer değişmediyse jest bir TIKLAMADIR: store'a yazılmaz (yoksa her
        // tıklama geçmişe boş bir adım bırakırdı) ama boru SEÇİLİR — her adımın
        // iki ucu köşe olduğu için (K-W) köşeye basmak "seçemedim" hissi vermemeli.
        if (position.x === drag.startPosition.x && position.y === drag.startPosition.y) {
          selectLine(drag.lineId, drag.isAdditive)
          return
        }
        // Bırakılan uç bir gözün/armatürün üstüne oturduysa bağ da aynı adımda
        // yazılır (tek Ctrl+Z).
        useCadStore
          .getState()
          .moveLinePoint(drag.lineId, drag.pointId, position, resolveDropTargetAt(position))
        return
      }

      if (!grab) return

      if (grab.slide) {
        const elementId = grab.elementIds[0]
        const result = grab.slide.result
        endDrag()

        if (!result) return
        useCadStore
          .getState()
          .slideOnLineElement(
            result.lineId,
            result.pointId,
            elementId,
            result.nodePosition,
            result.elementPosition,
          )
        return
      }

      const { elementIds, lineIds } = grab
      const delta = dragDeltaRef.current
      endDrag()

      // Yer değişmediyse (yalnız seçmek için tıklama) store'a hiç yazılmaz:
      // yoksa her tıklama geçmişe boş bir adım bırakırdı.
      if (!delta || (delta.x === 0 && delta.y === 0)) return
      // Eleman + hat TEK çağrıda: bir sürükleme jesti = bir Ctrl+Z. Porta
      // oturan uçların bağlantısı da aynı çağrıda yazılır.
      useCadStore
        .getState()
        .moveElements(elementIds, lineIds, delta, resolvePortMagnet(elementIds, lineIds, delta).drops)
      attachDroppedElement(elementIds, lineIds)
    }

    /**
     * Bırakılan TEK eleman açık bir boru ucunun dibine düştüyse oraya bağlanır
     * (kullanıcı isteği, 2026-08: "vana sayaç vs de taşıyınca bağlanabilsin").
     * Yeni eleman/vana/boru YARATILMAZ, yalnız bağ kurulur ve gövde uca
     * oturtulur. Zaten bağlı eleman ile çoklu seçim kapsam dışı: ilkinde bağ
     * taşımayla korunuyor, ikincisinde hangi elemanın bağlanacağı belirsiz.
     */
    const attachDroppedElement = (elementIds: readonly Id[], lineIds: readonly Id[]) => {
      if (elementIds.length !== 1 || lineIds.length > 0) return

      const elementId = elementIds[0]
      const cad = useCadStore.getState()
      const element = cad.installationElements.find((candidate) => candidate.id === elementId)
      if (!element) return

      const mode = getElementAttachMode(element.type)
      if (mode !== 'onLine' && mode !== 'lineEnd') return

      const isConnected =
        cad.installationConnections.some(
          (connection) => getTargetElementId(connection.target) === elementId,
        ) ||
        cad.installationLines.some((line) =>
          line.points.some((point) => point.inlineElementId === elementId),
        )
      if (isConnected) return

      const attachment = resolveDropAttachment(
        readFloorLines().filter((line) => isGasCarryingKind(line.kind)),
        cad.installationConnections,
        getMetadata,
        element.type,
        mode,
        element.position,
        getSnapRadiusCm(readCameraViewport(camera).zoom),
      )
      if (attachment) cad.attachDroppedElement(elementId, attachment)
    }

    // Esc sürüklemeyi/çerçeveyi/köşe düzenlemesini iptal eder: store'a
    // yazılmadığı için elemanlar/köşeler eski yerinde kalır.
    const handleCancel = () => {
      endDrag()
      endCornerDrag()
      endLabelDrag()
      endMarquee()
      usePlumbingUiStore.getState().clearSelection()
    }

    /**
     * Klavye drawSurfaceEvents'te taşınmıyor (onCancel yalnız Esc) — mimari
     * tarafındaki seçim dinleyicisiyle aynı desen. İki dinleyici aynı anda
     * çalışmaz: her katman yalnız kendi görünümünde mount edilir.
     * Pano işlerinin kendisi store/clipboardActions.ts'te.
     */
    const handleKeyDown = (keyEvent: KeyboardEvent) => {
      if (isTypingTarget(keyEvent.target)) return
      // Yapıştırma, silme ve çoğaltma çizimi DEĞİŞTİRİR. Kopyalama okuma
      // sayılırdı ama panoya alınan şeyin yapıştırılacak yeri yok; tüm
      // dinleyici susturuluyor.
      if (isEditorReadOnly()) return

      const ui = usePlumbingUiStore.getState()
      const { selectedElementIds, selectedLineIds } = ui
      const isClipboardModifier = keyEvent.ctrlKey || keyEvent.metaKey
      const key = keyEvent.key.toLowerCase()

      if (isClipboardModifier && key === 'v') {
        keyEvent.preventDefault()
        // Kopya İMLECİN olduğu yere düşer; imleç tuvale hiç girmediyse
        // (klavyeyle yapıştırma) pano kendi paylı yerine düşer. Izgara adımı
        // kaymayı yuvarlamak için gider — kopya ızgara dışına düşmesin.
        pasteClipboard(lastCursor, getPlacementStepCm(readCameraViewport(camera).zoom))
        return
      }

      if (keyEvent.key === 'Delete' || keyEvent.key === 'Backspace') {
        if (selectedElementIds.length === 0 && selectedLineIds.length === 0) return

        // Sürükleme ortasında silinirse jest de biter; yoksa pointerup artık var
        // olmayan id'leri taşımaya çalışırdı.
        endDrag()
        // Eleman ve hat TEK çağrıda gider: bir silme jesti = bir Ctrl+Z. Seçimde
        // servis kutusu varsa doğrudan silinmez, önce onay istenir (bkz.
        // deletionActions.ts).
        requestSelectionDeletion(selectedElementIds, selectedLineIds)
        return
      }

      if (selectedElementIds.length === 0 && selectedLineIds.length === 0) return
      if (!isClipboardModifier) return

      if (key === 'c') {
        keyEvent.preventDefault()
        copySelectionToClipboard(selectedElementIds, selectedLineIds)
        return
      }

      if (key === 'x') {
        keyEvent.preventDefault()
        // Sürükleme ortasında kesilirse jest de biter (Delete ile aynı gerekçe).
        endDrag()
        cutSelectionToClipboard(selectedElementIds, selectedLineIds)
      }
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onCancel: handleCancel,
    })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      unsubscribe()
      window.removeEventListener('keydown', handleKeyDown)
      endDrag()
      endLabelDrag()
      endMarquee()
      // Araç değişince veya görünümden çıkınca seçim vurgusu asılı kalmasın.
      usePlumbingUiStore.getState().clearSelection()
    }
  }, [camera, isSelectionTool])

  // Silinen eleman/hat seçimde asılı kalmasın: sahipsiz id sürüklemede var
  // olmayanı taşımaya çalışır (mimari taraftaki pruneSelection ile aynı gerekçe).
  useEffect(
    () =>
      useCadStore.subscribe((state) => {
        const ui = usePlumbingUiStore.getState()

        if (ui.selectedElementIds.length > 0) {
          const pruned = pruneElementIds(
            ui.selectedElementIds,
            state.installationElements.map((element) => element.id),
          )
          if (pruned.length !== ui.selectedElementIds.length) ui.setSelectedElements(pruned)
        }

        if (ui.selectedLineIds.length > 0) {
          const pruned = pruneElementIds(
            ui.selectedLineIds,
            state.installationLines.map((line) => line.id),
          )
          if (pruned.length !== ui.selectedLineIds.length) ui.setSelectedLines(pruned)
        }
      }),
    [],
  )

  return { draggedElementIds, draggedLineIds, dragDeltaRef }
}
