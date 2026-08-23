import { useState } from 'react'

import { PropertyNumberField } from './PropertyNumberField'
import {
  getBeamLengthCm,
  isBeamLabelTaken,
  isBeamLabelValid,
  MIN_BEAM_LENGTH_CM,
  MIN_BEAM_THICKNESS_CM,
} from '../../core/beam'
import type { Id } from '../../core/model'
import { getCommonNumber } from '../../core/propertyFields'
import { getSegmentEndAtLength } from '../../core/wall'
import { useCadStore } from '../../store/cadStore'

type BeamPropertiesProps = {
  beamIds: readonly Id[]
}

/**
 * `AreaObjectProperties` ile aynı desen: etiket, kalınlık ve uzunluk yalnız TEK
 * kiriş seçiliyken düzenlenir.
 *
 * Uzunluk artık YAZILABİLİR (K141). "Bir sayı hangi ucun oynayacağını söylemiyor"
 * itirazı bir KURALLA çözüldü: p1 sabit, p2 doğrultu üzerinde kayar.
 */
export function BeamProperties({ beamIds }: BeamPropertiesProps) {
  const beams = useCadStore((state) => state.beams)
  const setBeamThickness = useCadStore((state) => state.setBeamThickness)
  const setBeamLabel = useCadStore((state) => state.setBeamLabel)
  const moveBeamEnd = useCadStore((state) => state.moveBeamEnd)

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

  /** Uzunluğu yazmak = p2 ucunu doğrultu üzerinde taşımak (bkz. alandaki not). */
  const commitLength = (lengthCm: number): boolean => {
    const next = getSegmentEndAtLength(
      { x: sole.x1, y: sole.y1 },
      { x: sole.x2, y: sole.y2 },
      lengthCm,
    )
    if (!next) return false

    return moveBeamEnd(sole.id, 'p2', next)
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

      {/*
       * Uzunluk YAZILABİLİR (kullanıcı isteği). Kural duvarınkiyle AYNI: p1 ucu
       * sabit kalır, p2 mevcut doğrultuda kaydırılır — uç tutamacını sürüklemenin
       * klavye karşılığı. Kiriş kimseyle köşe paylaşmadığı için burada esneyen
       * komşu da yok.
       */}
      <PropertyNumberField
        label="Uzunluk (cm)"
        valueCm={getCommonNumber(selected.map((beam) => Math.round(getBeamLengthCm(beam))))}
        targetKey={targetKey}
        minCm={MIN_BEAM_LENGTH_CM}
        isReadOnly={!isSingle}
        onCommit={isSingle ? commitLength : undefined}
        rejectionMessage="Uzunluk yazılamadı: kirişin yönü yok."
      />
    </div>
  )
}
