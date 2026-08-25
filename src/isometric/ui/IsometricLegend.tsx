import { useMemo } from 'react'

import { isometricPanelVariants } from './isometricVariants'
import type { DischargeLineKind } from '../../plumbing/core/lineKinds'
import { PIPE_TYPES, isPipeTypeName } from '../../plumbing/core/pipeTypes'
import type { PipeTypeName } from '../../plumbing/core/pipeTypes'
import { useCadStore } from '../../store/cadStore'
import { getIsometricLegendRows } from '../core/isometricLegend'
import { ISOMETRIC_COLORS } from '../scene/isometricTheme'

/** Renk örneği SVG dairesi olarak çiziliyor; boyu metinle aynı hizada kalsın. */
const SWATCH_SIZE_PX = 10

/**
 * Satırın rengi hattın çizildiği renktir: gaz borusunda çaptan (K27), baca ve
 * havalandırmada türden. `getIsometricLineColor` ile aynı kaynaktan okunuyor —
 * ikinci bir eşleme yazılsaydı zamanla açıklama ile çizim ayrışırdı.
 */
function getLegendColorHex(rowId: PipeTypeName | DischargeLineKind): string {
  return isPipeTypeName(rowId) ? PIPE_TYPES[rowId].colorHex : ISOMETRIC_COLORS[rowId]
}

/**
 * Hangi rengin hangi hat olduğunu söyleyen açıklama. Renk ÇAPTAN geliyor
 * (K27) — açıklama olmadan kırmızı bir boru ile mor bir boru arasındaki fark
 * okunamazdı. Dış çap ve toplam boy burada YAZMAZ (K166, kullanıcı isteği):
 * ölçü bilgisi çizim ekranlarında borunun kendi etiketinde.
 *
 * Renk örneği SVG `fill` ÖZNİTELİĞİ ile veriliyor: çap renkleri çalışma
 * zamanında geliyor, Tailwind sınıfı üretilemez ve `style={{...}}` yasak.
 * `fill` bir sunum özniteliği, CSS satır içi stili değil.
 */
export function IsometricLegend() {
  const installationLines = useCadStore((state) => state.installationLines)
  const rows = useMemo(() => getIsometricLegendRows(installationLines), [installationLines])

  if (rows.length === 0) return null

  return (
    <div
      className={`${isometricPanelVariants()} absolute bottom-4 left-4 flex flex-wrap items-center gap-x-3 gap-y-1.5`}
      role="group"
      aria-label="Boru renkleri"
    >
      {rows.map((row) => (
        <span key={row.rowId} className="flex items-center gap-1.5 text-xs text-glass-ink">
          <svg
            width={SWATCH_SIZE_PX}
            height={SWATCH_SIZE_PX}
            viewBox="0 0 10 10"
            aria-hidden
            className="shrink-0"
          >
            <circle cx="5" cy="5" r="5" fill={getLegendColorHex(row.rowId)} />
          </svg>
          {row.label}
        </span>
      ))}
    </div>
  )
}
