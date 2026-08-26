import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import type { NoticeTone } from './NoticeBar'

/**
 * Belgedeki başarı mesajı, birebir (gaz dağıtım firmaları KK-10, proje
 * firmaları KK-8). İki liste ekranı da aynı bildirimi kullandığı için hook
 * `firms/` altından ortak `admin/` köküne taşındı (CLAUDE.md → Klasör sözleşmesi).
 */
export const FIRM_SAVED_MESSAGE = 'Firma başarıyla kaydedildi.'

/**
 * Firma kaydedildi ama yetkilendirmeler sunucuya yazılamadı: yetkilendirme
 * yazan uç henüz yok (bkz. api/projectFirmForm.ts).
 *
 * Başarı şeridinin YANINA değil YERİNE geçer: iki şerit üst üste binseydi
 * kullanıcı olumlu olanı okuyup uyarıyı atlardı. Metin "kaydedildi" bilgisini
 * de taşıyor, yani kaybolan bir şey yok.
 */
/**
 * Kısmi başarı: firma kaydı geçti, bazı yetkilendirmeler geçmedi ve geri
 * ALINMADI. Firmalar ADIYLA sayılıyor — "bazı yetkilendirmeler kaydedilemedi"
 * demek, kullanıcıya hangisini elle tamamlayacağını söylemezdi.
 */
export function buildFailedAuthorizationsMessage(firmNames: readonly string[]): string {
  return (
    `Firma kaydedildi, ancak şu gaz dağıtım firmalarının yetkilendirmesi ` +
    `kurulamadı: ${firmNames.join(', ')}. Firma güncelleme ekranından tekrar deneyin.`
  )
}

/**
 * Rota durumu kullanıcı tarafından değiştirilebildiği için şemadan geçiyor.
 * Bayrak opsiyonel: gaz dağıtım firma ekranı onu hiç göndermiyor.
 */
const savedFirmStateSchema = z.object({
  savedFirmId: z.number(),
  failedAuthorizationFirms: z.array(z.string()).optional(),
})

export interface SavedFirmNotice {
  message: string
  tone: NoticeTone
  dismiss: () => void
}

/**
 * Listeye dönüşteki kayıt bildirimi (`useCreatedProjectNotice` ile aynı desen).
 *
 * Bildirim İLK render'da rota durumundan okunup yerel duruma alınır, ardından
 * history state temizlenir (`replace: true`). Temizlenmeseydi kullanıcı sayfayı
 * yenilediğinde veya geri/ileri gittiğinde aynı bildirim tekrar açılırdı.
 * Değer başlatıcıda yakalandığı için temizleme onu düşürmez.
 */
export function useSavedFirmNotice(): SavedFirmNotice | null {
  const location = useLocation()
  const navigate = useNavigate()
  const [saved, setSaved] = useState(() => {
    const parsed = savedFirmStateSchema.safeParse(location.state)
    return parsed.success ? parsed.data : null
  })

  useEffect(() => {
    // Etki yalnız DIŞ sistemi (History API) günceller; durum değiştirmez.
    if (location.state === null || location.state === undefined) return

    void navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])

  if (saved === null) return null

  const failed = saved.failedAuthorizationFirms ?? []

  return {
    message: failed.length === 0 ? FIRM_SAVED_MESSAGE : buildFailedAuthorizationsMessage(failed),
    tone: failed.length === 0 ? 'success' : 'warning',
    dismiss: () => setSaved(null),
  }
}
