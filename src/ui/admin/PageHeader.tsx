import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'

export type { BreadcrumbItem }

interface PageHeaderProps {
  breadcrumb: BreadcrumbItem[]
  title: string
  /** Başlığın yanında parantez içinde görünen adet. Veri gelmeden "…" verilir. */
  countLabel?: string
  description?: string
}

/** Yönetici liste ekranlarının ortak başlık bloğu: konum izi + başlık + adet + açıklama. */
export function PageHeader({ breadcrumb, title, countLabel, description }: PageHeaderProps) {
  return (
    <div>
      <Breadcrumb items={breadcrumb} />

      <h1 className="mt-2 text-2xl font-semibold text-ink">
        {title}
        {countLabel !== undefined && <span className="text-ink-muted"> ({countLabel})</span>}
      </h1>
      {description !== undefined && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
    </div>
  )
}
