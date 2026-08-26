import { useQuery } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'

import {
  AUTHORIZATION_ERRORS,
  buildDuplicateGasFirmMessage,
  buildProjectFirmAuthorizations,
  findDuplicateGasFirms,
  isCertificateNumberTaken,
  validateAuthorizationFields,
  type AuthorizationGasFirm,
  type ProjectFirmAuthorization,
} from './authorizationDraft'
import {
  getFirmGroups,
  getGasDistributionFirmsByGroup,
  type FirmGroup,
} from '../../../api/adminFirms'

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
  'Grup firması değiştiği için seçili gaz dağıtım firması temizlendi.'

export interface AuthorizationDraftErrors {
  group?: string
  gasFirms?: string
  certificateNumber?: string
  validFrom?: string
  validTo?: string
}

export interface ProjectFirmAuthorizationDraft {
  groups: FirmGroup[]
  /** Seçim kutusu değerleri dize; boş dize = henüz seçilmedi. */
  groupId: string
  gasFirms: AuthorizationGasFirm[]
  areGasFirmsPending: boolean
  /** Seçim kutusundaki firma; bir "Ekle" tek bir yetki kaydı üretir. */
  selectedGasFirmId: number | null
  certificateNumber: string
  validFrom: string
  validTo: string
  errors: AuthorizationDraftErrors
  /** Grup değişiminde işaretlerin temizlendiğini duyuran metin; okununca kalır. */
  clearedNotice: string | null
  setGroupId: (groupId: string) => void
  selectGasFirm: (gasDistributionFirmId: number) => void
  setCertificateNumber: (value: string) => void
  setValidFrom: (value: string) => void
  setValidTo: (value: string) => void
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
  const [selectedGasFirmId, setSelectedGasFirmId] = useState<number | null>(null)
  const [certificateNumber, setCertificateNumber] = useState('')
  const [validFrom, setValidFrom] = useState('')
  const [validTo, setValidTo] = useState('')
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

  // Ad sunucunun ünvanı; kutu, eklenen kayıt, mükerrer uyarısı ve "kaldır"
  // düğmesinin aria etiketi hep AYNI metni gösteriyor.
  const gasFirms = useMemo<AuthorizationGasFirm[]>(
    () => (groupFirms ?? []).map((firm) => ({ id: firm.id, name: firm.name })),
    [groupFirms],
  )

  const setGroupId = useCallback(
    (nextGroupId: string) => {
      setGroupIdValue(nextGroupId)
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
   * Bir "Ekle" tek bir bölge bağlar. Sertifika No o kayda ait ve eşsiz olmak
   * zorunda; birden fazla bölge, çiplerin yanındaki "+" ile ARDIŞIK eklemelerle
   * kuruluyor — her ekleme kendi numarasını ve tarihini alıyor.
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

    // Sertifika ve geçerlilik başlangıcı uçta ZORUNLU; boş gönderilirse kayıt
    // 400 alır ve firma kaydedilmişken yetkilendirme sessizce düşerdi.
    Object.assign(nextErrors, validateAuthorizationFields({ certificateNumber, validFrom, validTo }))

    const duplicates = findDuplicateGasFirms(authorizations, selectedGasFirms)
    if (duplicates.length > 0) nextErrors.gasFirms = buildDuplicateGasFirmMessage(duplicates)

    // Numara zaten girilmişse "zorunlu" hatasının üstüne yazmıyoruz; boş alanda
    // benzersizlik zaten sorulmaz (`isCertificateNumberTaken` boşta false döner).
    if (
      nextErrors.certificateNumber === undefined &&
      isCertificateNumberTaken(authorizations, certificateNumber)
    ) {
      nextErrors.certificateNumber = AUTHORIZATION_ERRORS.certificateNumberTaken
    }

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
        validFrom,
        validTo,
      }),
    )

    // ASSUMPTION: Belge "Ekle" sonrası taslağın ne olacağını söylemiyor.
    // İşaretler ve numara sıfırlanır, GRUP kalır: kullanıcı çoğunlukla aynı
    // grubun başka firmaları için ikinci bir kayıt ekliyor.
    setSelectedGasFirmId(null)
    setCertificateNumber('')
    setValidFrom('')
    setValidTo('')
    setClearedNotice(null)
  }, [
    authorizations,
    certificateNumber,
    validFrom,
    validTo,
    selectedGasFirmId,
    gasFirms,
    onAdd,
    selectedGroup,
  ])

  return {
    groups: groups ?? [],
    groupId,
    gasFirms,
    areGasFirmsPending: selectedGroup !== null && areGasFirmsPending,
    selectedGasFirmId,
    certificateNumber,
    validFrom,
    validTo,
    errors,
    clearedNotice,
    setGroupId,
    setValidFrom,
    setValidTo,
    selectGasFirm,
    setCertificateNumber,
    add,
  }
}
