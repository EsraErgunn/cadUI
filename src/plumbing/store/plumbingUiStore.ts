import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import type { PlanRect } from '../../core/selection'
import type { ClipboardEntry, LineClipboardEntry } from '../core/clipboard'
import { mergeElementIds, toggleElementId } from '../core/elementSelection'
import type { InstallationLineKind, LineEndAttachment } from '../core/installationModel'
import { DEFAULT_PIPE_TYPE_NAME, type PipeTypeName } from '../core/pipeTypes'
import type { InstallationElementType } from '../core/symbolMetadata'

/** Devam eden hat. Noktaların id'si YOK: id'ler ancak hat kaydedilirken üretilir. */
export type LineDraft = {
  kind: InstallationLineKind
  points: PlanPoint[]
  /**
   * İlk nokta bir porta ya da mevcut bir boruya konduysa hattın başı oraya
   * bağlanacak. Bitiş hedefi burada TUTULMAZ: hat hedefe tıklandığı anda kapanıyor.
   */
  startTarget: LineEndAttachment | null
}

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
  /** Yarım kalan hat; tamamlanınca plumbingSlice.addLine'a geçer (tek undo adımı). */
  draftLine: LineDraft | null
  setDraftLine: (draft: LineDraft | null) => void
  /** Bundan sonra çizilecek hatların çapı. Araç ayarıdır: kaydedilmez, geçmişe girmez. */
  activePipeTypeName: PipeTypeName
  setActivePipeType: (name: PipeTypeName) => void
  elementClipboard: ClipboardEntry[]
  /** Hatlar ayrı listede: yapıştırma ikisini de tek adımda yaratır. */
  lineClipboard: LineClipboardEntry[]
  /** Aynı panodan kaçıncı yapıştırma — kopyalar üst üste binmesin diye pay bundan gelir. */
  pasteStepCount: number
  copyToClipboard: (
    elementEntries: readonly ClipboardEntry[],
    lineEntries: readonly LineClipboardEntry[],
  ) => void
  advancePasteStep: () => void
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
 * TODO(tesisat): hover'lanan port ve aktif ölçüm ilgili aşamalarda buraya
 * eklenecek; imleç konumu store'a değil useRef/useFrame'e yazılır.
 */
export const usePlumbingUiStore = create<PlumbingUiState>()(
  immer((set) => ({
    selectedElementIds: [],
    selectedLineIds: [],
    marquee: null,
    draftLine: null,
    activePipeTypeName: DEFAULT_PIPE_TYPE_NAME,
    elementClipboard: [],
    lineClipboard: [],
    pasteStepCount: 0,
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

    // Taslağın nasıl büyüyüp küçüleceği core/lineGeometry.ts'te; store yalnız
    // sonucu tutar ki karar saf fonksiyonda test edilebilsin.
    setDraftLine: (line) =>
      set((draft) => {
        draft.draftLine = line
      }),

    setActivePipeType: (name) =>
      set((draft) => {
        draft.activePipeTypeName = name
      }),

    // Yeni kopyalama pay sayacını sıfırlar: pay, o panonun kaçıncı kez
    // yapıştırıldığını sayar, uygulama açıldığından beri kaç kopyalama olduğunu değil.
    copyToClipboard: (elementEntries, lineEntries) =>
      set((draft) => {
        draft.elementClipboard = [...elementEntries]
        draft.lineClipboard = [...lineEntries]
        draft.pasteStepCount = 0
      }),

    advancePasteStep: () =>
      set((draft) => {
        draft.pasteStepCount += 1
      }),

    setAssetError: (type, message) =>
      set((draft) => {
        draft.assetErrors[type] = message
      }),
  })),
)
