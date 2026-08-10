import { useState } from 'react'

import { FLOOR_FOCUS_RING } from './floorVariants'
import { isDeletionEmpty, type FloorDeletionSummary } from '../../core/floorDeletion'
import { formatElevationM } from '../../core/floorElevation'
import { DialogShell } from '../controls/DialogShell'
import { chromeButtonVariants } from '../controls/buttonVariants'

type FloorDeleteDialogProps = {
  summary: FloorDeletionSummary
  onCancel: () => void
  onConfirm: () => void
}

const CONFIRM_LABEL = 'Kat içeriğinin silineceğini anladım'

/** "14 duvar · 4 mahal · 6 kapı" — sıfır olan tür hiç yazılmaz. */
function joinCounts(entries: readonly [number, string][]): string {
  const written = entries.filter(([count]) => count > 0).map(([count, noun]) => `${count} ${noun}`)
  return written.length > 0 ? written.join(' · ') : 'yok'
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 text-sm">
      <span className="w-16 shrink-0 text-ink-muted">{label}</span>
      <span className="text-ink">{value}</span>
    </div>
  )
}

/**
 * Kat Silme Onayı (KK-12, KK-14). Silme burada YAPILMAZ, yalnız onaylanır:
 * pencere taslağı bilmiyor, çağıran onaylanan silmeyi kendi taslağına uyguluyor.
 *
 * Not: KK-13'ün istediği düşey eksen (baca şaftı / kolon havalandırması) uyarısı
 * YOK — o nesneler henüz core/model.ts'te tanımlı değil ve varsayım kodlanmıyor
 * (CLAUDE.md). Model gelince bu pencereye bir uyarı bloğu eklenecek.
 */
export function FloorDeleteDialog({ summary, onCancel, onConfirm }: FloorDeleteDialogProps) {
  const [isConfirmed, setIsConfirmed] = useState(false)

  const names = summary.floors.map((floor) => floor.name)
  const { counts } = summary

  if (summary.isBlocked) {
    return (
      <DialogShell title="Kat Silme Onayı" onClose={onCancel}>
        <div className="px-5 py-4">
          <p role="alert" className="text-sm text-ink">
            Projedeki katların tamamı seçili. En az bir katın kalması gerekir; seçimden bir kat
            çıkarıp yeniden deneyin.
          </p>
        </div>
        <div className="flex shrink-0 justify-end border-t border-edge px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className={`${chromeButtonVariants()} ${FLOOR_FOCUS_RING}`}
          >
            Kapat
          </button>
        </div>
      </DialogShell>
    )
  }

  return (
    <DialogShell title="Kat Silme Onayı" onClose={onCancel}>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        <p className="text-sm text-ink">
          <b>{names.join(', ')}</b> silinecek. Kata ait mimari ve tesisat çizimi birlikte
          kaldırılır.
        </p>

        <div className="space-y-1 rounded-md border border-dashed border-edge px-3 py-2">
          <SummaryLine
            label="Mimari"
            value={joinCounts([
              [counts.wallCount, 'duvar'],
              [counts.roomCount, 'mahal'],
              [counts.doorCount, 'kapı'],
              [counts.windowCount, 'pencere'],
              [counts.symbolCount, 'sembol'],
            ])}
          />
          <SummaryLine
            label="Tesisat"
            value={joinCounts([
              [counts.pipeSegmentCount, 'boru bölümü'],
              [counts.installationElementCount, 'tesisat ögesi'],
            ])}
          />
          {summary.elevationChanges.length > 0 && (
            <SummaryLine
              label="Kot"
              value={summary.elevationChanges
                .map(
                  (change) =>
                    `${change.name} ${formatElevationM(change.beforeCm)} → ${formatElevationM(
                      change.afterCm,
                    )}`,
                )
                .join(' · ')}
            />
          )}
        </div>

        {isDeletionEmpty(counts) && (
          <p className="text-xs text-ink-muted">Seçilen katlarda çizim yok.</p>
        )}

        <label className="flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={isConfirmed}
            onChange={(event) => setIsConfirmed(event.target.checked)}
            className={FLOOR_FOCUS_RING}
          />
          {CONFIRM_LABEL}
        </label>

        <p className="text-xs text-ink-muted">
          &quot;Katı Sil&quot; düğmesi, bu kutu işaretlenene kadar pasiftir. Silme işlemi
          &quot;Geri Al&quot; ile tek adımda geri alınır; çizim ekranı kapatıldıktan sonra geri
          alınamaz.
        </p>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-edge px-5 py-3">
        <button
          type="button"
          onClick={onCancel}
          className={`${chromeButtonVariants()} ${FLOOR_FOCUS_RING}`}
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={!isConfirmed}
          className={`${chromeButtonVariants()} bg-danger text-surface disabled:bg-surface-sunken ${FLOOR_FOCUS_RING}`}
        >
          Katı Sil
        </button>
      </div>
    </DialogShell>
  )
}
