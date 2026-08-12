import { Maximize2, Minus, Plus } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'

import { buildFloorPlan, type PlanBounds } from './planGeometry'
import { viewerButtonVariants } from './projectDetailVariants'
import type { Floor, ProjectData } from '../../../core/model'

const MIN_ZOOM_PERCENT = 25
const MAX_ZOOM_PERCENT = 400
const ZOOM_STEP_PERCENT = 25
const BASE_ZOOM_PERCENT = 100

/** Etiket ve çizgi ölçüleri viewBox birimindedir; viewBox cm taşıyor. */
const LABEL_FONT_SIZE_CM = 22
const AREA_OBJECT_STROKE_CM = 4

function clampZoom(percent: number): number {
  return Math.min(MAX_ZOOM_PERCENT, Math.max(MIN_ZOOM_PERCENT, percent))
}

/**
 * Yakınlaştırma viewBox DARALTILARAK yapılıyor, CSS transform ile değil:
 * `style={{...}}` yasak (CLAUDE.md) ve dinamik bir ölçek Tailwind sınıfıyla
 * verilemiyor. viewBox bir SVG özniteliği, CSS değil — kısıtı da çözüyor,
 * çizgi kalınlıklarını da birlikte ölçekliyor.
 */
function zoomedViewBox(bounds: PlanBounds, zoomPercent: number): string {
  const scale = BASE_ZOOM_PERCENT / zoomPercent
  const width = bounds.width * scale
  const height = bounds.height * scale
  const centerX = bounds.minX + bounds.width / 2
  const centerY = bounds.minY + bounds.height / 2

  return `${centerX - width / 2} ${centerY - height / 2} ${width} ${height}`
}

interface PlanViewerProps {
  data: ProjectData
  floor: Floor
  /** "Sayfa 1 / 4" — sayfa = KAT (bkz. ProjectPlanTab). */
  pageLabel: string
  toolbarEnd: React.ReactNode
  pageControls: React.ReactNode
}

export function PlanViewer({
  data,
  floor,
  pageLabel,
  toolbarEnd,
  pageControls,
}: PlanViewerProps) {
  const [zoomPercent, setZoomPercent] = useState(BASE_ZOOM_PERCENT)
  const containerRef = useRef<HTMLDivElement>(null)

  const plan = buildFloorPlan(data, floor.id)

  const toggleFullscreen = useCallback(() => {
    const container = containerRef.current
    if (container === null) return

    // Tarayıcı desteklemiyorsa (veya test ortamında yoksa) sessizce hiçbir şey
    // yapmaz; düğmeyi gizlemek yerine işlevsiz bırakmak daha az sürprizli.
    //
    // `!== null` DEĞİL doğruluk kontrolü: Fullscreen API'sini uygulamayan
    // ortamda `fullscreenElement` `undefined` geliyor ve null karşılaştırması
    // "zaten tam ekrandayız" sanıp çıkış yoluna sapıyordu.
    if (document.fullscreenElement) {
      void document.exitFullscreen?.()
      return
    }

    void container.requestFullscreen?.()
  }, [])

  return (
    <div ref={containerRef} className="flex flex-col rounded-xl border border-edge bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-edge px-4 py-3">
        <button
          type="button"
          onClick={() => setZoomPercent((current) => clampZoom(current - ZOOM_STEP_PERCENT))}
          disabled={zoomPercent <= MIN_ZOOM_PERCENT}
          aria-label="Uzaklaştır"
          className={viewerButtonVariants()}
        >
          <Minus aria-hidden className="size-4" />
        </button>

        <span aria-live="polite" className="min-w-14 text-center text-sm font-semibold tabular-nums text-ink">
          {zoomPercent}%
        </span>

        <button
          type="button"
          onClick={() => setZoomPercent((current) => clampZoom(current + ZOOM_STEP_PERCENT))}
          disabled={zoomPercent >= MAX_ZOOM_PERCENT}
          aria-label="Yakınlaştır"
          className={viewerButtonVariants()}
        >
          <Plus aria-hidden className="size-4" />
        </button>

        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label="Tam ekran"
          className={viewerButtonVariants()}
        >
          <Maximize2 aria-hidden className="size-4" />
        </button>

        {pageControls}

        <span className="text-sm text-ink-muted">{pageLabel}</span>

        <div className="ml-auto">{toolbarEnd}</div>
      </div>

      <div className="overflow-auto bg-surface-sunken p-4">
        <svg
          viewBox={zoomedViewBox(plan.bounds, zoomPercent)}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={`${floor.name} kat planı`}
          className="mx-auto h-90 w-full"
        >
          {plan.areaObjects.map((object) => (
            <polygon
              key={`area-${object.id}`}
              points={object.points}
              strokeWidth={AREA_OBJECT_STROKE_CM}
              className="fill-surface stroke-ink-muted"
            />
          ))}

          {/* Duvar yuvarlak uçlu kapsül olarak çiziliyor (knowledge/capsule-walls.md):
              gönye/union yok, uçlar `round` ile örtüşüyor. */}
          {plan.walls.map((wall) => (
            <line
              key={`wall-${wall.id}`}
              x1={wall.x1}
              y1={wall.y1}
              x2={wall.x2}
              y2={wall.y2}
              strokeWidth={wall.thickness}
              strokeLinecap="round"
              className="stroke-ink"
            />
          ))}

          {/* Açıklık duvarı BÖLMEZ, üstüne kart zemini rengiyle bir delik açar
              (K9: duvar tek parça kalır). Kapı ile pencere çizgi biçiminden
              ayrılıyor — renk tek kanal olmasın. */}
          {plan.openings.map((opening) => (
            <line
              key={`opening-${opening.id}`}
              x1={opening.x1}
              y1={opening.y1}
              x2={opening.x2}
              y2={opening.y2}
              strokeWidth={opening.thickness}
              strokeDasharray={opening.isDoor ? undefined : `${AREA_OBJECT_STROKE_CM * 4}`}
              className="stroke-surface"
            />
          ))}

          {plan.labels.map((label) => (
            <text
              key={`label-${label.id}`}
              x={label.x}
              y={label.y}
              fontSize={LABEL_FONT_SIZE_CM}
              textAnchor="middle"
              className="fill-ink-muted"
            >
              {label.text}
            </text>
          ))}
        </svg>
      </div>
    </div>
  )
}
