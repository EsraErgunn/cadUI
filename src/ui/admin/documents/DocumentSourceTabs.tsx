import { FolderOpen, MonitorUp } from 'lucide-react'

import { adminTabVariants } from '../adminVariants'
import type { DocumentSource } from './documentSources'

/**
 * Sekme durumu URL'e YAZILMIYOR — liste ekranlarının aksine burada
 * paylaşılabilir bir durum yok: adres yüklenmiş dosyaları zaten taşıyamıyor.
 */
const SOURCE_ITEMS = [
  { value: 'computer', label: 'Bilgisayardan Seç', icon: MonitorUp },
  { value: 'project', label: 'Proje Evrakları', icon: FolderOpen },
] as const satisfies readonly { value: DocumentSource; label: string; icon: unknown }[]

interface DocumentSourceTabsProps {
  value: DocumentSource
  panelId: string
  onChange: (value: DocumentSource) => void
}

export function DocumentSourceTabs({ value, panelId, onChange }: DocumentSourceTabsProps) {
  return (
    <div role="tablist" aria-label="Evrak kaynağı" className="flex gap-1 border-b border-edge">
      {SOURCE_ITEMS.map((item) => {
        const isActive = item.value === value
        const Icon = item.icon

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={panelId}
            onClick={() => onChange(item.value)}
            className={adminTabVariants({ tone: isActive ? 'active' : 'plain' })}
          >
            <Icon aria-hidden className="size-4" />
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
