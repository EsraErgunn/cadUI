import { Link } from 'react-router-dom'

import { ADMIN_CELL_LINK } from './adminVariants'

export interface BreadcrumbItem {
  label: string
  /** Boşsa parça bağlantı değildir; son parça her zaman bağlantısızdır. */
  to?: string
}

interface PageHeaderProps {
  breadcrumb: BreadcrumbItem[]
  title: string
  /** Başlığın yanında parantez içinde görünen adet. Veri gelmeden "…" verilir. */
  countLabel?: string
  description?: string
}

/** Yönetici liste ekranlarının ortak başlık bloğu: konum izi + başlık + adet + açıklama. */
export function PageHeader({ breadcrumb, title, countLabel, description }: PageHeaderProps) {
  const lastIndex = breadcrumb.length - 1

  return (
    <div>
      <nav aria-label="Konum" className="text-xs text-ink-muted">
        <ol className="flex flex-wrap items-center gap-1.5">
          {breadcrumb.map((item, index) => (
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

      <h1 className="mt-2 text-2xl font-semibold text-ink">
        {title}
        {countLabel !== undefined && <span className="text-ink-muted"> ({countLabel})</span>}
      </h1>
      {description !== undefined && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
    </div>
  )
}
