import { useState } from 'react'

import { FLOOR_FOCUS_RING, floorBadgeVariants } from './floorVariants'
import { getFloorRangeIds } from '../../core/floorCopyPlan'
import { formatElevationM } from '../../core/floorElevation'
import type { Floor, Id } from '../../core/model'
import { chromeButtonVariants } from '../controls/buttonVariants'

type FloorCopyTargetListProps = {
  floors: readonly Floor[]
  elevationsCm: readonly number[]
  sourceFloorId: Id
  selectedIds: readonly Id[]
  hasContent: (floorId: Id) => boolean
  onChange: (selectedIds: Id[]) => void
}

/**
 * Hedef kat listesi (madde 17). Kaynak kat listede PASİF gösterilir, gizlenmez:
 * kaybolan bir satır kullanıcıya "kat nereye gitti" sorusu sordurur.
 *
 * Liste EN ÜST kat başta — pencerenin ve Katlar penceresinin okuma yönüyle aynı.
 */
export function FloorCopyTargetList({
  floors,
  elevationsCm,
  sourceFloorId,
  selectedIds,
  hasContent,
  onChange,
}: FloorCopyTargetListProps) {
  const selectableFloors = floors.filter((floor) => floor.id !== sourceFloorId)
  const [rangeFromId, setRangeFromId] = useState<Id | ''>('')
  const [rangeToId, setRangeToId] = useState<Id | ''>('')

  const applyRange = () => {
    if (rangeFromId === '' || rangeToId === '') return
    const rangeIds = getFloorRangeIds(floors, rangeFromId, rangeToId).filter(
      (id) => id !== sourceFloorId,
    )
    // Aralık mevcut seçime EKLENİR, onu değiştirmez: kullanıcı iki aralığı
    // birleştirebilsin.
    onChange([...new Set([...selectedIds, ...rangeIds])])
  }

  const toggle = (floorId: Id) => {
    onChange(
      selectedIds.includes(floorId)
        ? selectedIds.filter((id) => id !== floorId)
        : [...selectedIds, floorId],
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-ink-muted">Aralık</span>
        <RangeSelect
          label="Aralık başlangıcı"
          floors={selectableFloors}
          value={rangeFromId}
          onChange={setRangeFromId}
        />
        <span aria-hidden className="text-ink-muted">
          –
        </span>
        <RangeSelect
          label="Aralık bitişi"
          floors={selectableFloors}
          value={rangeToId}
          onChange={setRangeToId}
        />
        <button type="button" onClick={applyRange} className={chromeButtonVariants()}>
          Seç
        </button>

        <span className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => onChange(selectableFloors.map((floor) => floor.id))}
            className={chromeButtonVariants()}
          >
            Tümünü seç
          </button>
          <button type="button" onClick={() => onChange([])} className={chromeButtonVariants()}>
            Temizle
          </button>
        </span>
      </div>

      <ul className="max-h-56 overflow-y-auto rounded-md border border-edge">
        {[...floors].reverse().map((floor) => {
          const index = floors.findIndex((candidate) => candidate.id === floor.id)
          const isSource = floor.id === sourceFloorId

          return (
            <li key={floor.id} className="border-b border-edge/60 last:border-b-0">
              <label
                className={`flex items-center gap-2 px-3 py-1.5 text-sm ${
                  isSource ? 'text-ink-disabled' : 'text-ink hover:bg-surface-sunken'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(floor.id)}
                  disabled={isSource}
                  onChange={() => toggle(floor.id)}
                  className={FLOOR_FOCUS_RING}
                />
                {floor.name}
                {isSource && (
                  <span className="text-xs text-ink-disabled">· kaynak kat, seçilemez</span>
                )}
                <span className="ml-auto tabular-nums text-xs text-ink-muted">
                  {formatElevationM(elevationsCm[index])}
                </span>
                {!isSource && (
                  <span
                    className={floorBadgeVariants({
                      tone: hasContent(floor.id) ? 'content' : 'empty',
                    })}
                  >
                    {hasContent(floor.id) ? 'İçerik var' : 'Boş'}
                  </span>
                )}
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function RangeSelect({
  label,
  floors,
  value,
  onChange,
}: {
  label: string
  floors: readonly Floor[]
  value: Id | ''
  onChange: (value: Id | '') => void
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}
      className={`rounded-md border border-edge bg-surface px-2 py-1 text-sm text-ink ${FLOOR_FOCUS_RING}`}
    >
      <option value="">Seçiniz…</option>
      {[...floors].reverse().map((floor) => (
        <option key={floor.id} value={floor.id}>
          {floor.name}
        </option>
      ))}
    </select>
  )
}
