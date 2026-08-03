import { PROJECT_TYPE_LABELS, type ProjectTypeCode } from '../../../api/projects'
import { adminBadgeVariants } from '../adminVariants'

/** Proje tipi sunucuda parametrik: liste dışı bir kod gelirse ham kod gösterilir,
    arayüz boş hücre veya "undefined" yazmaz. */
const PROJECT_TYPE_LABEL_LOOKUP: Record<string, string> = PROJECT_TYPE_LABELS

interface ProjectTypeBadgeProps {
  code: ProjectTypeCode
}

export function ProjectTypeBadge({ code }: ProjectTypeBadgeProps) {
  return (
    <span className={adminBadgeVariants({ className: 'px-2' })}>
      {PROJECT_TYPE_LABEL_LOOKUP[code] ?? code}
    </span>
  )
}
