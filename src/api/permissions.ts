import { z } from 'zod'

import { isMockDataAllowed } from './mockGate'

/**
 * API SÖZLEŞMESİ — oturumdaki yöneticinin izinleri.
 *
 * GET /api/me/permissions → string[]   (ör. ["firm.create", "firm.update"])
 *
 * Bilinçli olarak DÜZ string listesi: knowledge/access-control.md erişim modelini
 * (tek sahip mi, çoklu rol mü) açık soru olarak işaretliyor. Rol/sahiplik yapısını
 * burada modellemek o soruyu varsayımla kapatmak olurdu. Arayüz yalnızca "şu izin
 * var mı" diye sorar; izinlerin nasıl hesaplandığı sunucuda kalır.
 */

/**
 * Arayüzün sorduğu izinler. Sunucu bu listenin dışında izin döndürebilir.
 *
 * Kalıp `<varlık>.<eylem>`. Gösterge panelindeki hızlı işlemler bu anahtarlara
 * bakar; "Projeleri Görüntüle" için anahtar YOK — proje listesi sol menüden
 * zaten korumasız açılıyor, kısayolu gizlemek tutarsız olurdu (K28).
 */
export type Permission = 'firm.create' | 'projectFirm.create' | 'user.create'

const permissionListSchema = z.array(z.string())

const MOCK_LATENCY_MS = 120

/** gerçek `GET /api/me/permissions` bağlanınca mock liste silinecek. */
const MOCK_PERMISSIONS: Permission[] = ['firm.create', 'projectFirm.create', 'user.create']

/**
 * Sunucuda `GET /api/me/permissions` HÂLÂ YOK.
 *
 * Mock liste artık `isMockDataAllowed()` kapısının arkasında: üretim
 * derlemesinde BOŞ dizi dönüyor. Eskiden üretimde de üç iznin tamamı
 * dönüyordu, yani izin denetimi yapılıyormuş gibi görünen yüzey aslında herkese
 * her düğmeyi açıyordu — "kapalı olduğunu sandığın kapı" en kötü hâl.
 *
 * Boş dizi FAIL-CLOSED: izne bağlı kısayollar üretimde çizilmez. Bu, gerçek uç
 * gelene kadar doğru varsayılan — görünürlük kısıtı zaten yalnız arayüz içindir,
 * asıl denetim sunucuda (knowledge/access-control.md).
 */
export async function getMyPermissions(): Promise<string[]> {
  if (!isMockDataAllowed()) return []

  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))
  return permissionListSchema.parse(MOCK_PERMISSIONS)
}
