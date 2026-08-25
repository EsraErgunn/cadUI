import { FolderOpen } from 'lucide-react'

import { PROJECT_STATUS_LABELS, type ProjectListItem } from '../../api/projects'
import { formatDateTime } from '../admin/adminFormat'

type ProjectRowProps = {
  project: ProjectListItem
  /** Editörde şu an açık olan proje: tıklanamaz, "Açık" ile işaretli. */
  isCurrent: boolean
  onSelect: () => void
}

/** Aynı desende `VersionRow` var ama alanlar farklı (isim/numara/durum) — ayrı bileşen. */
export function ProjectRow({ project, isCurrent, onSelect }: ProjectRowProps) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={isCurrent}
        aria-current={isCurrent ? 'true' : undefined}
        className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors
          disabled:cursor-not-allowed ${
            isCurrent
              ? 'bg-surface-sunken text-ink-muted'
              : 'text-ink hover:bg-surface-sunken'
          }`}
      >
        <FolderOpen size={16} strokeWidth={1.8} aria-hidden className="shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{project.name}</span>
          <span className="block truncate text-xs text-ink-muted">
            {project.pId}
            {project.status !== null && ` · ${PROJECT_STATUS_LABELS[project.status]}`}
          </span>
        </span>
        {isCurrent ? (
          <span className="shrink-0 text-xs text-ink-muted">Açık</span>
        ) : (
          <span className="shrink-0 text-xs tabular-nums text-ink-muted">
            {formatDateTime(project.updatedAt)}
          </span>
        )}
      </button>
    </li>
  )
}
