import { Breadcrumb, type BreadcrumbItem } from './Breadcrumb'

export type { BreadcrumbItem }

interface PageHeaderProps {
  breadcrumb: BreadcrumbItem[]
  title: string
  /** Başlığın yanında parantez içinde görünen adet. Veri gelmeden "…" verilir. */
  countLabel?: string
  description?: string
}

/**
 * Yönetici liste ekranlarının ortak başlık bloğu: konum izi + başlık + adet + açıklama.
 *
 * `min-w-0` ŞART: bileşen her sayfada `flex flex-wrap justify-between` satırının
 * çocuğu ve flex çocuğunun varsayılan `min-width: auto` değeri, uzun bir proje/
 * firma adında satırı içeriğine kadar genişletip <main>'i yatay kaydırıyordu.
 * `break-words` de aynı sebeple: boşluksuz uzun ad (e-posta, kod) sarılmalı.
 */
export function PageHeader({ breadcrumb, title, countLabel, description }: PageHeaderProps) {
  return (
    <div className="min-w-0">
      <Breadcrumb items={breadcrumb} />

      <h1 className="mt-2 break-words text-xl font-semibold text-ink sm:text-2xl">
        {title}
        {countLabel !== undefined && <span className="text-ink-muted"> ({countLabel})</span>}
      </h1>
      {description !== undefined && (
        <p className="mt-1 break-words text-sm text-ink-muted">{description}</p>
      )}
    </div>
  )
}
