import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import type { NoticeTone } from '../NoticeBar'

/** Belge madde 17 / KK-24, birebir. */
export const USER_SAVED_MESSAGE = 'Kullanıcı başarıyla kaydedildi.'

/**
 * Kayıt alındı ama sunucuya YAZILMADI: kullanıcı uçlarının hiçbiri yok
 * (bkz. api/projectFirmUserForm.ts). Başarı şeridinin yanına değil YERİNE
 * geçer — iki şerit üst üste binseydi kullanıcı olumlu olanı okuyup uyarıyı
 * atlardı. "Kaydedildi" bilgisi metnin içinde duruyor, kaybolan bir şey yok.
 */
export const USER_NOT_PERSISTED_MESSAGE =
  'Kullanıcı kaydedildi, ancak sunucuya henüz yazılmıyor: bu ekranın uçları açılmadı. Kayıt yalnız bu oturumda görünür.'

/** Rota durumu kullanıcı tarafından değiştirilebildiği için şemadan geçiyor. */
const savedUserStateSchema = z.object({
  savedUserId: z.number(),
  isPersisted: z.boolean(),
})

export interface SavedProjectFirmUserNotice {
  message: string
  tone: NoticeTone
  dismiss: () => void
}

/**
 * Listeye dönüşteki kayıt bildirimi (`useCreatedProjectNotice` deseni).
 *
 * Bildirim İLK render'da rota durumundan okunup yerel duruma alınır, ardından
 * history state temizlenir: temizlenmeseydi sayfa yenilendiğinde veya geri/ileri
 * gidildiğinde aynı bildirim yeniden açılırdı.
 */
export function useSavedProjectFirmUserNotice(): SavedProjectFirmUserNotice | null {
  const location = useLocation()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(() => {
    const parsed = savedUserStateSchema.safeParse(location.state)
    return parsed.success ? parsed.data : null
  })

  useEffect(() => {
    // Etki yalnız DIŞ sistemi (History API) günceller; durum değiştirmez.
    if (location.state === null || location.state === undefined) return

    void navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])

  if (saved === null) return null

  return {
    message: saved.isPersisted ? USER_SAVED_MESSAGE : USER_NOT_PERSISTED_MESSAGE,
    tone: saved.isPersisted ? 'success' : 'warning',
    dismiss: () => setSaved(null),
  }
}
