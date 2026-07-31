import { useQuery } from '@tanstack/react-query'
import { Bell, Search } from 'lucide-react'
import { useState } from 'react'

import { ALL_REGIONS_LABEL, useRegionParam } from './adminUrlParams'
import { adminFieldVariants, adminIconButtonVariants } from './adminVariants'
import { getRegions } from '../../api/adminFirms'

const REGION_STALE_MS = 5 * 60 * 1000

// okunmamış bildirim sayısı endpoint'i bağlanınca sabit kaldırılacak.
const HAS_UNREAD_NOTIFICATIONS = true

export function AdminTopBar() {
  const { region, setRegion } = useRegionParam()
  const [globalQuery, setGlobalQuery] = useState('')

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: ({ signal }) => getRegions(signal),
    staleTime: REGION_STALE_MS,
  })

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-edge bg-surface px-6">
      <div className="flex shrink-0 items-center gap-2">
        <label htmlFor="admin-region" className="text-sm text-ink-muted">
          Bölge:
        </label>
        <select
          id="admin-region"
          value={region ?? ''}
          onChange={(event) => setRegion(event.target.value === '' ? null : event.target.value)}
          className={adminFieldVariants({ className: 'min-w-40 pr-8' })}
        >
          <option value="">{ALL_REGIONS_LABEL}</option>
          {(regions ?? []).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {/*  genel arama sonuç ekranı kendi issue'sunda gelecek. */}
      <div className="relative min-w-0 flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-disabled"
        />
        <input
          type="search"
          value={globalQuery}
          onChange={(event) => setGlobalQuery(event.target.value)}
          aria-label="Genel arama"
          placeholder="Proje, firma, kullanıcı veya tesisat no ara..."
          className={adminFieldVariants({ className: 'w-full pl-9' })}
        />
      </div>

      <button
        type="button"
        aria-label={
          HAS_UNREAD_NOTIFICATIONS ? 'Bildirimler (okunmamış var)' : 'Bildirimler'
        }
        className={adminIconButtonVariants()}
      >
        <Bell aria-hidden className="size-5" />
        {HAS_UNREAD_NOTIFICATIONS && (
          <span
            aria-hidden
            className="absolute right-2 top-2 size-2 rounded-full bg-danger ring-2 ring-surface"
          />
        )}
      </button>

      <div className="shrink-0 border-l border-edge pl-4 text-right leading-tight">
        <p className="text-sm font-semibold text-ink">Administrator</p>
        <p className="text-xs text-ink-muted">Sistem Yöneticisi</p>
      </div>
    </header>
  )
}
