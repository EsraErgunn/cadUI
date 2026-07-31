import { z } from 'zod'

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

/** Arayüzün sorduğu izinler. Sunucu bu listenin dışında izin döndürebilir. */
export type Permission = 'firm.create'

const permissionListSchema = z.array(z.string())

const MOCK_LATENCY_MS = 120

/** gerçek `GET /api/me/permissions` bağlanınca mock liste silinecek. */
const MOCK_PERMISSIONS: Permission[] = ['firm.create']

export async function getMyPermissions(): Promise<string[]> {
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS))
  return permissionListSchema.parse(MOCK_PERMISSIONS)
}
