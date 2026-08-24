import { useEffect, useRef } from 'react'

import { ADMIN_CHECKBOX } from '../adminVariants'

const SELECT_ALL_LABEL = 'Tümünü Seç'

/** Birim seçeneği: uca KİMLİK gidiyor, ekranda etiket görünüyor. */
export interface UnitOption {
  id: number
  label: string
}

interface UnitCheckboxListProps {
  /** Alanları birbirinden ayıran önek; aynı ekranda birden çok liste var. */
  idPrefix: string
  units: UnitOption[]
  selected: number[]
  error?: string
  onChange: (unitIds: number[]) => void
}

/**
 * Projenin birimleri (gereksinim 11). Seçenekler PROJEDEN geliyor, sabit değil.
 *
 * "Tümünü Seç" üç durumlu: hiçbiri / bir kısmı (belirsiz) / hepsi. Belirsiz hâl
 * yalnız JS ile verilebiliyor (`indeterminate` bir HTML özniteliği değil), bu
 * yüzden ref üzerinden yazılıyor.
 */
export function UnitCheckboxList({
  idPrefix,
  units,
  selected,
  error,
  onChange,
}: UnitCheckboxListProps) {
  const selectAllRef = useRef<HTMLInputElement>(null)
  const isAllSelected = units.length > 0 && selected.length === units.length
  const errorId = `${idPrefix}-units-error`

  useEffect(() => {
    if (selectAllRef.current === null) return
    selectAllRef.current.indeterminate = selected.length > 0 && !isAllSelected
  }, [isAllSelected, selected.length])

  const toggleUnit = (unitId: number) => {
    const isSelected = selected.includes(unitId)
    // Sıra kaynak listeyle aynı kalsın: seçim sırasına göre eklenseydi aynı iki
    // birim, işaretleme sırasına göre farklı sırayla kaydedilirdi.
    onChange(
      isSelected
        ? selected.filter((id) => id !== unitId)
        : units
            .filter((unit) => unit.id === unitId || selected.includes(unit.id))
            .map((unit) => unit.id),
    )
  }

  return (
    <fieldset
      className="flex min-w-40 flex-col gap-1.5 rounded-lg border border-edge p-3"
      aria-describedby={error === undefined ? undefined : errorId}
    >
      <legend className="px-1 text-xs font-medium text-ink-muted">Birimler</legend>

      <label className="flex items-center gap-2 text-sm font-medium text-ink">
        <input
          ref={selectAllRef}
          type="checkbox"
          checked={isAllSelected}
          disabled={units.length === 0}
          onChange={() => onChange(isAllSelected ? [] : units.map((unit) => unit.id))}
          className={ADMIN_CHECKBOX}
        />
        {SELECT_ALL_LABEL}
      </label>

      {units.map((unit) => (
        <label key={unit.id} className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={selected.includes(unit.id)}
            onChange={() => toggleUnit(unit.id)}
            className={ADMIN_CHECKBOX}
          />
          {unit.label}
        </label>
      ))}

      {error !== undefined && (
        <p id={errorId} role="alert" className="text-xs text-danger-ink">
          {error}
        </p>
      )}
    </fieldset>
  )
}
