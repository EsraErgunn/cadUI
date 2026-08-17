import { useQuery } from '@tanstack/react-query'
import { Bell, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { UserMenu } from './UserMenu'
import { buildScopeOptionGroups, parseScopeValue, toScopeValue } from './adminScopeOptions'
import { adminFieldVariants, adminIconButtonVariants } from './adminVariants'
import { useAdminScopeParam } from './useAdminScopeParam'
import { fetchAllFirms, getFirmGroups } from '../../api/adminFirms'

// okunmamış bildirim sayısı endpoint'i bağlanınca sabit kaldırılacak.
const HAS_UNREAD_NOTIFICATIONS = true

const SCOPE_SELECT_ID = 'admin-scope'

/** Kapsam seçilmemiş hâl. Boş dize `<option>` değeri; global kapsamın DOM karşılığı. */
const GLOBAL_SCOPE_VALUE = ''

/**
 * Kabuk üst barı.
 *
 * KAPSAM seçicisi iki düzeyli: gaz dağıtım GRUP firması ya da tek bir gaz
 * dağıtım FİRMASI. Seçim uca `gdGroupId` VEYA `gdFirmId` olarak gidiyor, ikisi
 * birlikte asla (`AdminScope`, `api/adminDashboard.ts`). Coğrafi bölge kavramı
 * sunucudan kalktı; bu seçici hiçbir zaman `regionId` yazmıyor.
 *
 * Seçenekler İKİ mevcut uçtan birleştiriliyor (`/api/gasdistributiongroups` +
 * `/api/gasdistributionfirms`); hiyerarşiyi kuran saf fonksiyon
 * `adminScopeOptions.ts`'te, bileşen yalnız çiziyor. Firma listesi liste
 * ekranıyla ORTAK anahtardan geliyor, ikinci bir indirme olmuyor.
 *
 * Seçici HER ekranda etkin (docs/kararlar.md K44). Satırında kapsam bilgisi
 * olmayan kayıt elenmez, o ekranda kapsam bugün sonucu değiştirmez — böylece
 * seçim hiçbir listeyi sessizce boşaltmıyor.
 */
export function AdminTopBar() {
  const [globalQuery, setGlobalQuery] = useState('')
  const { scope, setScope } = useAdminScopeParam()

  const { data: groups } = useQuery({
    queryKey: ['firmGroups'],
    queryFn: ({ signal }) => getFirmGroups(signal),
  })

  // Anahtarın kökü firma listesiyle AYNI: bir firma pasifleştirilince o ekranın
  // geçersizleştirmesi buradaki seçenekleri de tazeler.
  const { data: firms } = useQuery({
    queryKey: ['gasDistributionFirms', 'all'],
    queryFn: ({ signal }) => fetchAllFirms(signal),
  })

  const optionGroups = useMemo(
    () => buildScopeOptionGroups(groups ?? [], firms ?? []),
    [groups, firms],
  )

  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b border-edge bg-surface px-6">
      <div className="flex shrink-0 items-center gap-2">
        <label htmlFor={SCOPE_SELECT_ID} className="text-sm font-medium text-ink">
          Kapsam
        </label>
        <select
          id={SCOPE_SELECT_ID}
          value={toScopeValue(scope)}
          onChange={(event) => setScope(parseScopeValue(event.target.value))}
          className={adminFieldVariants({ className: 'w-56' })}
        >
          <option value={GLOBAL_SCOPE_VALUE}>Sistem geneli</option>
          {optionGroups.map((optionGroup) => (
            <optgroup key={optionGroup.label} label={optionGroup.label}>
              {/* Grubun kendisi de seçilebilmeli; `<optgroup label>` tıklanabilir
                  değil, bu yüzden ilk satır olarak ayrıca yazılıyor. */}
              {optionGroup.groupOption !== null && (
                <option value={optionGroup.groupOption.value}>
                  {optionGroup.groupOption.label}
                </option>
              )}
              {optionGroup.firmOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
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

      {/* Çıkış artık ayrı bir ikon düğmesi değil, kullanıcı menüsünün içinde:
          şifre değiştirme ikinci bir eylem getirince satır sıkışıyordu. */}
      <UserMenu />
    </header>
  )
}
