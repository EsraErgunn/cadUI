import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

/** Belgedeki başarı mesajı, birebir (KK-10). */
export const FIRM_SAVED_MESSAGE = 'Firma başarıyla kaydedildi.'

/** Rota durumu kullanıcı tarafından değiştirilebildiği için şemadan geçiyor. */
const savedFirmStateSchema = z.object({ savedFirmId: z.number() })

export interface SavedFirmNotice {
  message: string
  dismiss: () => void
}

/**
 * Listeye dönüşteki başarı bildirimi (`useCreatedProjectNotice` ile aynı desen).
 *
 * Mesaj İLK render'da rota durumundan okunup yerel duruma alınır, ardından
 * history state temizlenir (`replace: true`). Temizlenmeseydi kullanıcı sayfayı
 * yenilediğinde veya geri/ileri gittiğinde aynı bildirim tekrar açılırdı.
 * Mesaj başlatıcıda yakalandığı için temizleme onu düşürmez.
 */
export function useSavedFirmNotice(): SavedFirmNotice | null {
  const location = useLocation()
  const navigate = useNavigate()
  const [isSaved, setIsSaved] = useState(
    () => savedFirmStateSchema.safeParse(location.state).success,
  )

  useEffect(() => {
    // Etki yalnız DIŞ sistemi (History API) günceller; durum değiştirmez.
    if (location.state === null || location.state === undefined) return

    void navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])

  if (!isSaved) return null

  return { message: FIRM_SAVED_MESSAGE, dismiss: () => setIsSaved(false) }
}
