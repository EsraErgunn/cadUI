import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { GAS_FIRM_QUERY_ROOTS } from '../../../api/adminFirms'

/**
 * Gaz dağıtım firması listesi DÖRT ayrı anahtar altında önbelleğe alınıyor ve
 * her biri başka bir ekranı besliyor. Firma eklendiğinde bir süre yalnız
 * `gasDistributionFirms` düşürülüyordu; yeni firma proje firması
 * yetkilendirmesindeki ve gaz dağıtım kullanıcısı formundaki açılırlarda
 * görünmüyor, kullanıcı sayfayı yenilemek zorunda kalıyordu.
 *
 * Aşağıdaki iki iddia o kaymayı tekrar mümkün kılmıyor: köklerin listesi
 * ekranların gerçekten kullandığı anahtarları kapsıyor ve kökle yapılan
 * geçersizleştirme kimlikli/parametreli girdileri de düşürüyor.
 */
describe('gaz dağıtım firması önbellek kökleri', () => {
  it('ekranların kullandığı anahtarların hepsini kapsar', () => {
    expect(GAS_FIRM_QUERY_ROOTS).toEqual([
      // liste sayfası + üst bardaki kapsam seçicisi
      'gasDistributionFirms',
      // proje firması yetkilendirmesinin gruba göre daraltılmış listesi
      'gasDistributionFirmsByGroup',
      // gaz dağıtım kullanıcısı formunun açılırı
      'gasDistributionFirmOptions',
      // tekil kayıt (güncelleme ekranı)
      'gasDistributionFirm',
    ])
  })

  it('kökle geçersizleştirme parametreli girdileri de düşürür', async () => {
    const client = new QueryClient()
    client.setQueryData(['gasDistributionFirms', 'all'], [])
    client.setQueryData(['gasDistributionFirmsByGroup', 4], [])
    client.setQueryData(['gasDistributionFirmOptions'], [])
    client.setQueryData(['gasDistributionFirm', 12], {})

    for (const root of GAS_FIRM_QUERY_ROOTS) {
      await client.invalidateQueries({ queryKey: [root] })
    }

    expect(client.getQueryState(['gasDistributionFirms', 'all'])?.isInvalidated).toBe(true)
    expect(client.getQueryState(['gasDistributionFirmsByGroup', 4])?.isInvalidated).toBe(true)
    expect(client.getQueryState(['gasDistributionFirmOptions'])?.isInvalidated).toBe(true)
    expect(client.getQueryState(['gasDistributionFirm', 12])?.isInvalidated).toBe(true)
  })
})
