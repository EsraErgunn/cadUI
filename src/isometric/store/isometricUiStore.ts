import { create } from 'zustand'

import type { Id } from '../../core/model'

/**
 * Katları düşey olarak ayırma sınırları. Gerçek binada katlar bitişik olduğu
 * için izometrikte hatlar birbirine yapışır; bu kaydırıcı okunurluk içindir ve
 * modele HİÇ yazılmaz.
 */
export const EXPLODED_GAP_MIN_CM = 0
export const EXPLODED_GAP_MAX_CM = 1000
export const EXPLODED_GAP_STEP_CM = 25

/**
 * İzometrik görünümün SALT GÖRÜNTÜ durumu — `cadStore`'un DIŞINDA: kaydedilmez,
 * geri alma geçmişine girmez, projeyi kirletmez (K3). α/β bunun İSTİSNASI ve
 * `isometric/store/isometricSlice.ts`'te yaşıyor: o kullanıcı tercihi olarak
 * projeyle birlikte gidiyor.
 */
type IsometricUiState = {
  /**
   * Kilitliyken kamera α/β'da sabit durur (teknik çizim kipi); açıkken serbest
   * yörünge. Sürükleyerek dal ayırma YALNIZ kilitliyken çalışır — serbest kipte
   * aynı jest kamerayı döndürüyor.
   */
  isCameraLocked: boolean
  explodedGapCm: number
  /** Tıklanan hat tam opak, gerisi solar. Seçim DEĞİL, yalnız vurgulama. */
  highlightedLineId: Id | null
  isLabelsVisible: boolean
  setCameraLocked: (isLocked: boolean) => void
  toggleCameraLock: () => void
  setExplodedGapCm: (gapCm: number) => void
  setHighlightedLineId: (lineId: Id | null) => void
  toggleLabelsVisible: () => void
}

function clampExplodedGapCm(gapCm: number): number {
  return Math.min(EXPLODED_GAP_MAX_CM, Math.max(EXPLODED_GAP_MIN_CM, gapCm))
}

export const useIsometricUiStore = create<IsometricUiState>()((set) => ({
  isCameraLocked: true,
  explodedGapCm: 0,
  highlightedLineId: null,
  isLabelsVisible: true,
  setCameraLocked: (isLocked) => set({ isCameraLocked: isLocked }),
  toggleCameraLock: () => set((state) => ({ isCameraLocked: !state.isCameraLocked })),
  setExplodedGapCm: (gapCm) => set({ explodedGapCm: clampExplodedGapCm(gapCm) }),
  setHighlightedLineId: (lineId) => set({ highlightedLineId: lineId }),
  toggleLabelsVisible: () => set((state) => ({ isLabelsVisible: !state.isLabelsVisible })),
}))
