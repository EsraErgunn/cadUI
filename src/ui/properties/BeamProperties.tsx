import { useState } from 'react'

import { PropertyNumberField } from './PropertyNumberField'
import {
  getBeamLengthCm,
  isBeamLabelTaken,
  isBeamLabelValid,
  MIN_BEAM_THICKNESS_CM,
} from '../../core/beam'
import type { Id } from '../../core/model'
import { getCommonNumber } from '../../core/propertyFields'
import { useCadStore } from '../../store/cadStore'

type BeamPropertiesProps = {
  beamIds: readonly Id[]
}

/**
 * `AreaObjectProperties` ile aynı desen: etiket yalnız TEK kirişte düzenlenir,
 * kalınlık her seçilide.
 *
 * Uzunluk SALT OKUNUR: kirişin boyu iki ucunun konumundan türüyor ve bir sayı
 * hangi ucun oynayacağını söylemiyor. Uzatma tuvalde, uç tutamacıyla yapılır.
 */
export function BeamProperties({ beamIds }: BeamPropertiesProps) {
  const beams = useCadStore((state) => state.beams)
  const setBeamThickness = useCadStore((state) => state.setBeamThickness)
  const setBeamLabel = useCadStore((state) => state.setBeamLabel)

  const selected = beams.filter((beam) => beamIds.includes(beam.id))
  const [labelDraft, setLabelDraft] = useState<string | undefined>(undefined)

  if (selected.length === 0) return null

  const targetKey = `beams-${beamIds.join(',')}`
  const [sole] = selected
  const isSingle = selected.length === 1

  const labelText = labelDraft ?? (isSingle ? sole.label : '')
  const labelError = (() => {
    if (labelDraft === undefined) return undefined
    if (!isBeamLabelValid(labelDraft)) return 'Etiket boş olamaz.'
    if (isBeamLabelTaken(beams, labelDraft, sole.floorId, sole.id)) {
      return 'Bu etiket bu katta kullanılıyor.'
    }
    return undefined
  })()

  const commitLabel = () => {
    if (labelDraft !== undefined) setBeamLabel(sole.id, labelDraft)
    setLabelDraft(undefined)
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 py-1">
        <span className="text-xs text-ink-muted">Tür</span>
        <span className="text-sm text-ink">Kiriş</span>
      </div>

      {/* Etiket yalnız TEK kirişte düzenlenir: aynı adı iki nesneye vermek zaten
          reddedilir (KK-10), toplu yazım ikincisinde sessizce başarısız olurdu. */}
      <div className="flex items-center justify-between gap-3 py-1">
        <label className="text-xs text-ink-muted" htmlFor="beam-label">
          Etiket
        </label>
        <div className="flex flex-col items-end">
          <input
            id="beam-label"
            value={labelText}
            readOnly={!isSingle}
            placeholder={isSingle ? undefined : 'Farklı'}
            aria-invalid={labelError !== undefined}
            onChange={(event) => setLabelDraft(event.target.value)}
            onBlur={commitLabel}
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.currentTarget.blur()
            }}
            className="w-24 rounded border border-edge bg-surface px-1.5 py-0.5 text-right text-sm text-ink read-only:text-ink-muted aria-[invalid=true]:border-danger"
          />
          {labelError && (
            <span role="alert" className="mt-0.5 text-xs text-danger">
              {labelError}
            </span>
          )}
        </div>
      </div>

      <PropertyNumberField
        label="Kalınlık (cm)"
        valueCm={getCommonNumber(selected.map((beam) => beam.thicknessCm))}
        targetKey={targetKey}
        minCm={MIN_BEAM_THICKNESS_CM}
        isReadOnly={!isSingle}
        onCommit={isSingle ? (thicknessCm) => setBeamThickness(sole.id, thicknessCm) : undefined}
      />

      <div className="flex items-center justify-between gap-3 py-1">
        <span className="text-xs text-ink-muted">Uzunluk (cm)</span>
        <span className="text-sm text-ink-muted">
          {isSingle ? Math.round(getBeamLengthCm(sole)) : 'Farklı'}
        </span>
      </div>
    </div>
  )
}
