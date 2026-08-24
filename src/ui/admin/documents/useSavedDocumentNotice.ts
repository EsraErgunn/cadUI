import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

/**
 * Evrak Ekle ekranından proje detayına taşınan bildirim (gereksinim 12). Rota
 * durumu (history state) kullanıcı tarafından değiştirilebildiği için şemadan
 * geçiyor — `useCreatedProjectNotice` ile aynı desen.
 */
const savedDocumentStateSchema = z.object({
  savedDocumentCount: z.number().int().positive(),
})

export const SAVED_DOCUMENT_MESSAGE = 'Evrak başarıyla yüklendi.'

export interface SavedDocumentNotice {
  message: string
  dismiss: () => void
}

function parseSaved(state: unknown): string | null {
  const parsed = savedDocumentStateSchema.safeParse(state)
  if (!parsed.success) return null

  // Tek dosyada adet yazmak gereksiz gürültü; birden çoksa kaç tane olduğunu
  // söylemek kullanıcının beklentisini doğrular.
  return parsed.data.savedDocumentCount === 1
    ? SAVED_DOCUMENT_MESSAGE
    : `${parsed.data.savedDocumentCount} evrak başarıyla yüklendi.`
}

/**
 * Mesaj İLK render'da rota durumundan okunup yerel duruma alınır, ardından
 * history state temizlenir (`replace: true`). Temizlenmeseydi sayfa
 * yenilendiğinde veya geri/ileri gidildiğinde aynı bildirim tekrar açılırdı.
 */
export function useSavedDocumentNotice(): SavedDocumentNotice | null {
  const location = useLocation()
  const navigate = useNavigate()
  const [message, setMessage] = useState<string | null>(() => parseSaved(location.state))

  useEffect(() => {
    // Etki yalnız DIŞ sistemi (History API) günceller; durum değiştirmez.
    if (location.state === null || location.state === undefined) return

    void navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])

  if (message === null) return null

  return { message, dismiss: () => setMessage(null) }
}
