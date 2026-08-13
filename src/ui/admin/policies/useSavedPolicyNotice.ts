import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

/**
 * Poliçe Oluşturma ekranından proje detayına taşınan bildirim (KK-21). Rota
 * durumu (history state) kullanıcı tarafından değiştirilebildiği için şemadan
 * geçiyor — `useSavedDocumentNotice` ile aynı desen.
 */
const savedPolicyStateSchema = z.object({
  savedPolicyNumber: z.string().min(1),
})

/**
 * Kayıt SUNUCUYA GİTMEDİ ve bu kullanıcıdan saklanmıyor (K58'in `isPersisted`
 * deseni). Poliçe listeye gerçekten giriyor, o yüzden mesajın kendisi doğru;
 * eksik olan kalıcılık ve bunu söylemeyen bir başarı şeridi, kullanıcıya
 * yapılmamış bir işi yapılmış gösterirdi.
 */
const NOT_PERSISTED_DETAILS = [
  'Kayıt yalnız bu oturumda tutuluyor; sunucuya yazılmadı.',
  'Sayfa yenilenince poliçe listeden düşer — poliçe ucu ve veritabanı henüz yok.',
]

export interface SavedPolicyNotice {
  message: string
  details: string[]
  dismiss: () => void
}

function parseSaved(state: unknown): string | null {
  const parsed = savedPolicyStateSchema.safeParse(state)
  if (!parsed.success) return null

  return `${parsed.data.savedPolicyNumber} numaralı poliçe oluşturuldu ve projeyle ilişkilendirildi.`
}

/**
 * Mesaj İLK render'da rota durumundan okunup yerel duruma alınır, ardından
 * history state temizlenir (`replace: true`). Temizlenmeseydi sayfa
 * yenilendiğinde veya geri/ileri gidildiğinde aynı bildirim tekrar açılırdı.
 */
export function useSavedPolicyNotice(): SavedPolicyNotice | null {
  const location = useLocation()
  const navigate = useNavigate()
  const [message, setMessage] = useState<string | null>(() => parseSaved(location.state))

  useEffect(() => {
    // Etki yalnız DIŞ sistemi (History API) günceller; durum değiştirmez.
    if (location.state === null || location.state === undefined) return

    void navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])

  if (message === null) return null

  return { message, details: NOT_PERSISTED_DETAILS, dismiss: () => setMessage(null) }
}
