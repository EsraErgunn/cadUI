import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import type { PlanRect } from '../../core/selection'
import type {
  ClipboardConnection,
  ClipboardEntry,
  ClipboardPayload,
  LineClipboardEntry,
} from '../core/clipboard'
import type { DischargeDraft } from '../core/dischargeDraft'
import { mergeElementIds, toggleElementId } from '../core/elementSelection'
import type { InstallationLineKind } from '../core/installationModel'
import type { LineChain } from '../core/lineChain'
import { DEFAULT_PIPE_TYPE_NAME, type PipeTypeName } from '../core/pipeTypes'
import type { InstallationElementType } from '../core/symbolMetadata'

/**
 * Bir hat köşesinin (çizerken oluşan köşelerden biri — YENİ köşe açılmaz)
 * sürüklenmesi. `position` CANLI konum: `architectureUiStore.draggingPoint`
 * ile AYNI desen — sahne bu köşeyi geçici konumuyla okur, gerçek hat
 * sürükleme bitene kadar donmaz (bkz. useArchitecturePoints.ts). Bırakılınca
 * `plumbingSlice.moveLinePoint`'e TEK yazımla geçer.
 */
export type LineCornerDrag = { lineId: Id; pointId: Id; position: PlanPoint }

/**
 * Sürüklenen ad etiketi. `offsetCm` CANLI kayma (eleman konumuna göre) —
 * `draggingLineCorner` ile aynı desen: bırakılana kadar cadStore yazılmaz,
 * sahne etiketi geçici kaymasıyla çizer.
 */
export type LabelDrag = { elementId: Id; offsetCm: PlanPoint }

/**
 * Bir elemanın döndürme tutamacıyla sürüklenen açısı VE konumu.
 * `architectureUiStore.areaObjectHandleDrag` ile AYNI desen: bırakılana kadar
 * cadStore'a yazılmaz, sahne elemanı geçici açı+konumuyla çizer. Boruya/porta
 * bağlı elemanlarda `position` de değişir — tutunduğu nokta dünyada sabit
 * kalsın diye (`core/elementRotateHandle.ts` → `getElementAnchorOffset`).
 *
 * `followers`: pivotun DIŞINDA ikinci bir bağlantısı olan eleman (ör.
 * branşmandaki sayaç — hem giriş hem çıkış portundan bağlı) döndürülürken bu
 * ucun bağlı olduğu hat noktasının geçici hedef konumu. `useDraggedCorners`
 * bunu okuyup ilgili hattı oraya çeker — boş dizi çoğu elemanda (tek/hiç
 * tutunma) hiçbir şey değiştirmez.
 */
export type ElementRotateDrag = {
  elementId: Id
  angleDeg: number
  position: PlanPoint
  // Immer draft'ı `readonly` diziyi yazılabilir taslağa çeviremiyor (aynı
  // gerekçe `ApplianceOutlet.position`'da, installationModel.ts) — bu yüzden
  // burada `readonly` DEĞİL.
  followers: { lineId: Id; pointId: Id; position: PlanPoint }[]
}

/**
 * Devam eden çizim: hangi araçla + zincirin nerede kaldığı. Zincirin nasıl
 * ilerleyip geri alınacağı saf fonksiyonlarda (`core/lineChain.ts`), store
 * yalnız sonucu tutar. Noktaların id'si yok: id'ler boru kaydedilirken üretilir.
 */
export type LineDraft = LineChain & {
  kind: InstallationLineKind
}

/**
 * Kalıcı OLMAYAN iki noktalı ölçüm. `end` null iken ölçüm sürüyor: ikinci nokta
 * imleçte, sahnenin ref'inde taşınır — her pointermove store'a yazılsaydı ölçüm
 * boyunca kare başına render olurdu (lastik bantla aynı gerekçe). İkinci tık
 * `end`i sabitler.
 *
 * cadStore'a DEĞİL buraya yazılır: ölçüm çizimin parçası değil, geçici bir
 * okuma. Kaydedilen JSON'a girmez, `markDirty` çağırmaz, Ctrl+Z'ye takılmaz.
 */
export type Measurement = { start: PlanPoint; end: PlanPoint | null }

/**
 * Servis kutusu silme onayı beklerken tutulan kapsam — `deletionActions.ts` →
 * `requestSelectionDeletion` tarafından ÖNCEDEN hesaplanır (kutuya bağlı TÜM
 * gaz ağı, bkz. `core/installationReachability.ts`). Silme iki ayrı yerden
 * tetiklenebildiği için (klavye Delete, panel "Sil" düğmesi) tek karar noktası
 * burada — ikisi ayrı yerel state tutsaydı biri onay istemeyi unuturdu.
 */
export type PendingServiceBoxDeletion = { elementIds: Id[]; lineIds: Id[] }

/**
 * `commitDraftFloorLink` (`floorLinkActions.ts`) hedef kata geçtiğinde
 * bağlantının BİR ucu (mevcut kattaki nokta) belli, karşı taraf henüz yok —
 * hedef katta ilk boru adımı yazılana kadar (`useLineTool.ts` `commitStep`)
 * burada bekler. Yalnız BİR taraf dolu olur: `below*` VEYA `above*`, ikisi
 * birden değil (ayırt edici alan yok, çünkü hangisinin eksik olduğu zaten
 * hangi alanların dolu olduğundan anlaşılır).
 */
export type PendingFloorLink =
  | { belowFloorId: Id; aboveFloorId: Id; belowPointId: Id; position: PlanPoint }
  | { belowFloorId: Id; aboveFloorId: Id; abovePointId: Id; position: PlanPoint }

type PlumbingUiState = {
  selectedElementIds: Id[]
  /** Hatlar ayrı listede: eleman ve hat id'leri aynı evrende ama iki farklı
   *  nesne türü — tek listede tutulsaydı her okuyan tür ayrımını yeniden yapardı. */
  selectedLineIds: Id[]
  setSelectedElements: (elementIds: readonly Id[]) => void
  addSelectedElements: (elementIds: readonly Id[]) => void
  toggleSelectedElement: (elementId: Id) => void
  setSelectedLines: (lineIds: readonly Id[]) => void
  addSelectedLines: (lineIds: readonly Id[]) => void
  toggleSelectedLine: (lineId: Id) => void
  clearSelection: () => void
  /** Sürüklenen seçim çerçevesi; null = çerçeve çizilmiyor. */
  marquee: PlanRect | null
  setMarquee: (rect: PlanRect | null) => void
  /** Devam eden çizim; her adım plumbingSlice.addLine'a ayrı ayrı geçer. */
  draftLine: LineDraft | null
  setDraftLine: (draft: LineDraft | null) => void
  /**
   * Devam eden baca/havalandırma güzergâhı. `draftLine`'dan AYRI alan: kanal
   * bitişte TEK hat olarak yazılıyor, yani taslak köşelerin TAMAMINI taşıyor —
   * boru zincirinin "sıradaki adım nereden başlayacak" durumuyla aynı şey değil.
   */
  dischargeDraft: DischargeDraft | null
  setDischargeDraft: (draft: DischargeDraft | null) => void
  /** Sürüklenen hat köşesi; boş = sürükleme yok. Sahne bunu okuyup ilgili
   *  hattı geçici konumuyla çizer (bkz. `InstallationLineMesh`). */
  draggingLineCorner: LineCornerDrag | null
  setDraggingLineCorner: (drag: LineCornerDrag | null) => void
  /** Sürüklenen ad etiketi; boş = sürükleme yok (bkz. `ElementNameLabels`). */
  draggingLabel: LabelDrag | null
  setDraggingLabel: (drag: LabelDrag | null) => void
  /** Döndürme tutamacıyla sürüklenen serbest eleman; boş = sürükleme yok. */
  elementRotateDrag: ElementRotateDrag | null
  setElementRotateDrag: (drag: ElementRotateDrag | null) => void
  /** İmleç döndürme tutamacının üstündeyken vurgu için; sürüklemeden AYRI. */
  isElementRotateHandleHovered: boolean
  setElementRotateHandleHovered: (isHovered: boolean) => void
  /** Bundan sonra çizilecek hatların çapı. Araç ayarıdır: kaydedilmez, geçmişe girmez. */
  activePipeTypeName: PipeTypeName
  setActivePipeType: (name: PipeTypeName) => void
  elementClipboard: ClipboardEntry[]
  /** Hatlar ayrı listede: yapıştırma ikisini de tek adımda yaratır. */
  lineClipboard: LineClipboardEntry[]
  /** Kopyalananlar ARASINDAKİ bağlar; dizinlere bakar, yapıştırmada id'ye çevrilir. */
  connectionClipboard: ClipboardConnection[]
  /** Aynı panodan kaçıncı yapıştırma — kopyalar üst üste binmesin diye pay bundan gelir. */
  pasteStepCount: number
  copyToClipboard: (payload: ClipboardPayload) => void
  advancePasteStep: () => void
  /** Ekrandaki ölçüm; null = ölçüm yok. Tek temizleme kapısı `clearMeasurement`. */
  measurement: Measurement | null
  startMeasurement: (start: PlanPoint) => void
  finishMeasurement: (end: PlanPoint) => void
  clearMeasurement: () => void
  /** symbolLoader.ts'in doldurduğu asset hataları — sessiz catch yerine görünür durum. */
  assetErrors: Partial<Record<InstallationElementType, string>>
  setAssetError: (type: InstallationElementType, message: string) => void
  /** Onay bekleyen servis kutusu silme kapsamı; boş = diyalog kapalı. */
  pendingServiceBoxDeletion: PendingServiceBoxDeletion | null
  requestServiceBoxDeletion: (request: PendingServiceBoxDeletion) => void
  cancelServiceBoxDeletion: () => void
  /** Yarım kalan kat bağlantısı; boş = beklenen yok (bkz. `PendingFloorLink`). */
  pendingFloorLink: PendingFloorLink | null
  setPendingFloorLink: (link: PendingFloorLink | null) => void
}

/**
 * cadStore DIŞI geçici tesisat UI durumu: kaydedilmez, geçmişe girmez, markDirty
 * çağırmaz (uiStore ile aynı gerekçe — docs/kararlar.md K3/K6).
 *
 * Pano da burada: kes/kopyala/yapıştır arasındaki eleman kopyaları çizimin
 * parçası DEĞİL, oturum boyu süren bir ara bellek. cadStore'a konsaydı
 * kaydedilen JSON'a sızar ve Ctrl+Z panoyu da geri alırdı.
 *
 * Ölçüm de burada: iki noktalı ölçü çizimin parçası değil, geçici bir okuma.
 *
 * TODO(tesisat): hover'lanan port ilgili aşamada buraya eklenecek; imleç konumu
 * store'a değil useRef/useFrame'e yazılır.
 */
export const usePlumbingUiStore = create<PlumbingUiState>()(
  immer((set) => ({
    selectedElementIds: [],
    selectedLineIds: [],
    marquee: null,
    draftLine: null,
    dischargeDraft: null,
    draggingLineCorner: null,
    draggingLabel: null,
    elementRotateDrag: null,
    isElementRotateHandleHovered: false,
    activePipeTypeName: DEFAULT_PIPE_TYPE_NAME,
    elementClipboard: [],
    lineClipboard: [],
    connectionClipboard: [],
    pasteStepCount: 0,
    measurement: null,
    assetErrors: {},
    pendingServiceBoxDeletion: null,
    pendingFloorLink: null,

    setSelectedElements: (elementIds) =>
      set((draft) => {
        draft.selectedElementIds = [...elementIds]
      }),

    addSelectedElements: (elementIds) =>
      set((draft) => {
        draft.selectedElementIds = mergeElementIds(draft.selectedElementIds, elementIds)
      }),

    toggleSelectedElement: (elementId) =>
      set((draft) => {
        draft.selectedElementIds = toggleElementId(draft.selectedElementIds, elementId)
      }),

    setSelectedLines: (lineIds) =>
      set((draft) => {
        draft.selectedLineIds = [...lineIds]
      }),

    addSelectedLines: (lineIds) =>
      set((draft) => {
        draft.selectedLineIds = mergeElementIds(draft.selectedLineIds, lineIds)
      }),

    toggleSelectedLine: (lineId) =>
      set((draft) => {
        draft.selectedLineIds = toggleElementId(draft.selectedLineIds, lineId)
      }),

    clearSelection: () =>
      set((draft) => {
        draft.selectedElementIds = []
        draft.selectedLineIds = []
      }),

    setMarquee: (rect) =>
      set((draft) => {
        draft.marquee = rect
      }),

    // Taslağın nasıl ilerleyeceğine araç hook'u karar verir; store yalnız
    // sonucu tutar (kural 7: araç mantığı sahnede, durum burada).
    setDischargeDraft: (draft) =>
      set((state) => {
        state.dischargeDraft = draft
      }),

    setDraftLine: (line) =>
      set((draft) => {
        draft.draftLine = line
      }),

    setDraggingLineCorner: (drag) =>
      set((draft) => {
        draft.draggingLineCorner = drag
      }),

    setDraggingLabel: (drag) =>
      set((draft) => {
        draft.draggingLabel = drag
      }),

    setElementRotateDrag: (drag) =>
      set((draft) => {
        draft.elementRotateDrag = drag
      }),

    setElementRotateHandleHovered: (isHovered) =>
      set((draft) => {
        draft.isElementRotateHandleHovered = isHovered
      }),

    setActivePipeType: (name) =>
      set((draft) => {
        draft.activePipeTypeName = name
      }),

    // Yeni kopyalama pay sayacını sıfırlar: pay, o panonun kaçıncı kez
    // yapıştırıldığını sayar, uygulama açıldığından beri kaç kopyalama olduğunu değil.
    copyToClipboard: (payload) =>
      set((draft) => {
        draft.elementClipboard = [...payload.elements]
        draft.lineClipboard = [...payload.lines]
        draft.connectionClipboard = [...payload.connections]
        draft.pasteStepCount = 0
      }),

    advancePasteStep: () =>
      set((draft) => {
        draft.pasteStepCount += 1
      }),

    startMeasurement: (start) =>
      set((draft) => {
        draft.measurement = { start, end: null }
      }),

    // Başlamamış ölçüm bitmez: ikinci nokta her zaman bir ilk noktadan sonra gelir.
    finishMeasurement: (end) =>
      set((draft) => {
        if (draft.measurement) draft.measurement.end = end
      }),

    clearMeasurement: () =>
      set((draft) => {
        draft.measurement = null
      }),

    setAssetError: (type, message) =>
      set((draft) => {
        draft.assetErrors[type] = message
      }),

    requestServiceBoxDeletion: (request) =>
      set((draft) => {
        draft.pendingServiceBoxDeletion = request
      }),

    cancelServiceBoxDeletion: () =>
      set((draft) => {
        draft.pendingServiceBoxDeletion = null
      }),

    setPendingFloorLink: (link) =>
      set((draft) => {
        draft.pendingFloorLink = link
      }),
  })),
)
