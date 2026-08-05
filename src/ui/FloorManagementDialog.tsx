import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { DialogShell } from './controls/DialogShell'
import { chromeButtonVariants } from './controls/buttonVariants'
import { canRemoveFloor, isFloorNameTaken, isFloorNameValid } from '../core/floors'
import type { Id } from '../core/model'
import { useCadStore } from '../store/cadStore'

type FloorManagementDialogProps = {
  onClose: () => void
}

/**
 * Kat Yönetimi (KK-13). Liste EN ÜST kat başta gösterilir — kullanıcı binayı
 * kesitten görüyor. Store'daki dizi ise en alt kat başta; çeviri yalnız burada
 * yapılır, veri yapısı görüntü için ters çevrilmez.
 */
export function FloorManagementDialog({ onClose }: FloorManagementDialogProps) {
  const floors = useCadStore((state) => state.floors)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const addFloor = useCadStore((state) => state.addFloor)
  const renameFloor = useCadStore((state) => state.renameFloor)
  const removeFloor = useCadStore((state) => state.removeFloor)
  const moveFloor = useCadStore((state) => state.moveFloor)
  const setActiveFloor = useCadStore((state) => state.setActiveFloor)

  const [pendingRemovalId, setPendingRemovalId] = useState<Id | null>(null)
  const [draftNames, setDraftNames] = useState<Record<Id, string>>({})

  const isRemovable = canRemoveFloor(floors)
  const topDownFloors = [...floors].reverse()

  const commitName = (floorId: Id) => {
    const draft = draftNames[floorId]
    if (draft !== undefined) renameFloor(floorId, draft)
    setDraftNames((current) => {
      const next = { ...current }
      delete next[floorId]
      return next
    })
  }

  const nameErrorOf = (floorId: Id): string | undefined => {
    const draft = draftNames[floorId]
    if (draft === undefined) return undefined
    if (!isFloorNameValid(draft)) return 'Kat adı boş olamaz.'
    if (isFloorNameTaken(floors, draft, floorId)) return 'Bu ad başka bir katta kullanılıyor.'
    return undefined
  }

  return (
    <DialogShell title="Kat Yönetimi" onClose={onClose}>
      <ul className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {topDownFloors.map((floor) => {
          const nameError = nameErrorOf(floor.id)
          const isPendingRemoval = pendingRemovalId === floor.id

          return (
            <li key={floor.id} className="border-b border-edge/60 py-2 last:border-b-0">
              <div className="flex items-center gap-2">
                <input
                  value={draftNames[floor.id] ?? floor.name}
                  onChange={(event) =>
                    setDraftNames((current) => ({ ...current, [floor.id]: event.target.value }))
                  }
                  onBlur={() => commitName(floor.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur()
                  }}
                  aria-label={`${floor.name} adı`}
                  aria-invalid={nameError !== undefined}
                  className="min-w-0 flex-1 rounded-md border border-edge bg-surface px-2 py-1 text-sm text-ink aria-[invalid=true]:border-danger"
                />

                {floor.id === activeFloorId ? (
                  <span className="shrink-0 rounded-md bg-surface-sunken px-2 py-1 text-xs text-ink-muted">
                    Aktif
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setActiveFloor(floor.id)}
                    className={chromeButtonVariants()}
                  >
                    Geç
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => moveFloor(floor.id, 'up')}
                  aria-label={`${floor.name} bir sıra yukarı`}
                  className={chromeButtonVariants({ shape: 'icon' })}
                >
                  <ChevronUp size={16} strokeWidth={1.8} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => moveFloor(floor.id, 'down')}
                  aria-label={`${floor.name} bir sıra aşağı`}
                  className={chromeButtonVariants({ shape: 'icon' })}
                >
                  <ChevronDown size={16} strokeWidth={1.8} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setPendingRemovalId(floor.id)}
                  disabled={!isRemovable}
                  title={isRemovable ? undefined : 'Projede en az bir kat kalmalı'}
                  aria-label={`${floor.name} sil`}
                  className={chromeButtonVariants({ shape: 'icon' })}
                >
                  <Trash2 size={16} strokeWidth={1.8} aria-hidden />
                </button>
              </div>

              {nameError && (
                <p role="alert" className="mt-1 text-xs text-danger">
                  {nameError}
                </p>
              )}

              {/* Onay iç içe diyalog değil satır içi: modal üstüne modal, odak
                  tuzağını iki kez kurmayı gerektirir ve klavye sırası karışır. */}
              {isPendingRemoval && (
                <div role="alert" className="mt-2 rounded-md bg-surface-sunken px-3 py-2">
                  <p className="text-xs text-ink-muted">
                    <b className="text-ink">{floor.name}</b> silinecek. Bu kattaki mimari ve
                    tesisat çizimleri de silinir.
                  </p>
                  <div className="mt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPendingRemovalId(null)}
                      className={chromeButtonVariants()}
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        removeFloor(floor.id)
                        setPendingRemovalId(null)
                      }}
                      className="inline-flex h-8 items-center rounded-md bg-danger px-3 text-sm text-surface"
                    >
                      Sil
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="flex shrink-0 items-center justify-between border-t border-edge px-5 py-3">
        <button type="button" onClick={() => addFloor()} className={chromeButtonVariants()}>
          <Plus size={16} strokeWidth={1.8} aria-hidden />
          Boş Kat Ekle
        </button>
        <button type="button" onClick={onClose} className={chromeButtonVariants()}>
          Kapat
        </button>
      </div>
    </DialogShell>
  )
}
