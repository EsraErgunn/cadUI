import { useCallback, useRef, useState } from 'react'
import type { ChangeEvent, RefObject } from 'react'

import { extractProjectJson } from '../core/pdf/projectPayload'
import { ProjectDataParseError, parseProjectJson } from '../core/serialize'
import { useCadStore } from '../store/cadStore'

/**
 * Proje dosyaları `.starcad.pdf` ile bitiyor, yani uzantıları `.pdf`. Seçici
 * bu yüzden PDF kabul ediyor; içinde çizim verisi olup olmadığı ancak dosya
 * okununca anlaşılıyor, o yüzden filtre daraltılamıyor.
 */
export const PROJECT_FILE_ACCEPT = 'application/pdf,.pdf'

const NOT_A_STARCAD_FILE =
  'Bu dosya bir StarCAD proje dosyası değil: içinde çizim verisi yok.'

export type ProjectFileOpen = {
  inputRef: RefObject<HTMLInputElement | null>
  /** Son açma hatası; başarılı okuma temizler. */
  error: string | undefined
  /** Dosya seçici penceresini açar. */
  triggerOpen: () => void
  /** Gizli `<input type="file">`'ın onChange'ine bağlanır. */
  handleFileSelected: (event: ChangeEvent<HTMLInputElement>) => void
}

/**
 * Dosya > Proje Dosyasını Aç. "Proje Dosyasını İndir"in tam tersi.
 *
 * ⚠️ Sayfadaki ÇİZİM okunmuyor — okunamaz da: PDF'te duvar diye bir şey yok,
 * vektör yolları var. Okunan şey dışa aktarırken belgeye GÖMÜLEN proje JSON'u
 * (`core/pdf/projectPayload.ts`). Dolayısıyla yalnız StarCAD'in ürettiği PDF
 * açılır; başka bir programınki anlaşılır bir hatayla reddedilir.
 *
 * JSON yine `core/serialize.ts` şemasından geçiyor (CLAUDE.md güvenlik):
 * bozuk/eksik dosya store'a hiç dokunmadan reddediliyor. İçe Aktar (JSON) ile
 * AYNI doğrulama yolu — ikinci bir okuma mantığı yazılmadı.
 *
 * Kaydedilmemiş değişiklik uyarısı BİLEREK yok: İçe Aktar'da da yok
 * (useProjectImport.ts), o uyarı ayrı bir issue'da tek yerden eklenecek.
 */
export function useProjectFileOpen(): ProjectFileOpen {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | undefined>(undefined)

  const triggerOpen = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFileSelected = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Aynı dosya art arda seçilebilsin diye input hemen sıfırlanır — yoksa
    // tarayıcı "değer değişmedi" sayıp ikinci seçimde change'i hiç tetiklemez.
    event.target.value = ''
    if (!file) return

    void file
      .arrayBuffer()
      .then((buffer) => {
        // PDF bayt dizisi; latin1 her baytı birebir bir karaktere eşlediği için
        // ikili içerik bozulmadan aranabiliyor (utf-8 çözerken bozardı).
        const raw = new TextDecoder('latin1').decode(buffer)
        const json = extractProjectJson(raw)
        if (json === undefined) {
          setError(NOT_A_STARCAD_FILE)
          return
        }

        useCadStore.getState().loadProjectDrawing(parseProjectJson(json))
        setError(undefined)
      })
      .catch((cause: unknown) => {
        setError(
          cause instanceof ProjectDataParseError ? cause.message : 'Dosya okunamadı.',
        )
      })
  }, [])

  return { inputRef, error, triggerOpen, handleFileSelected }
}
