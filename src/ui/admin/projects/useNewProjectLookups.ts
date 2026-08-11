import { useQuery } from '@tanstack/react-query'

import {
  getFirmEngineers,
  getGasFirmsForProjectFirm,
  getHeatingTypes,
  getProjectFirms,
  getProjectTypes,
  type FirmEngineer,
  type HeatingTypeOption,
  type Lookup,
  type ProjectTypeOption,
} from '../../../api/projects'

/** Seçim kutusu kaynakları sık değişmez; her alan odağında yeniden çekilmesin. */
const LOOKUP_STALE_MS = 5 * 60 * 1000

/** Veri gelmeden dönen boş liste TEK bir nesne: her render'da yeni `[]` üretilseydi
    listeyi izleyen etkiler (proje tipi varsayılanı) boşuna tetiklenirdi. */
const EMPTY_LIST: never[] = []

interface UseNewProjectLookupsOptions {
  isAdmin: boolean
  /** Seçili proje firması; admin olmayanda her zaman null (sunucu token'dan türetir). */
  projectFirmId: number | null
}

export interface NewProjectLookups {
  projectFirms: Lookup[]
  gasFirms: Lookup[]
  engineers: FirmEngineer[]
  projectTypes: ProjectTypeOption[]
  heatingTypes: HeatingTypeOption[]
  /** Mühendis alanı pasif mi — admin firmayı seçene kadar liste anlamsız. */
  isEngineerDisabled: boolean
}

/**
 * Formun bağımlı listeleri. Proje firması `queryKey`'in parçası: değişince
 * React Query yeni bir sorgu çalıştırır, elle "yeniden çek" çağrısı gerekmez.
 */
export function useNewProjectLookups({
  isAdmin,
  projectFirmId,
}: UseNewProjectLookupsOptions): NewProjectLookups {
  // Firma seçilmeden mühendis listesi YALNIZ admin'de anlamsız; proje firması
  // kullanıcısının firması zaten belli, alan ilk render'da açık gelir.
  const isEngineerDisabled = isAdmin && projectFirmId === null

  const projectFirmsQuery = useQuery({
    queryKey: ['projectFirms'],
    queryFn: ({ signal }) => getProjectFirms(signal),
    enabled: isAdmin,
    staleTime: LOOKUP_STALE_MS,
  })

  const gasFirmsQuery = useQuery({
    queryKey: ['gasFirmsForProjectFirm', projectFirmId],
    queryFn: ({ signal }) => getGasFirmsForProjectFirm(projectFirmId ?? 0, signal),
    enabled: isAdmin && projectFirmId !== null,
    staleTime: LOOKUP_STALE_MS,
  })

  const engineersQuery = useQuery({
    // Kimliksiz çağrı da önbelleğe girer; anahtar bu yüzden sabit bir etiket alır.
    queryKey: ['firmEngineers', projectFirmId ?? 'session'],
    queryFn: ({ signal }) => getFirmEngineers(projectFirmId ?? undefined, signal),
    enabled: !isEngineerDisabled,
    staleTime: LOOKUP_STALE_MS,
  })

  const projectTypesQuery = useQuery({
    queryKey: ['projectTypes'],
    queryFn: ({ signal }) => getProjectTypes(signal),
    staleTime: LOOKUP_STALE_MS,
  })

  const heatingTypesQuery = useQuery({
    queryKey: ['heatingTypes'],
    queryFn: ({ signal }) => getHeatingTypes(signal),
    staleTime: LOOKUP_STALE_MS,
  })

  return {
    projectFirms: projectFirmsQuery.data ?? EMPTY_LIST,
    gasFirms: gasFirmsQuery.data ?? EMPTY_LIST,
    engineers: engineersQuery.data ?? EMPTY_LIST,
    projectTypes: projectTypesQuery.data ?? EMPTY_LIST,
    heatingTypes: heatingTypesQuery.data ?? EMPTY_LIST,
    isEngineerDisabled,
  }
}
