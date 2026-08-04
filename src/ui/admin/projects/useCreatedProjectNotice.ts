import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

/**
 * Yeni proje oluşturulduğunda listeye taşınan bildirim. Rota durumu (history
 * state) kullanıcı tarafından değiştirilebildiği için şemadan geçiyor.
 */
const createdProjectStateSchema = z.object({
  createdProjectName: z.string(),
  createdProjectPId: z.string(),
})

/** Vurgu kalıcı olsaydı satır "seçili" gibi okunur, kullanıcı bir süre sonra
    neden farklı olduğunu bilemezdi. Şeridin okunmasına yetecek kadar kısa. */
const HIGHLIGHT_DURATION_MS = 6000

export interface CreatedProjectNotice {
  message: string
  /** Listede vurgulanacak satırın proje numarası; süre dolunca `null` olur. */
  highlightedPId: string | null
  dismiss: () => void
}

export function buildCreatedProjectMessage(name: string, pId: string): string {
  return `"${name}" taslak olarak oluşturuldu. Proje numarası: ${pId}`
}

interface CreatedProject {
  message: string
  pId: string
}

function parseCreated(state: unknown): CreatedProject | null {
  const parsed = createdProjectStateSchema.safeParse(state)
  if (!parsed.success) return null

  return {
    message: buildCreatedProjectMessage(
      parsed.data.createdProjectName,
      parsed.data.createdProjectPId,
    ),
    pId: parsed.data.createdProjectPId,
  }
}

/**
 * Listeye dönüşteki başarı bildirimi.
 *
 * Mesaj İLK render'da rota durumundan okunup yerel duruma alınır, ardından
 * history state temizlenir (`replace: true`). Temizlenmeseydi kullanıcı sayfayı
 * yenilediğinde veya geri/ileri gittiğinde aynı bildirim tekrar açılırdı.
 * Mesaj başlatıcıda yakalandığı için temizleme onu düşürmez.
 */
export function useCreatedProjectNotice(): CreatedProjectNotice | null {
  const location = useLocation()
  const navigate = useNavigate()
  const [created, setCreated] = useState<CreatedProject | null>(() => parseCreated(location.state))
  // Vurgu şeritten ÖNCE söner; ikisi ayrı durumda, kullanıcı şeridi kapatmadan
  // da satır normale döner.
  const [highlightedPId, setHighlightedPId] = useState<string | null>(
    () => parseCreated(location.state)?.pId ?? null,
  )

  useEffect(() => {
    // Etki yalnız DIŞ sistemi (History API) günceller; durum değiştirmez.
    if (location.state === null || location.state === undefined) return

    void navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])

  useEffect(() => {
    if (highlightedPId === null) return

    const timer = setTimeout(() => setHighlightedPId(null), HIGHLIGHT_DURATION_MS)
    return () => clearTimeout(timer)
  }, [highlightedPId])

  if (created === null) return null

  return { message: created.message, highlightedPId, dismiss: () => setCreated(null) }
}
