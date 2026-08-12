import { Link } from 'react-router-dom'

import { ADMIN_CELL_LINK } from './adminVariants'

export interface BreadcrumbItem {
  label: string
  /** Boşsa parça bağlantı değildir; son parça her zaman bağlantısızdır. */
  to?: string
}

/**
 * Konum izi. `PageHeader`'ın içinden çıkarıldı: proje detayı başlığı kendi
 * düzenini kuruyor (başlık yanında durum çipi, altında künye) ama AYNI izi
 * göstermesi gerekiyordu — işaretlemeyi kopyalamak yerine parça ortaklaştı
 * (CLAUDE.md: ikinci ekranda gereken parça `admin/` köküne taşınır).
 */
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const lastIndex = items.length - 1

  return (
    <nav aria-label="Konum" className="text-xs text-ink-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {item.to === undefined ? (
              <span aria-current={index === lastIndex ? 'page' : undefined}>{item.label}</span>
            ) : (
              <Link to={item.to} className={ADMIN_CELL_LINK}>
                {item.label}
              </Link>
            )}
            {index < lastIndex && <span aria-hidden>/</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}
