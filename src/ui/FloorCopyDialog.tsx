import { useState } from 'react'

import { DialogShell } from './controls/DialogShell'
import { chromeButtonVariants } from './controls/buttonVariants'
import { isFloorEmpty } from '../core/floorClone'
import type { Id } from '../core/model'
import { useCadStore } from '../store/cadStore'

type FloorCopyDialogProps = {
  onClose: () => void
}

/**
 * Kat Kopyalama (KK-14). Hedef listesi yalnız BOŞ katları gösterir: dolu kata
 * kopyalama store'da zaten reddediliyor, seçtirip sonra reddetmek kullanıcıyı
 * sebebini aramaya bırakırdı.
 */
export function FloorCopyDialog({ onClose }: FloorCopyDialogProps) {
  const floors = useCadStore((state) => state.floors)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const copyFloor = useCadStore((state) => state.copyFloor)
  const setActiveFloor = useCadStore((state) => state.setActiveFloor)
  // Her diziye AYRI abone olunur, nesne render içinde kurulur. Tek selector'da
  // `{ points, walls, … }` döndürmek her çağrıda yeni nesne üretir, `Object.is`
  // hep false döner ve bileşen sonsuz render olur — knowledge/snap-contract.md'deki
  // abonelik tuzağının ta kendisi.
  const points = useCadStore((state) => state.points)
  const walls = useCadStore((state) => state.walls)
  const openings = useCadStore((state) => state.openings)
  const rooms = useCadStore((state) => state.rooms)
  const symbols = useCadStore((state) => state.symbols)
  const projectData = { points, walls, openings, rooms, symbols }

  const [sourceFloorId, setSourceFloorId] = useState<Id>(activeFloorId)
  const [targetFloorId, setTargetFloorId] = useState<Id | null>(null)
  const [isArchitectureIncluded, setIsArchitectureIncluded] = useState(true)
  const [isInstallationIncluded, setIsInstallationIncluded] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const emptyFloors = floors.filter(
    (floor) => floor.id !== sourceFloorId && isFloorEmpty(projectData, floor.id),
  )
  const isSelectionValid =
    targetFloorId !== null && (isArchitectureIncluded || isInstallationIncluded)

  const handleCopy = () => {
    if (targetFloorId === null) return

    const isCopied = copyFloor({
      sourceFloorId,
      targetFloorId,
      isArchitectureIncluded,
      isInstallationIncluded,
    })
    if (!isCopied) {
      setError('Kopyalanacak çizim bulunamadı.')
      return
    }

    // Kullanıcı sonucu görsün: kopya hedef katta, oraya geçiliyor.
    setActiveFloor(targetFloorId)
    onClose()
  }

  return (
    <DialogShell title="Kat Kopyalama" onClose={onClose}>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm text-ink-muted" htmlFor="copy-source">
            Kaynak kat
          </label>
          <select
            id="copy-source"
            value={sourceFloorId}
            onChange={(event) => {
              setSourceFloorId(Number(event.target.value))
              setTargetFloorId(null)
              setError(null)
            }}
            className="w-44 rounded border border-edge bg-surface px-2 py-1 text-sm text-ink"
          >
            {floors.map((floor) => (
              <option key={floor.id} value={floor.id}>
                {floor.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="text-sm text-ink-muted" htmlFor="copy-target">
            Hedef kat
          </label>
          <select
            id="copy-target"
            value={targetFloorId ?? ''}
            disabled={emptyFloors.length === 0}
            onChange={(event) => {
              setTargetFloorId(Number(event.target.value))
              setError(null)
            }}
            className="w-44 rounded border border-edge bg-surface px-2 py-1 text-sm text-ink disabled:text-ink-disabled"
          >
            <option value="">Seçiniz…</option>
            {emptyFloors.map((floor) => (
              <option key={floor.id} value={floor.id}>
                {floor.name}
              </option>
            ))}
          </select>
        </div>

        {emptyFloors.length === 0 && (
          <p className="text-xs text-ink-muted">
            Kopyalanacak boş kat yok. Kat Yönetimi&apos;nden yeni bir kat ekleyin — çizimi
            olan bir katın üzerine kopyalanmaz.
          </p>
        )}

        <fieldset className="space-y-2">
          <legend className="text-sm text-ink-muted">Kopyalanacak çizim</legend>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={isArchitectureIncluded}
              onChange={(event) => setIsArchitectureIncluded(event.target.checked)}
            />
            Mimari
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={isInstallationIncluded}
              onChange={(event) => setIsInstallationIncluded(event.target.checked)}
            />
            Tesisat
          </label>
        </fieldset>

        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-edge px-5 py-3">
        <button type="button" onClick={onClose} className={chromeButtonVariants()}>
          Vazgeç
        </button>
        <button
          type="button"
          onClick={handleCopy}
          disabled={!isSelectionValid}
          className={chromeButtonVariants({ tone: 'active' })}
        >
          Kopyala
        </button>
      </div>
    </DialogShell>
  )
}
