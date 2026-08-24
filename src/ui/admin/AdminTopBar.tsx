import { useQuery } from '@tanstack/react-query'
import { Menu, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

import { UserMenu } from './UserMenu'
import { MANAGEMENT_SCREEN_ROLES } from './adminNavItems'
import { buildScopeOptionGroups, parseScopeValue, toScopeValue } from './adminScopeOptions'
import { adminFieldVariants, adminIconButtonVariants } from './adminVariants'
import { useAdminScopeParam } from './useAdminScopeParam'
import { hasAnyRole, useRoleCode } from './useRole'
import { fetchAllFirms, getFirmGroups } from '../../api/adminFirms'

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
 * Seçici, kapsamı olan HER YÖNETİCİ ekranında etkin (docs/kararlar.md K44).
 * Satırında kapsam bilgisi olmayan kayıt elenmez, o ekranda kapsam bugün sonucu
 * değiştirmez — böylece seçim hiçbir listeyi sessizce boşaltmıyor.
 *
 * Proje firması kullanıcısında seçici HİÇ ÇİZİLMEZ: kapsamı zaten kendi
 * firması, seçenekler ise gaz dağıtım grupları/firmaları — ona "sistem geneline
 * bakıyorum" yanılgısından başka bir şey vermezdi.
 */
interface AdminTopBarProps {
  /** Dar ekrandaki menü çekmecesini açar; `lg` ve üstünde düğme görünmez. */
  onOpenMenu: () => void
}

export function AdminTopBar({ onOpenMenu }: AdminTopBarProps) {
  const [globalQuery, setGlobalQuery] = useState('')
  const { scope, setScope } = useAdminScopeParam()
  // FİRMA seçenekleri yalnız yöneticide: `GET /api/gasdistributionfirms`
  // sunucuda `Authorize(Roles = Admin)` ile korunuyor, öteki rollerde istek
  // 403 döner. GRUP ucu (`/api/gasdistributiongroups`) her role açık, o yüzden
  // seçici herkeste çiziliyor ve grup satırlarını gösteriyor.
  const canListGasFirms = hasAnyRole(useRoleCode(), MANAGEMENT_SCREEN_ROLES)

  const { data: groups } = useQuery({
    queryKey: ['firmGroups'],
    queryFn: ({ signal }) => getFirmGroups(signal),
  })

  // Anahtarın kökü firma listesiyle AYNI: bir firma pasifleştirilince o ekranın
  // geçersizleştirmesi buradaki seçenekleri de tazeler.
  const { data: firms } = useQuery({
    queryKey: ['gasDistributionFirms', 'all'],
    queryFn: ({ signal }) => fetchAllFirms(signal),
    enabled: canListGasFirms,
  })

  const optionGroups = useMemo(
    () => buildScopeOptionGroups(groups ?? [], firms ?? []),
    [groups, firms],
  )

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-edge bg-surface px-3 sm:gap-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Menüyü aç"
        className={adminIconButtonVariants({ className: 'lg:hidden' })}
      >
        <Menu aria-hidden className="size-5" />
      </button>

      <div className="flex min-w-0 items-center gap-2">
        {/* Etiket her ekranda gizli; seçicinin ne olduğu seçili seçenekten
            okunuyor. `sr-only`, görünür metin kalkarken erişilebilir adı
            korumanın yolu — `<label>` silinseydi seçicinin adı kalmazdı. */}
        <label htmlFor={SCOPE_SELECT_ID} className="sr-only">
          Kapsam
        </label>
        <select
          id={SCOPE_SELECT_ID}
          value={toScopeValue(scope)}
          onChange={(event) => setScope(parseScopeValue(event.target.value))}
          className={adminFieldVariants({ className: 'w-32 min-w-0 sm:w-44 lg:w-56' })}
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

      {/* Genel arama sonuç ekranı kendi issue'sunda gelecek. Dar ekranda
          GİZLENİYOR: 320 px'de kapsam seçici + arama + eylemler aynı satıra
          sığmıyor ve üst bar yatay kayıyordu. */}
      <div className="relative hidden min-w-0 flex-1 md:block">
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

      {/* Arama gizliyken sağdaki eylemler sağa yaslansın. */}
      <div className="flex-1 md:hidden" />

      {/* Çıkış artık ayrı bir ikon düğmesi değil, kullanıcı menüsünün içinde:
          şifre değiştirme ikinci bir eylem getirince satır sıkışıyordu. */}
      <UserMenu />
    </header>
  )
}
