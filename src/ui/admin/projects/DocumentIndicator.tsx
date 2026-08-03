import { FileText } from 'lucide-react'

import { ADMIN_FOCUS_RING } from '../adminVariants'

const DOCUMENTS_PRESENT_LABEL = 'Evrak var'
const DOCUMENTS_MISSING_LABEL = 'Evrak yok'

interface DocumentIndicatorProps {
  hasDocuments: boolean
}

/**
 * İşlemler sütunundaki evrak ikonu. İpucu `title` ile verilmiyor: `title`
 * klavyeyle açılmaz ve okuyucuların çoğu okumaz. Anlam `aria-label`'da,
 * görsel ipucu ayrı bir katmanda — ikon `tabIndex` ile odaklanabilir olduğu
 * için Tab ile de açılır.
 */
export function DocumentIndicator({ hasDocuments }: DocumentIndicatorProps) {
  const label = hasDocuments ? DOCUMENTS_PRESENT_LABEL : DOCUMENTS_MISSING_LABEL

  return (
    <span className="group relative inline-flex">
      <span
        role="img"
        aria-label={label}
        tabIndex={0}
        className={`inline-flex rounded ${ADMIN_FOCUS_RING}`}
      >
        <FileText
          aria-hidden
          className={hasDocuments ? 'size-5 text-success' : 'size-5 text-ink-disabled'}
        />
      </span>

      <span
        role="tooltip"
        aria-hidden
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 -translate-x-1/2
                   whitespace-nowrap rounded-md border border-edge bg-surface px-2 py-1 text-xs
                   text-ink opacity-0 shadow-sm transition-opacity group-focus-within:opacity-100
                   group-hover:opacity-100 motion-reduce:transition-none"
      >
        {label}
      </span>
    </span>
  )
}
