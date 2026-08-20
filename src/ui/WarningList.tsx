import { CircleCheck } from 'lucide-react'

import type { Id } from '../core/model'
import type { ValidationIssue } from '../core/validate'
import { ValidationRow } from './validation/ValidationRow'
import { focusValidationIssue } from './validation/focusValidationIssue'

type WarningListProps = {
  issues: readonly ValidationIssue[]
  floorNameById: ReadonlyMap<Id, string>
  /** Denetim henüz çalışmadıysa boş liste "hata yok" DEMEK DEĞİLDİR. */
  isFresh: boolean
}

function EmptyState({ isFresh }: { isFresh: boolean }) {
  if (!isFresh) {
    return (
      <p className="px-3 py-4 text-center text-sm text-canvas-overlay-ink-muted">
        Kontroller çalıştırılıyor…
      </p>
    )
  }

  return (
    <div className="m-3 rounded-lg border border-canvas-overlay-edge px-3 py-6 text-center">
      <CircleCheck
        size={24}
        strokeWidth={1.8}
        aria-hidden
        className="mx-auto text-canvas-overlay-success"
      />
      <p className="mt-2 text-sm font-medium text-canvas-overlay-ink-strong">Hata bulunamadı</p>
      <p className="mt-0.5 text-sm text-canvas-overlay-ink-muted">Proje gönderilmeye hazır.</p>
    </div>
  )
}

/**
 * Hata kontrolü sonuçlarının listesi. Süzme ve yeniden çalıştırma çağıranın
 * işi — bu bileşen yalnız verilen satırları çizer, hangi katın gösterildiğine
 * karar vermez.
 */
export function WarningList({ issues, floorNameById, isFresh }: WarningListProps) {
  if (issues.length === 0) return <EmptyState isFresh={isFresh} />

  return (
    <ul>
      {issues.map((issue) => (
        <ValidationRow
          key={issue.key}
          issue={issue}
          floorName={floorNameById.get(issue.location.floorId) ?? 'Bilinmeyen kat'}
          onShow={() => focusValidationIssue(issue)}
        />
      ))}
    </ul>
  )
}
