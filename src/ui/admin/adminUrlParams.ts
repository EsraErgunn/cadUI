import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

/**
 * Yönetici listelerinin URL query anahtarları.
 *
 * Coğrafi `region` anahtarı YOK ve geri gelmeyecek — kavram sunucudan tümüyle
 * kalktı. Üst bardaki kapsam grup seçtiğinde liste ekranının grup filtresiyle
 * AYNI `group` anahtarını yazıyor: iki ayrı anahtar olsaydı aynı ekranda üst bar
 * "AKSA", sayfa içi filtre "ENERYA" diyebilirdi ve hangisinin kazandığı
 * belirsiz kalırdı.
 */
export const ADMIN_PARAM_KEYS = {
  nameQuery: 'q',
  groupName: 'group',
  /**
   * Üst bardaki kapsam TEK bir gaz dağıtım firmasıysa onun kimliği. `group` ile
   * birlikte yazılmaz (sunucu `gdGroupId`+`gdFirmId` ikilisini kabul etmiyor).
   * Proje firması süzgecinin `firm` anahtarıyla KARIŞTIRILMAZ: o başka bir
   * varlık, bu gaz dağıtım firması.
   */
  scopeFirm: 'gdfirm',
  sortKey: 'sort',
  sortDir: 'dir',
  page: 'page',
  tab: 'tab',
  dateFrom: 'from',
  dateTo: 'to',
  /** İl süzgeci; ilçe ona bağlı (ilçe listesi ancak il seçilince gelir). */
  city: 'city',
  district: 'district',
  projectFirm: 'firm',
  /** Proje firması kullanıcılarının "Yetki" süzgeci; "Tümü" hâlinde yazılmaz. */
  authorityType: 'type',
  /**
   * Evrak listesinin "Döküman Tipi" süzgeci. `authorityType` ile AYNI adresi
   * (`type`) kullanıyor: ikisi de "bu listedeki tür süzgeci" demek ve iki liste
   * asla aynı adreste açılmıyor. Ayrı bir alan adı taşıması, hangi ekranın
   * hangi süzgeci yazdığını çağrı yerinde okunur kılıyor.
   */
  documentType: 'type',
  /** Poliçe listesinin "Sigorta Şirketi" süzgeci; kimlik taşır. */
  insuranceCompany: 'company',
  /** Yalnız aktif kayıtlar; işaretsiz hâl (varsayılan) adrese yazılmaz. */
  onlyActive: 'active',
} as const

export type AdminParamField = keyof typeof ADMIN_PARAM_KEYS
export type AdminParamPatch = Partial<Record<AdminParamField, string | null>>

export const FIRST_PAGE = 1

export function parsePage(raw: string | null): number {
  const parsed = Number(raw)
  return Number.isInteger(parsed) && parsed >= FIRST_PAGE ? parsed : FIRST_PAGE
}

/**
 * Kapsam/filtre anahtarlarındaki KİMLİK; bozuk veya eski değer "seçim yok"
 * sayılır. Grup, kapsam firması ve liste filtresi aynı kuralı okuduğu için
 * tek yerde.
 */
export function parseScopeId(raw: string | null): number | null {
  const parsed = Number(raw)
  return raw !== null && Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

/**
 * Patch'i mevcut query string'e uygular. Boş/null değer anahtarı SİLER: varsayılan
 * değerler adrese yazılmadığı için bağlantı temiz kalır.
 */
export function applyParamPatch(
  current: URLSearchParams,
  patch: AdminParamPatch,
  shouldResetPage: boolean,
): URLSearchParams {
  const draft = new URLSearchParams(current)
  const entries = Object.entries(patch) as [AdminParamField, string | null | undefined][]

  for (const [field, value] of entries) {
    const key = ADMIN_PARAM_KEYS[field]
    if (value === undefined || value === null || value === '') {
      draft.delete(key)
      continue
    }
    draft.set(key, value)
  }

  if (shouldResetPage) draft.delete(ADMIN_PARAM_KEYS.page)
  return draft
}

/** Liste ekranlarının ortak yazma yüzeyi; her ekran kendi `URLSearchParams`
    mantığını kurmasın diye tek yerde. */
export function useAdminParamWriter(): (
  patch: AdminParamPatch,
  shouldResetPage: boolean,
  /**
   * Geçmişe yeni kayıt eklemeden yaz. Debounce'lu arama içindir: her tuş
   * vuruşu ayrı kayıt bıraksaydı "abc" yazan kullanıcının geri tuşuna üç kez
   * basması gerekirdi. Varsayılan `false` — mevcut çağıranların davranışı aynı.
   */
  shouldReplace?: boolean,
) => void {
  const [, setSearchParams] = useSearchParams()

  return useCallback(
    (patch: AdminParamPatch, shouldResetPage: boolean, shouldReplace = false) => {
      setSearchParams(
        (current) => applyParamPatch(current, patch, shouldResetPage),
        { replace: shouldReplace },
      )
    },
    [setSearchParams],
  )
}
