import { create } from 'zustand'

import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'

/**
 * Süren dal ayırma. Bırakılana kadar `cadStore`'a YAZILMAZ: her fare
 * hareketinde yazılsaydı tek bir sürükleme onlarca geri alma adımı açardı
 * (`plumbingUiStore`'daki sürükleme durumlarıyla aynı gerekçe).
 */
export type IsometricLineDrag = {
  lineId: Id
  pointId: Id
  deltaCm: PlanPoint
}

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
  /** Tıklanan hat tam opak, gerisi solar. Seçim DEĞİL, yalnız vurgulama. */
  highlightedLineId: Id | null
  isLabelsVisible: boolean
  /** Süren dal ayırma; sahne bunu okuyup CANLI önizler. */
  lineDrag: IsometricLineDrag | null
  setCameraLocked: (isLocked: boolean) => void
  toggleCameraLock: () => void
  setHighlightedLineId: (lineId: Id | null) => void
  toggleLabelsVisible: () => void
  setLineDrag: (drag: IsometricLineDrag | null) => void
}

export const useIsometricUiStore = create<IsometricUiState>()((set) => ({
  isCameraLocked: true,
  highlightedLineId: null,
  isLabelsVisible: true,
  lineDrag: null,
  setCameraLocked: (isLocked) => set({ isCameraLocked: isLocked }),
  toggleCameraLock: () => set((state) => ({ isCameraLocked: !state.isCameraLocked })),
  setHighlightedLineId: (lineId) => set({ highlightedLineId: lineId }),
  toggleLabelsVisible: () => set((state) => ({ isLabelsVisible: !state.isLabelsVisible })),
  setLineDrag: (drag) => set({ lineDrag: drag }),
}))
