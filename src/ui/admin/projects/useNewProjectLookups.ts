import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import {
  CODE_GROUP_NAMES,
  getCodesByGroupName,
  type CodeGroupName,
  type CodeOption,
} from '../../../api/codes'
import { getAuthorizedGasFirms } from '../../../api/projectFirmAuthorizations'
import { getProjectFirmList } from '../../../api/projectFirms'
import type { Lookup } from '../../../api/projects'

/** Seçim kutusu kaynakları sık değişmez; her alan odağında yeniden çekilmesin. */
const LOOKUP_STALE_MS = 5 * 60 * 1000

/** Veri gelmeden dönen boş liste TEK bir nesne: her render'da yeni `[]` üretilseydi
    listeyi izleyen etkiler (proje tipi varsayılanı) boşuna tetiklenirdi. */
const EMPTY_LIST: never[] = []

interface UseNewProjectLookupsOptions {
  isAdmin: boolean
  /** Seçili proje firması; GD firması seçenekleri onun yetkilerinden türüyor. */
  projectFirmId: number | null
}

export interface NewProjectLookups {
  projectFirms: Lookup[]
  gasFirms: Lookup[]
  /** Firma listeleri çekilemedi mi — kutu boş açılıp "sistemde firma yok" sanılmasın. */
  haveProjectFirmsFailed: boolean
  haveGasFirmsFailed: boolean
  /**
   * Seçili proje firmasının BUGÜN geçerli hiçbir yetkisi yok mu. Hata DEĞİL:
   * liste başarıyla geldi ve boş. Ayrı bayrak çünkü kutu sessizce boş kalırsa
   * kullanıcı seçim yapamadığını görür ama SEBEBİNİ göremez — yetkisi süresi
   * dolmuş bir firma seçtiğinde tam olarak bu oluyor.
   */
  hasNoAuthorizedGasFirm: boolean
  projectTypes: CodeOption[]
  heatingTypes: CodeOption[]
  buildingUsageTypes: CodeOption[]
}

/**
 * Formun seçim kutusu kaynakları. Firma listelerinin ikisi de GERÇEK uçtan ve
 * anahtarları diğer ekranlarla ORTAK — aynı liste ikinci kez indirilmiyor,
 * bir firma pasifleştirilince oradaki geçersizleştirme buradaki seçenekleri de
 * tazeliyor.
 */
export function useNewProjectLookups({
  isAdmin,
  projectFirmId,
}: UseNewProjectLookupsOptions): NewProjectLookups {
  // `GET /api/projectfirms` — proje firmaları ekranıyla AYNI anahtar (K75).
  const projectFirmsQuery = useQuery({
    queryKey: ['projectFirmList'],
    queryFn: ({ signal }) => getProjectFirmList(signal),
    enabled: isAdmin,
    staleTime: LOOKUP_STALE_MS,
  })

  /**
   * GD firması seçenekleri artık TÜM firmalar değil, seçili proje firmasının
   * BUGÜN geçerli yetkileri (`GET /api/project-firm-authorizations`). Kutu zaten
   * proje firması seçilene kadar pasifti; liste daralmayınca kullanıcı
   * yetkisiz bir çift seçebiliyor ve hata ancak kaydederken çıkıyordu.
   *
   * Proje firması `queryKey`'in parçası: firma değişince seçenekler yeniden
   * çekiliyor, iki firmanın listesi birbirine karışmıyor.
   */
  const gasFirmsQuery = useQuery({
    queryKey: ['authorizedGasFirms', projectFirmId],
    queryFn: ({ signal }) => getAuthorizedGasFirms(projectFirmId ?? 0, signal),
    enabled: isAdmin && projectFirmId !== null,
    staleTime: LOOKUP_STALE_MS,
  })

  const projectTypesQuery = useCodeGroup(CODE_GROUP_NAMES.projectType)
  const heatingTypesQuery = useCodeGroup(CODE_GROUP_NAMES.heatingType)
  const buildingUsageTypesQuery = useCodeGroup(CODE_GROUP_NAMES.buildingUsageType)

  // Kutular kimlik + ad istiyor; satırın geri kalanı (vergi no, telefon, dfirmNo)
  // burada işe yaramıyor. Proje firmasında `name`, uçtaki `title`'ın karşılığı.
  const projectFirms = useMemo<Lookup[]>(
    () => (projectFirmsQuery.data ?? EMPTY_LIST).map((firm) => ({ id: firm.id, name: firm.name })),
    [projectFirmsQuery.data],
  )

  const gasFirms = useMemo<Lookup[]>(
    () => (gasFirmsQuery.data ?? EMPTY_LIST).map((firm) => ({ id: firm.id, name: firm.name })),
    [gasFirmsQuery.data],
  )

  return {
    projectFirms,
    gasFirms,
    haveProjectFirmsFailed: projectFirmsQuery.isError,
    haveGasFirmsFailed: gasFirmsQuery.isError,
    hasNoAuthorizedGasFirm: gasFirmsQuery.isSuccess && gasFirms.length === 0,
    projectTypes: projectTypesQuery.data ?? EMPTY_LIST,
    heatingTypes: heatingTypesQuery.data ?? EMPTY_LIST,
    buildingUsageTypes: buildingUsageTypesQuery.data ?? EMPTY_LIST,
  }
}

/** Üç tip alanı AYNI uçtan besleniyor; grup adı `queryKey`'in parçası. */
function useCodeGroup(groupName: CodeGroupName) {
  return useQuery({
    queryKey: ['codes', groupName],
    queryFn: ({ signal }) => getCodesByGroupName(groupName, signal),
    staleTime: LOOKUP_STALE_MS,
  })
}
