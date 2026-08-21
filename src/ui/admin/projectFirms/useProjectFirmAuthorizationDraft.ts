import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

import {
  AUTHORIZATION_ERRORS,
  buildDuplicateGasFirmMessage,
  buildProjectFirmAuthorizations,
  findDuplicateGasFirms,
  formatAuthorizationGasFirmName,
  type AuthorizationGasFirm,
  type ProjectFirmAuthorization,
} from './authorizationDraft'
import {
  getFirmGroups,
  getGasDistributionFirmsByGroup,
  type FirmGroup,
} from '../../../api/adminFirms'
import { includesTr } from '../../../api/turkishText'

/**
 * Belge madde 16 / KK-2: grup değişince önceki işaretler düşer ve bu kullanıcıya
 * BİLDİRİLİR.
 *
 * ASSUMPTION: "bildirilir" onay diyaloğu değil, bildirim olarak okundu; eklenmiş
 * yetkilendirme kayıtları zaten korunuyor, kaybolan tek şey henüz eklenmemiş
 * işaretler — her seçim değişiminde diyalog açmak, geri alınabilir bir şey için
 * ağır sürtünme olurdu.
 *
 * Metin kullanıcıya görünüyor: belgedeki dili ("bölge") korur.
 */
export const GAS_FIRM_SELECTION_CLEARED_NOTICE =
  'Grup firması değiştiği için işaretli bölgeler temizlendi.'

export interface AuthorizationDraftErrors {
  group?: string
  gasFirms?: string
}

export interface ProjectFirmAuthorizationDraft {
  groups: FirmGroup[]
  /** Seçim kutusu değerleri dize; boş dize = henüz seçilmedi. */
  groupId: string
  gasFirms: AuthorizationGasFirm[]
  /** Arama kutusuyla süzülmüş liste; "Tümünü Seç" de bunun üzerinde çalışır. */
  visibleGasFirms: AuthorizationGasFirm[]
  areGasFirmsPending: boolean
  gasFirmSearch: string
  /** TEK seçim (K-single): en fazla bir gaz dağıtım firması. */
  selectedGasFirmId: number | null
  certificateNumber: string
  errors: AuthorizationDraftErrors
  /** Grup değişiminde işaretlerin temizlendiğini duyuran metin; okununca kalır. */
  clearedNotice: string | null
  setGroupId: (groupId: string) => void
  setGasFirmSearch: (search: string) => void
  selectGasFirm: (gasDistributionFirmId: number) => void
  /** Görünen (süzülmüş) kayıtların tamamını işaretler veya işareti kaldırır. */
  setCertificateNumber: (value: string) => void
  add: () => void
}

export interface UseProjectFirmAuthorizationDraftOptions {
  /** Eklenmiş kayıtlar; aynı firmanın ikinci kez eklenmesini engellemek için. */
  authorizations: readonly ProjectFirmAuthorization[]
  onAdd: (added: ProjectFirmAuthorization[]) => void
}

/**
 * "G.D. Firması & Bölge Yetkilendirme" bölümünün TASLAK durumu.
 *
 * Eklenmiş kayıtların sahibi `useProjectFirmForm`: taslak forma değil listeye
 * yazar (`onAdd`). İkisi tek hook'ta olsaydı, kaydetme doğrulaması taslağın
 * yarım kalmış alanlarını da görürdü.
 */
export function useProjectFirmAuthorizationDraft({
  authorizations,
  onAdd,
}: UseProjectFirmAuthorizationDraftOptions): ProjectFirmAuthorizationDraft {
  const [groupId, setGroupIdValue] = useState('')
  const [gasFirmSearch, setGasFirmSearch] = useState('')
  const [selectedGasFirmId, setSelectedGasFirmId] = useState<number | null>(null)
  const [certificateNumber, setCertificateNumber] = useState('')
  const [errors, setErrors] = useState<AuthorizationDraftErrors>({})
  const [clearedNotice, setClearedNotice] = useState<string | null>(null)

  const { data: groups } = useQuery({
    queryKey: ['firmGroups'],
    queryFn: ({ signal }) => getFirmGroups(signal),
  })

  const selectedGroup = useMemo(
    () => (groups ?? []).find((group) => String(group.id) === groupId) ?? null,
    [groupId, groups],
  )

  // Grup seçilmeden istek atılmaz: uç grup süzgeci taşımadığı için istek TÜM
  // firma listesini indiriyor, boş seçimde bunu yapmanın karşılığı yok.
  const { data: groupFirms, isPending: areGasFirmsPending } = useQuery({
    queryKey: ['gasDistributionFirmsByGroup', selectedGroup?.id ?? null],
    queryFn: ({ signal }) => getGasDistributionFirmsByGroup(selectedGroup?.id ?? 0, signal),
    enabled: selectedGroup !== null,
  })

  // Etiket burada üretiliyor, kutunun içinde değil: eklenen kayıt, mükerrer
  // uyarısı ve "kaldır" düğmesinin aria etiketi hep AYNI adı göstersin.
  const gasFirms = useMemo<AuthorizationGasFirm[]>(
    () =>
      (groupFirms ?? []).map((firm) => ({
        id: firm.id,
        name: formatAuthorizationGasFirmName(firm),
      })),
    [groupFirms],
  )

  // Arama Türkçe duyarsız: düz klavyeyle "GEMLIK" yazan kullanıcı "AKSA-GEMLİK"
  // kaydını bulabilmeli (bkz. api/turkishText.ts).
  const visibleGasFirms = useMemo(
    () =>
      gasFirmSearch === ''
        ? gasFirms
        : gasFirms.filter((gasFirm) => includesTr(gasFirm.name, gasFirmSearch)),
    [gasFirms, gasFirmSearch],
  )

  const setGroupId = useCallback(
    (nextGroupId: string) => {
      setGroupIdValue(nextGroupId)
      setGasFirmSearch('')
      setErrors((current) => ({ ...current, group: undefined, gasFirms: undefined }))
      setSelectedGasFirmId(null)
      // Bildirim yalnız gerçekten bir şey kaybolduysa çıkar; ilk seçimde
      // "temizlendi" demek kullanıcıyı olmayan bir kayıp için endişelendirirdi.
      // Karar güncelleyicinin İÇİNDE verilemez: `setState` çağrısı saf olmayan
      // bir güncelleyici demektir, React onu iki kez çalıştırabilir.
      setClearedNotice(selectedGasFirmId !== null ? GAS_FIRM_SELECTION_CLEARED_NOTICE : null)
    },
    [selectedGasFirmId],
  )

  /**
   * Seçim TEKİL: bir proje firmasına tek "Ekle" ile yalnız bir gaz dağıtım
   * firması bağlanır. Sertifika No o kayda ait ve eşsiz olmak zorunda —
   * çoklu seçimde tek numara N firmaya birden yazılıyordu.
   *
   * "Tümünü Seç" bu yüzden KALKTI: tekil seçimde karşılığı yok.
   */
  const selectGasFirm = useCallback((gasDistributionFirmId: number) => {
    setSelectedGasFirmId(gasDistributionFirmId)
    setErrors((current) => ({ ...current, gasFirms: undefined }))
  }, [])

  const add = useCallback(() => {
    const group = selectedGroup ?? undefined
    // Tek seçim, ama alt katman (`buildProjectFirmAuthorizations`,
    // `findDuplicateGasFirms`) LİSTE ile çalışıyor: tek öğeli dizi olarak
    // geçiliyor, o taraf değişmedi.
    const selectedGasFirms = gasFirms.filter((gasFirm) => gasFirm.id === selectedGasFirmId)
    const nextErrors: AuthorizationDraftErrors = {}

    if (group === undefined) nextErrors.group = AUTHORIZATION_ERRORS.group
    if (selectedGasFirms.length === 0) nextErrors.gasFirms = AUTHORIZATION_ERRORS.gasFirms

    const duplicates = findDuplicateGasFirms(authorizations, selectedGasFirms)
    if (duplicates.length > 0) nextErrors.gasFirms = buildDuplicateGasFirmMessage(duplicates)

    if (group === undefined || Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setErrors({})
    onAdd(
      buildProjectFirmAuthorizations({
        group,
        gasFirms: selectedGasFirms,
        certificateNumber,
      }),
    )

    // ASSUMPTION: Belge "Ekle" sonrası taslağın ne olacağını söylemiyor.
    // İşaretler ve numara sıfırlanır, GRUP kalır: kullanıcı çoğunlukla aynı
    // grubun başka firmaları için ikinci bir kayıt ekliyor.
    setSelectedGasFirmId(null)
    setCertificateNumber('')
    setClearedNotice(null)
  }, [authorizations, certificateNumber, selectedGasFirmId, gasFirms, onAdd, selectedGroup])

  return {
    groups: groups ?? [],
    groupId,
    gasFirms,
    visibleGasFirms,
    areGasFirmsPending: selectedGroup !== null && areGasFirmsPending,
    gasFirmSearch,
    selectedGasFirmId,
    certificateNumber,
    errors,
    clearedNotice,
    setGroupId,
    setGasFirmSearch,
    selectGasFirm,
    setCertificateNumber,
    add,
  }
}
