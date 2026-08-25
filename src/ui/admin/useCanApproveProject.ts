import { ROLE_CODES } from '../../api/roles'
import { useAuthSession } from '../../api/useAuthSession'

/**
 * Onay / ret / revizyon aksiyonlarını görebilir mi (KK-2, KK-10).
 *
 * Gereksinimdeki "onay yetkisi bulunan kontrol mühendisi" üç rollü modelde
 * (Admin / GasDistributionUser / ProjectFirmUser) gaz dağıtım firması
 * kullanıcısına karşılık geliyor — projeyi onaylayan taraf dağıtım firmasıdır;
 * Admin de görür. Proje firması kullanıcısı KENDİ projesini onaylayamaz.
 *
 * Karar bilerek TEK bir yüklemin arkasında: backend ayrı bir yetki alanı
 * (`canApproveProject` gibi) açtığında yalnız bu gövde değişecek, çağıranların
 * hiçbiri değişmeyecek. Görünürlüğün tek kaynağı rol kodudur; mock izin
 * listesine bakan eski geçit SİLİNDİ, iki ayrı yetki kaynağı taşınmıyor
 * (knowledge/access-control.md).
 *
 * Bu yalnız GÖRÜNÜRLÜK kararıdır; denetim sunucunun sorumluluğu.
 */
export function useCanApproveProject(): boolean {
  const roleCode = useAuthSession()?.roleCode

  return roleCode === ROLE_CODES.admin || roleCode === ROLE_CODES.gasDistributionUser
}
