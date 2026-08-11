import { z } from 'zod'

/**
 * Yayınlanan duyuruların TARAYICI tarafındaki kalıcı deposu.
 *
 * Sunucuda duyuru ucu YOK (entity, tablo, controller hiçbiri) ve yakın planda
 * da yok. Uç gelene kadar yayınlanan duyuru sekme yenilenince kayboluyordu;
 * bu depo onu `localStorage`'da tutar.
 *
 * SAHTE KALICILIK OLDUĞU GİZLENMEZ: kayıt yalnız bu tarayıcıda durur, başka
 * makinede ve başka kullanıcıda görünmez. Ekran bunu söyleyen uyarıyı
 * göstermeye devam eder — kullanıcı "yayınladım, herkes gördü" sanmasın.
 *
 * Depodan okunan veri DIŞ KAYNAK sayılır ve şemadan geçer (CLAUDE.md güvenlik):
 * kullanıcı `localStorage`'ı elle düzenleyebilir, başka bir sürüm başka bir
 * biçim yazmış olabilir. Bozuk içerik sessizce YOK SAYILIR — duyuru listesi
 * uğruna anasayfayı çökertmek doğru takas değil.
 *
 * TODO(esra): duyuru uçları açılınca bu dosya ve çağıranları silinecek.
 */

const STORAGE_KEY = 'starcad.admin.announcements.v1'

const storedAnnouncementSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  body: z.string(),
  publishedAt: z.string(),
  source: z.string(),
  region: z.string().nullable(),
})

const storedAnnouncementsSchema = z.array(storedAnnouncementSchema)

export type StoredAnnouncement = z.infer<typeof storedAnnouncementSchema>

/**
 * `localStorage` her ortamda yok (SSR, kısıtlı gizlilik ayarı) ve dolu kotada
 * yazma hata fırlatır. Erişim tek yerden ve korumalı: depo çalışmazsa ekran
 * eski davranışına (yalnız oturum içi) düşer, patlamaz.
 */
function readStorage(): string | null {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) ?? null
  } catch {
    return null
  }
}

function writeStorage(value: string): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, value)
  } catch {
    // Kota dolu ya da depo kapalı: kayıt oturum içinde yaşamaya devam eder.
  }
}

export function readStoredAnnouncements(): StoredAnnouncement[] {
  const raw = readStorage()
  if (raw === null) return []

  try {
    const parsed = storedAnnouncementsSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : []
  } catch {
    // JSON bile değil; depo bozulmuş sayılır.
    return []
  }
}

export function appendStoredAnnouncement(announcement: StoredAnnouncement): void {
  writeStorage(JSON.stringify([...readStoredAnnouncements(), announcement]))
}

/** Testlerin ve "temiz başlangıç" ihtiyacının tek kapısı. */
export function clearStoredAnnouncements(): void {
  try {
    globalThis.localStorage?.removeItem(STORAGE_KEY)
  } catch {
    // Depo kapalıysa temizlenecek bir şey de yok.
  }
}
