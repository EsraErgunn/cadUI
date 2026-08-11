import { useQuery } from '@tanstack/react-query'
import { Bell, Search } from 'lucide-react'
import { useState } from 'react'

import { adminFieldVariants, adminIconButtonVariants } from './adminVariants'
import { useRegionParam } from './useRegionParam'
import { getFirmGroups } from '../../api/adminFirms'

// okunmamış bildirim sayısı endpoint'i bağlanınca sabit kaldırılacak.
const HAS_UNREAD_NOTIFICATIONS = true

const REGION_SELECT_ID = 'admin-region-scope'

/** Kapsam seçilmemiş hâl. Boş dize `<option>` değeri; null'ın DOM karşılığı yok. */
const ALL_REGIONS_VALUE = ''

/**
 * Kabuk üst barı.
 *
 * "Bölge" kapsamı gaz dağıtım GRUP firmasıdır (AKSA, ENERYA…) — K31 ile kalkan
 * coğrafi bölge değil. Seçenekler `/api/gasdistributiongroups`'tan geliyor;
 * bölgeleri listeleyen ayrı bir uç yok (`/api/regions` → 404).
 *
 * Seçici HER ekranda etkin (docs/kararlar.md K44). Satırında bölge bilgisi
 * olmayan kayıt elenmez, o ekranda kapsam bugün sonucu değiştirmez — böylece
 * seçim hiçbir listeyi sessizce boşaltmıyor.
 */
export function AdminTopBar() {
  const [globalQuery, setGlobalQuery] = useState('')
  const region = useRegionParam()

  const { data: groups } = useQuery({
    queryKey: ['firmGroups'],
    queryFn: ({ signal }) => getFirmGroups(signal),
  })

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-edge bg-surface px-6">
      <div className="flex shrink-0 items-center gap-2">
        <label htmlFor={REGION_SELECT_ID} className="text-sm font-medium text-ink">
          Bölge
        </label>
        <select
          id={REGION_SELECT_ID}
          value={region.groupId === null ? ALL_REGIONS_VALUE : String(region.groupId)}
          onChange={(event) =>
            region.setGroupId(
              event.target.value === ALL_REGIONS_VALUE ? null : Number(event.target.value),
            )
          }
          className={adminFieldVariants({ className: 'w-44' })}
        >
          <option value={ALL_REGIONS_VALUE}>Tüm bölgeler</option>
          {(groups ?? []).map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
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
