import { useQuery } from '@tanstack/react-query'

import { getCurrentUser } from '../../../api/auth'
import { getAuthorizedGasFirms, getGasFirmName } from '../../../api/projectFirmAuthorizations'
import { ROLE_CODES } from '../../../api/roles'
import { useRoleCode } from '../useRole'

export interface OwnGasFirmRow {
  id: number
  name: string
  /** Yalnız tekil kayıtta geliyor; yetki satırı grup bilgisi taşımıyor. */
  groupName: string | null
}

export interface OwnGasFirms {
  /** `undefined` = henüz yüklenmedi. Boş dizi "bağ yok" demek değil, `hasNoFirmLink`e bak. */
  rows: OwnGasFirmRow[] | undefined
  isPending: boolean
  isError: boolean
  /** Oturumdaki kullanıcının firma bağı yok; hiçbir firma isteği atılmadı. */
  hasNoFirmLink: boolean
  refetch: () => void
}

/**
 * Kullanıcının BAĞLI OLDUĞU gaz dağıtım firmaları.
 *
 * İki rol, iki ayrı kaynak — çünkü tek bir uç ikisini birden vermiyor ve
 * yönetimin listesi (`GET /api/gasdistributionfirms`) sunucuda
 * `Authorize(Roles = Admin)`:
 * - Proje firması kullanıcısı: kendi firmasının YETKİ kayıtlarından
 *   (`GET /api/project-firm-authorizations?ProjectFirmId=`), yani bugün
 *   yürürlükte olan bağlar. Birden fazla olabilir.
 * - Gaz dağıtım kullanıcısı: kendi firmasının tekil kaydından
 *   (`GET /api/gasdistributionfirms/{id}`) — tek satır.
 *
 * Kimlik HİÇBİR yerde sabit değil, `GET /api/auth/me`'den geliyor; bağ yoksa
 * istek hiç atılmıyor ve tablo uydurma satırla doldurulmuyor.
 */
export function useOwnGasFirms(): OwnGasFirms {
  const roleCode = useRoleCode()
  const isProjectFirmUser = roleCode === ROLE_CODES.projectFirmUser
  const isGasDistributionUser = roleCode === ROLE_CODES.gasDistributionUser

  // Anahtar Kişi Bilgileri ekranıyla ORTAK: iki ekran aynı kaydı ikinci kez
  // indirmesin. İstek YALNIZ bu iki rolde açılıyor: yöneticide dönecek bir
  // "kendi firmam" kümesi yok ve kabuk her ekranda mount olduğu için gereksiz
  // bir `/api/auth/me` isteği her sayfada tekrarlanırdı.
  const meQuery = useQuery({
    queryKey: ['currentUser'],
    queryFn: ({ signal }) => getCurrentUser({ signal }),
    enabled: isProjectFirmUser || isGasDistributionUser,
  })

  const projectFirmId = meQuery.data?.projectFirmId ?? null
  const gasFirmId = meQuery.data?.gasDistributionFirmId ?? null

  const isAuthorizedQueryEnabled = isProjectFirmUser && projectFirmId !== null
  const authorizedQuery = useQuery({
    queryKey: ['ownGasFirms', 'authorized', projectFirmId],
    queryFn: ({ signal }) => getAuthorizedGasFirms(projectFirmId ?? 0, signal),
    enabled: isAuthorizedQueryEnabled,
  })

  // Ad YETKİ ucundan: `GET /api/gasdistributionfirms/{id}` sunucuda
  // `[Authorize(Roles = Admin)]` ve bu rolde 403 dönüyordu — seçici ve liste
  // sessizce boş kalıyordu.
  const isOwnFirmQueryEnabled = isGasDistributionUser && gasFirmId !== null
  const ownFirmQuery = useQuery({
    queryKey: ['ownGasFirms', 'name', gasFirmId],
    queryFn: ({ signal }) => getGasFirmName(gasFirmId ?? 0, signal),
    enabled: isOwnFirmQueryEnabled,
  })

  const hasNoFirmLink =
    meQuery.data !== undefined &&
    ((isProjectFirmUser && projectFirmId === null) ||
      (isGasDistributionUser && gasFirmId === null))

  const refetch = () => {
    void meQuery.refetch()
    if (isAuthorizedQueryEnabled) void authorizedQuery.refetch()
    if (isOwnFirmQueryEnabled) void ownFirmQuery.refetch()
  }

  if (isGasDistributionUser) {
    const firmName = ownFirmQuery.data
    return {
      rows:
        firmName === undefined || gasFirmId === null
          ? hasNoFirmLink
            ? []
            : undefined
          // Grup adı yetki satırında YOK; uydurulmuyor, boş değer işareti çizilir.
          : [{ id: gasFirmId, name: firmName ?? '', groupName: null }],
      // `enabled: false` iken react-query durumu yine "pending" der; bekleyiş
      // yalnız isteğin GERÇEKTEN açık olduğu hâlde var.
      isPending: meQuery.isPending || (isOwnFirmQueryEnabled && ownFirmQuery.isPending),
      isError: meQuery.isError || ownFirmQuery.isError,
      hasNoFirmLink,
      refetch,
    }
  }

  const firms = authorizedQuery.data
  return {
    rows:
      firms === undefined
        ? hasNoFirmLink
          ? []
          : undefined
        : firms.map((firm) => ({ id: firm.id, name: firm.name, groupName: null })),
    isPending: meQuery.isPending || (isAuthorizedQueryEnabled && authorizedQuery.isPending),
    isError: meQuery.isError || authorizedQuery.isError,
    hasNoFirmLink,
    refetch,
  }
}
