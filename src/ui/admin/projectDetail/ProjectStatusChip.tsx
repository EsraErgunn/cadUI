import {
  PROJECT_DETAIL_STATUS_LABELS,
  type ProjectDetailStatus,
} from '../../../api/projectDetail'

/**
 * Durum noktasının rengi. Renk YALNIZ noktada: rozetin metni her durumda
 * `ink` tonunda kalıyor. `warning`/`success` metin rengi olarak sınanmadı
 * (knowledge/theming.md) ve nokta bir kontrast eşiğine tabi değil — durumu
 * söyleyen asıl kanal zaten yazının kendisi, renk tek kanal değil.
 */
const STATUS_DOT_COLORS: Record<ProjectDetailStatus, string> = {
  taslak: 'bg-ink-disabled',
  onayBekleyen: 'bg-warning',
  onaylanan: 'bg-success',
  reddedilen: 'bg-danger',
  revizyonIstendi: 'bg-warning',
}

export function ProjectStatusChip({ status }: { status: ProjectDetailStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-sunken px-2.5 py-1 text-xs font-semibold text-ink">
      <span aria-hidden className={`size-1.5 rounded-full ${STATUS_DOT_COLORS[status]}`} />
      {PROJECT_DETAIL_STATUS_LABELS[status]}
    </span>
  )
}
