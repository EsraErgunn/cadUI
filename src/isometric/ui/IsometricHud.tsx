import { RotateCcw } from 'lucide-react'

import { IsometricAngleSlider } from './IsometricAngleSlider'
import {
  isometricActionVariants,
  isometricPanelVariants,
  isometricPresetVariants,
} from './isometricVariants'
import { useCadStore } from '../../store/cadStore'
import {
  ISOMETRIC_ALPHA_MAX_DEG,
  ISOMETRIC_ALPHA_MIN_DEG,
  ISOMETRIC_ANGLES_DEFAULT,
  ISOMETRIC_ANGLE_PRESETS,
} from '../core/isometricProjection'
import type { IsometricAngles } from '../core/isometricProjection'
import { useIsometricUiStore } from '../store/isometricUiStore'

const BETA_MIN_DEG = 0
const BETA_MAX_DEG = 359

/** Hazır açı seçili sayılırken tam eşitlik aranmaz: kaydırıcı tam sayıya yuvarlar. */
const PRESET_MATCH_TOLERANCE_DEG = 0.5

function isPresetActive(angles: IsometricAngles, preset: IsometricAngles): boolean {
  return (
    Math.abs(angles.alphaDeg - preset.alphaDeg) < PRESET_MATCH_TOLERANCE_DEG &&
    Math.abs(angles.betaDeg - preset.betaDeg) < PRESET_MATCH_TOLERANCE_DEG
  )
}

/**
 * İzometrik görünümün ayar paneli: bakış açısı ve varsayılana dönüş.
 * "Katları aralıklandırma" kaydırıcısı kullanıcı isteğiyle KALDIRILDI — bina
 * gerçek kotlarında, bitişik çizilir.
 *
 * Tuvalin ÜSTÜNDE yüzer, genişliğini daraltmaz — çizim alanı bir ayar
 * sütununa bölünseydi izometriğin tek işi olan "tüm binayı tek parça göster"
 * kuralı ekranda daralırdı.
 */
export function IsometricHud() {
  const angles = useCadStore((state) => state.isometricAngles)
  const setIsometricAngles = useCadStore((state) => state.setIsometricAngles)
  const resetIsometricPositions = useCadStore((state) => state.resetIsometricPositions)

  const setCameraLocked = useIsometricUiStore((state) => state.setCameraLocked)

  /**
   * Tek düğme her şeyi varsayılana döndürür: elle yerleştirmeler (dal ayırma +
   * etiket konumları), bakış açısı ve kamera kilidi. Yalnız konumları temizleyip
   * açıyı bırakmak yarım bir "sıfırlama" olurdu — kullanıcı kaybolduğunda tek
   * tıkla bilinen bir başlangıca dönmek istiyor.
   */
  const resetToDefaults = () => {
    resetIsometricPositions()
    setIsometricAngles(ISOMETRIC_ANGLES_DEFAULT)
    setCameraLocked(true)
  }

  return (
    <div
      className={`${isometricPanelVariants()} absolute top-4 right-4 flex w-56 flex-col gap-3`}
      role="group"
      aria-label="İzometrik görünüm ayarları"
    >
      <IsometricAngleSlider
        label="α — Eğim"
        accessibleLabel="Bakış eğimi (alfa)"
        valueDeg={angles.alphaDeg}
        minDeg={ISOMETRIC_ALPHA_MIN_DEG}
        maxDeg={ISOMETRIC_ALPHA_MAX_DEG}
        unitLabel="°"
        onChange={(alphaDeg) => setIsometricAngles({ ...angles, alphaDeg })}
      />

      <IsometricAngleSlider
        label="β — Dönüş"
        accessibleLabel="Bakış dönüşü (beta)"
        valueDeg={angles.betaDeg}
        minDeg={BETA_MIN_DEG}
        maxDeg={BETA_MAX_DEG}
        unitLabel="°"
        onChange={(betaDeg) => setIsometricAngles({ ...angles, betaDeg })}
      />

      <div className="flex flex-wrap gap-1" role="group" aria-label="Hazır bakış açıları">
        {ISOMETRIC_ANGLE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={isometricPresetVariants({
              isSelected: isPresetActive(angles, preset.angles),
            })}
            aria-pressed={isPresetActive(angles, preset.angles)}
            onClick={() => setIsometricAngles(preset.angles)}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <button type="button" className={isometricActionVariants()} onClick={resetToDefaults}>
        <RotateCcw size={13} strokeWidth={1.8} aria-hidden />
        Varsayılana döndür
      </button>
    </div>
  )
}
