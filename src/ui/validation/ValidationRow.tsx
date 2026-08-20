import { ArrowRight, CircleAlert } from 'lucide-react'

import type { ValidationIssue } from '../../core/validate'

type ValidationRowProps = {
  issue: ValidationIssue
  floorName: string
  onShow: () => void
}

/**
 * Künye tek satırda: kat, mahal, cihaz. Doküman bunları ayrı satırlara yazıyor
 * ama listede her hata üç satır kaplasaydı ekrana üç hata sığardı; sıra sabit
 * (geniş → dar kapsam) ve olmayan parça hiç yazılmaz.
 */
function formatContext(issue: ValidationIssue, floorName: string): string {
  const parts = [`Kat: ${floorName}`]
  if (issue.location.roomName) parts.push(`Mahal: ${issue.location.roomName}`)
  if (issue.location.elementLabel) parts.push(`Cihaz: ${issue.location.elementLabel}`)
  return parts.join(' · ')
}

export function ValidationRow({ issue, floorName, onShow }: ValidationRowProps) {
  return (
    <li className="flex items-start gap-3 border-b border-canvas-overlay-edge/60 px-3 py-2.5 last:border-b-0">
      <CircleAlert
        size={16}
        strokeWidth={1.8}
        aria-hidden
        className="mt-0.5 shrink-0 text-canvas-overlay-danger"
      />

      {/* "göster" sağ kenarda DEĞİL, künyenin altında ve metinle aynı sol
          hizada: satır uzun bir kural metni taşıyınca düğme sağda kayboluyordu.
          Referans görselden bilinçli sapma (kullanıcı isteği). */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-canvas-overlay-ink-strong">{issue.message}</p>
        <p className="mt-0.5 text-xs text-canvas-overlay-ink-muted">
          {formatContext(issue, floorName)}
        </p>

        {/* Gösterilecek bir nesne yoksa (kat planı hiç çizilmemişse) düğme de
            yok: basılınca boş bir kata götüren bir bağlantı yanıltıcı olurdu. */}
        {issue.focus && (
          <button
            type="button"
            onClick={onShow}
            /* Negatif sol pay, düğmenin kendi px-1.5'ini yutar: yazı üstteki
               metinle TAM hizalanır, tıklama alanı yine de dar kalmaz. */
            className="-ml-1.5 mt-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-admin-primary hover:underline"
          >
            göster
            <ArrowRight size={13} strokeWidth={2} aria-hidden />
          </button>
        )}
      </div>
    </li>
  )
}
