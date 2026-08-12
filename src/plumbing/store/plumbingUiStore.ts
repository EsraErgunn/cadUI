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
    activePipeTypeName: DEFAULT_PIPE_TYPE_NAME,
    elementClipboard: [],
    lineClipboard: [],
    connectionClipboard: [],
    pasteStepCount: 0,
    measurement: null,
    assetErrors: {},

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
  })),
)
