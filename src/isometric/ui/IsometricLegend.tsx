import { useMemo } from 'react'

import { isometricPanelVariants } from './isometricVariants'
import { PIPE_TYPES } from '../../plumbing/core/pipeTypes'
import { useCadStore } from '../../store/cadStore'
import { getUsedPipeTypeNames } from '../core/isometricLegend'

/** Renk örneği SVG dairesi olarak çiziliyor; boyu metinle aynı hizada kalsın. */
const SWATCH_SIZE_PX = 10

/**
 * Boru renginin ne anlama geldiğini söyleyen açıklama. Renk ÇAPTAN geliyor
 * (K27) — açıklama olmadan kırmızı bir boru ile mor bir boru arasındaki fark
 * okunamazdı.
 *
 * Renk örneği SVG `fill` ÖZNİTELİĞİ ile veriliyor: çap renkleri çalışma
 * zamanında geliyor, Tailwind sınıfı üretilemez ve `style={{...}}` yasak.
 * `fill` bir sunum özniteliği, CSS satır içi stili değil.
 */
export function IsometricLegend() {
  const installationLines = useCadStore((state) => state.installationLines)
  const usedTypeNames = useMemo(
    () => getUsedPipeTypeNames(installationLines),
    [installationLines],
  )

  if (usedTypeNames.length === 0) return null

  return (
    <div
      className={`${isometricPanelVariants()} absolute bottom-4 left-4 flex flex-wrap items-center gap-x-3 gap-y-1.5`}
      role="group"
      aria-label="Boru çapı renkleri"
    >
      {usedTypeNames.map((typeName) => (
        <span key={typeName} className="flex items-center gap-1.5 text-xs text-glass-ink">
          <svg
            width={SWATCH_SIZE_PX}
            height={SWATCH_SIZE_PX}
            viewBox="0 0 10 10"
            aria-hidden
            className="shrink-0"
          >
            <circle cx="5" cy="5" r="5" fill={PIPE_TYPES[typeName].colorHex} />
          </svg>
          {typeName}
        </span>
      ))}
    </div>
  )
}
