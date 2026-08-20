import type { StateCreator } from 'zustand'

// cadStore ↔ bu slice karşılıklı import eder; bu taraf tip-only olduğu için
// derlemede silinir ve çalışma zamanında döngü oluşmaz (K17).
import type { CadState } from '../../store/cadStore'
import {
  ISOMETRIC_ANGLES_DEFAULT,
  clampIsometricAngles,
} from '../core/isometricProjection'
import type { IsometricAngles } from '../core/isometricProjection'

export type IsometricSlice = {
  /**
   * İzometrik izdüşüm açıları. Projeyle birlikte KAYDEDİLİR (WebCAD de
   * `isometric: {alpha, beta}` olarak saklıyor) ama `PersistedContent`'e
   * GİRMEZ: açı oynatmak bir çizim değişikliği değil, bir bakış açısıdır ve
   * "kaydedilmemiş değişiklik" uyarısı üretmemeli. `activeFloorId` ile birebir
   * aynı davranış — o da JSON'a giriyor, kirli işaretine girmiyor.
   */
  isometricAngles: IsometricAngles
  setIsometricAngles: (angles: IsometricAngles) => void
}

/**
 * `markDirty` ÇAĞIRMAZ ve zundo geçmişine düşmez (`history.ts` →
 * `partializeProjectState` bu alanı taşımıyor): kullanıcının Ctrl+Z'si çizimini
 * geri almalı, kamerasını değil.
 */
export const createIsometricSlice: StateCreator<
  CadState,
  [['zustand/immer', never]],
  [],
  IsometricSlice
> = (set) => ({
  isometricAngles: ISOMETRIC_ANGLES_DEFAULT,
  setIsometricAngles: (angles) => {
    const clamped = clampIsometricAngles(angles)
    set((draft) => {
      draft.isometricAngles = clamped
    })
  },
})
