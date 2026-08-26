import { useQuery } from '@tanstack/react-query'
import { Menu, Search } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { UserMenu } from './UserMenu'
import { MANAGEMENT_SCREEN_ROLES } from './adminNavItems'
import { buildScopeOptionGroups, parseScopeValue, toScopeValue } from './adminScopeOptions'
import { ADMIN_PARAM_KEYS, useAdminParamWriter } from './adminUrlParams'
import { adminFieldVariants, adminIconButtonVariants } from './adminVariants'
import { isInPlaceSearchPath } from './globalSearchTargets'
import { useOwnGasFirms } from './ownGasFirms/useOwnGasFirms'
import { useAdminScopeParam } from './useAdminScopeParam'
import { hasAnyRole, useRoleCode } from './useRole'
import { fetchAllFirms, getFirmGroups } from '../../api/adminFirms'
import { PROJECT_LIST_PATH } from '../../pages/useCloseEditor'

const SCOPE_SELECT_ID = 'admin-scope'

/** Kapsam seçilmemiş hâl. Boş dize `<option>` değeri; global kapsamın DOM karşılığı. */
const GLOBAL_SCOPE_VALUE = ''

/**
 * Kapsam seçilmemiş hâlin ETİKETİ role göre değişiyor. Yönetici gerçekten
 * sistemin tamamına bakıyor; yönetim dışı roller ise yalnız kendi bağlı olduğu
 * firmaları görüyor ve onlara "Sistem geneli" demek, göremedikleri bir kapsamı
 * vaat ederdi.
 */
const GLOBAL_SCOPE_LABEL = 'Sistem geneli'
const OWN_SCOPE_LABEL = 'Tümü'

/**
 * Firma satırlarını grup satırından ayıran girinti. Bölünemez boşluk şart:
 * tarayıcı `<option>` metnindeki normal boşlukları kırpıyor.
 */
const FIRM_OPTION_INDENT = '   '

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
  const navigate = useNavigate()
  const location = useLocation()
  const updateParams = useAdminParamWriter()
  const { scope, setScope } = useAdminScopeParam()
  // FİRMA seçenekleri yalnız yöneticide: `GET /api/gasdistributionfirms`
  // sunucuda `Authorize(Roles = Admin)` ile korunuyor, öteki rollerde istek
  // 403 döner. GRUP ucu (`/api/gasdistributiongroups`) her role açık, o yüzden
  // seçici herkeste çiziliyor ve grup satırlarını gösteriyor.
  const canListGasFirms = hasAnyRole(useRoleCode(), MANAGEMENT_SCREEN_ROLES)

  /**
   * Yönetim DIŞINDAKİ roller kapsam olarak yalnız KENDİ bağlı oldukları gaz
   * dağıtım firmalarını görüyor (`useOwnGasFirms`, gerçek uçlar): proje firması
   * kullanıcısı firmasının yürürlükteki yetkilerinden, gaz dağıtım kullanıcısı
   * kendi firmasının tekil kaydından. Grup listesi ve sistem geneli o rollerde
   * hiç çizilmiyor — göremedikleri firmaları kapsam olarak sunmak, seçim
   * yapılınca listeyi sessizce boşaltırdı.
   */
  const ownGasFirms = useOwnGasFirms()

  const { data: groups } = useQuery({
    queryKey: ['firmGroups'],
    queryFn: ({ signal }) => getFirmGroups(signal),
    enabled: canListGasFirms,
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

  /** Yönetim dışı rolde seçenekler düz bir liste: grup hiyerarşisi yok. */
  const ownFirmOptions = useMemo(
    () =>
      (ownGasFirms.rows ?? []).map((firm) => ({
        value: toScopeValue({ type: 'firm', firmId: firm.id }),
        label: firm.name,
      })),
    [ownGasFirms.rows],
  )

  /**
   * Genel arama İKİ yoldan biriyle çalışır ve ayrımı `globalSearchTargets`
   * yapar:
   *
   * - Ucu metin araması alan liste ekranlarında (proje, proje firması, gaz
   *   dağıtım firması, kullanıcılar) arama YERİNDE: adrese yalnız `q` yazılır,
   *   ekranın kendi süzgeçleri korunur ve sayfa 1'e döner. Böylece geri tuşu ve
   *   yenileme mevcut rota sistemiyle aynı şekilde davranır.
   * - Geri kalan her ekranda arama PROJE listesine taşınır. Adres SIFIRDAN
   *   kuruluyor: bulunulan sayfanın süzgeçlerini taşımak aramayı bambaşka bir
   *   kümede yapardı.
   *
   * Boş metinde hiçbir şey olmaz — kullanıcıyı sebepsiz sayfa değiştirmek.
   */
  const submitGlobalSearch = () => {
    const term = globalQuery.trim()
    if (term === '') return

    if (isInPlaceSearchPath(location.pathname)) {
      updateParams({ nameQuery: term }, true)
      return
    }

    void navigate(`${PROJECT_LIST_PATH}?${ADMIN_PARAM_KEYS.nameQuery}=${encodeURIComponent(term)}`)
  }

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
          <option value={GLOBAL_SCOPE_VALUE}>
            {canListGasFirms ? GLOBAL_SCOPE_LABEL : OWN_SCOPE_LABEL}
          </option>

          {!canListGasFirms &&
            ownFirmOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}

          {canListGasFirms &&
            optionGroups.map((optionGroup) =>
            optionGroup.groupOption === null ? (
              /* Grubu olmayan firmalar: seçilebilecek bir GRUP kapsamı yok, bu
                 yüzden başlık `<optgroup>` olarak kalıyor. */
              <optgroup key={optionGroup.label} label={optionGroup.label}>
                {optionGroup.firmOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {FIRM_OPTION_INDENT}
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ) : (
              /* Grup KENDİ satırı — `<optgroup>` başlığı DEĞİL. Başlık HTML'de
                 tıklanamıyor; grubun tamamını seçmek için ayrıca bir "(tümü)"
                 satırı yazmak gerekiyordu ve ikisi yan yana yinelenme gibi
                 okunuyordu. Şimdi tek satır var ve o satır grubu seçiyor;
                 altındaki firmalar girintiyle ayrılıyor. */
              <Fragment key={optionGroup.label}>
                <option value={optionGroup.groupOption.value}>
                  {optionGroup.groupOption.label}
                </option>
                {optionGroup.firmOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {FIRM_OPTION_INDENT}
                    {option.label}
                  </option>
                ))}
              </Fragment>
              ),
            )}
        </select>
      </div>

      {/* Enter, aramayı PROJE listesine taşır (`submitGlobalSearch`). Dar
          ekranda GİZLENİYOR: 320 px'de kapsam seçici + arama + eylemler aynı
          satıra sığmıyor ve üst bar yatay kayıyordu. */}
      <div className="relative hidden min-w-0 flex-1 md:block">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-disabled"
        />
        <input
          type="search"
          value={globalQuery}
          onChange={(event) => setGlobalQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            submitGlobalSearch()
          }}
          aria-label="Genel arama"
          placeholder="Proje, firma veya kullanıcı ara..."
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
