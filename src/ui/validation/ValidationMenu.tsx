import { CircleAlert, CircleCheck, RotateCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { useProjectValidation } from './useProjectValidation'
import type { Id } from '../../core/model'
import { countIssues } from '../../core/validate'
import { useCadStore } from '../../store/cadStore'
import { WarningList } from '../WarningList'
import { EDITOR_BAR_PANEL, editorBarButtonVariants } from '../menu/editorBarVariants'

const ALL_FLOORS = 'all'

/**
 * Hata kontrolleri — K90'da bilerek pasif bırakılan düğmenin arkası. Kayıt
 * Geçmişi (K109) ile aynı desen: düğmenin ALTINDAN açılan liste, açık/kapalı
 * durumu bileşenin içinde. Ayrı bir panel açılmadı çünkü liste tuvalin üstüne
 * biniyor ve kimsenin yerini daraltmıyor.
 *
 * Düğmenin kendisi SAYIYI ancak taze bir sonuç varken gösterir: çalıştırılmamış
 * bir denetimi "0 hata" diye yazmak, geçmiş bir kontrol izlenimi verirdi (K79).
 */
export function ValidationMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const [floorFilter, setFloorFilter] = useState<string>(ALL_FLOORS)
  const floors = useCadStore((state) => state.floors)
  const { issues, isFresh, run } = useProjectValidation(isOpen)
  const anchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return undefined

    // Kapsam düğmeyi DE içeriyor: dışarıda bıraksaydık pointerdown listeyi
    // kapatır, hemen ardından düğmenin kendi click'i yeniden açardı
    // (VersionHistoryMenu ile aynı gerekçe).
    const handlePointerDown = (event: PointerEvent) => {
      if (anchorRef.current?.contains(event.target as Node)) return
      setIsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const floorNameById = new Map<Id, string>(floors.map((floor) => [floor.id, floor.name]))
  const selectedFloorId = floorFilter === ALL_FLOORS ? undefined : Number(floorFilter)
  const visibleIssues =
    selectedFloorId === undefined
      ? issues
      : issues.filter((issue) => issue.location.floorId === selectedFloorId)
  const visibleCount = countIssues(issues, selectedFloorId)
  const totalCount = issues.length

  const toggleOpen = () => {
    // Açılışta bir kez çalıştır; sonrası çizim değiştikçe kendiliğinden tazelenir.
    if (!isOpen) run()
    setIsOpen((current) => !current)
  }

  return (
    <div ref={anchorRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="true"
        aria-expanded={isOpen}
        title="Hata Kontrolleri"
        className={editorBarButtonVariants({
          tone: !isFresh ? 'card' : totalCount === 0 ? 'success' : 'danger',
        })}
      >
        {isFresh && totalCount > 0 ? (
          <CircleAlert size={16} strokeWidth={1.8} aria-hidden />
        ) : (
          <CircleCheck size={16} strokeWidth={1.8} aria-hidden />
        )}
        Hata Kontrolleri
        {isFresh && totalCount > 0 && <span>({totalCount})</span>}
      </button>

      {isOpen && (
        <div
          aria-label="Hata kontrolleri"
          className={`${EDITOR_BAR_PANEL} absolute right-0 top-full z-20 mt-1 flex max-h-[60vh] w-[28rem] flex-col overflow-hidden rounded-lg shadow-lg`}
        >
          <div className="flex shrink-0 items-center gap-2 border-b border-canvas-overlay-edge px-3 py-2">
            <p
              aria-live="polite"
              className={
                visibleCount === 0
                  ? 'flex-1 text-sm text-canvas-overlay-ink-muted'
                  : 'flex-1 text-sm font-medium text-canvas-overlay-danger'
              }
            >
              {visibleCount === 0
                ? isFresh
                  ? 'Hata bulunamadı.'
                  : 'Kontroller çalıştırılıyor…'
                : `${visibleCount} hata giderilmeli`}
            </p>

            <label className="sr-only" htmlFor="validation-floor-filter">
              Kata göre süz
            </label>
            <select
              id="validation-floor-filter"
              value={floorFilter}
              onChange={(event) => setFloorFilter(event.target.value)}
              className="h-8 rounded-lg border border-canvas-overlay-edge bg-canvas-overlay px-2 text-sm text-canvas-overlay-ink-strong"
            >
              <option value={ALL_FLOORS}>tüm katlar</option>
              {floors.map((floor) => (
                <option key={floor.id} value={floor.id}>
                  {floor.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={run}
              aria-label="Kontrolleri yeniden çalıştır"
              title="Kontrolleri yeniden çalıştır"
              className={editorBarButtonVariants({ tone: 'plain', shape: 'icon' })}
            >
              <RotateCw size={15} strokeWidth={1.8} aria-hidden />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <WarningList
              issues={visibleIssues}
              floorNameById={floorNameById}
              isFresh={isFresh}
            />
          </div>
        </div>
      )}
    </div>
  )
}
