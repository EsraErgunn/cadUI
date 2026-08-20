import { RotateCcw } from 'lucide-react'

import { IsometricAngleSlider } from './IsometricAngleSlider'
import {
  ISOMETRIC_FIELD_LABEL,
  ISOMETRIC_FIELD_VALUE,
  isometricActionVariants,
  isometricPanelVariants,
  isometricPresetVariants,
  isometricSliderVariants,
} from './isometricVariants'
import { formatLengthM } from '../../core/floorElevation'
import { useCadStore } from '../../store/cadStore'
import {
  ISOMETRIC_ALPHA_MAX_DEG,
  ISOMETRIC_ALPHA_MIN_DEG,
  ISOMETRIC_ANGLE_PRESETS,
} from '../core/isometricProjection'
import type { IsometricAngles } from '../core/isometricProjection'
import {
  EXPLODED_GAP_MAX_CM,
  EXPLODED_GAP_MIN_CM,
  EXPLODED_GAP_STEP_CM,
  useIsometricUiStore,
} from '../store/isometricUiStore'

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
 * İzometrik görünümün ayar paneli: bakış açısı, katları aralıklandırma ve
 * elle yerleştirmeleri sıfırlama.
 *
 * Tuvalin ÜSTÜNDE yüzer, genişliğini daraltmaz — çizim alanı bir ayar
 * sütununa bölünseydi izometriğin tek işi olan "tüm binayı tek parça göster"
 * kuralı ekranda daralırdı.
 */
export function IsometricHud() {
  const angles = useCadStore((state) => state.isometricAngles)
  const setIsometricAngles = useCadStore((state) => state.setIsometricAngles)
  const resetIsometricPositions = useCadStore((state) => state.resetIsometricPositions)

  const explodedGapCm = useIsometricUiStore((state) => state.explodedGapCm)
  const setExplodedGapCm = useIsometricUiStore((state) => state.setExplodedGapCm)

  const explodedLabel =
    explodedGapCm === EXPLODED_GAP_MIN_CM ? 'Bitişik' : `${formatLengthM(explodedGapCm)} m`

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

      <div className="flex flex-col gap-1">
        <span className={ISOMETRIC_FIELD_LABEL}>
          <span>Katlar</span>
          <span className={ISOMETRIC_FIELD_VALUE}>{explodedLabel}</span>
        </span>
        <input
          type="range"
          className={isometricSliderVariants()}
          min={EXPLODED_GAP_MIN_CM}
          max={EXPLODED_GAP_MAX_CM}
          step={EXPLODED_GAP_STEP_CM}
          value={explodedGapCm}
          aria-label="Katları aralıklandırma"
          aria-valuetext={explodedLabel}
          onChange={(event) => setExplodedGapCm(event.target.valueAsNumber)}
        />
      </div>

      <button type="button" className={isometricActionVariants()} onClick={resetIsometricPositions}>
        <RotateCcw size={13} strokeWidth={1.8} aria-hidden />
        İzometrik konumları sıfırla
      </button>
    </div>
  )
}
