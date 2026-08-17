import { useCallback, useRef, useState } from 'react'
import type { ChangeEvent, RefObject } from 'react'

import { ProjectDataParseError, parseProjectJson } from '../core/serialize'
import { useCadStore } from '../store/cadStore'

export type ProjectImport = {
  inputRef: RefObject<HTMLInputElement | null>
  /** Son içe aktarma hatası; başarılı okuma temizler. */
  error: string | undefined
  /** Dosya seçici penceresini açar. */
  triggerImport: () => void
  /** Gizli `<input type="file">`'ın onChange'ine bağlanır. */
  handleFileSelected: (event: ChangeEvent<HTMLInputElement>) => void
}

/**
 * Dosya > İçe Aktar. Seçilen JSON, core/serialize.ts'in şemasından geçmeden
 * store'a girmez (CLAUDE.md güvenlik) — bozuk/eksik dosya store'a hiç
 * dokunmadan reddedilir, `error` kullanıcıya nedeni söyler.
 *
 * Kaydedilmemiş değişiklik uyarısı BİLEREK yok — "Kapat" da aynı nedenle
 * yok (useCloseEditor.ts): o uyarı ayrı bir issue'da tek yerden eklenecek.
 */
export function useProjectImport(): ProjectImport {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | undefined>(undefined)

  const triggerImport = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const handleFileSelected = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Aynı dosya art arda seçilebilsin diye input hemen sıfırlanır — yoksa
    // tarayıcı "değer değişmedi" sayıp ikinci seçimde change'i hiç tetiklemez.
    event.target.value = ''
    if (!file) return

    void file.text().then((raw) => {
      try {
        const data = parseProjectJson(raw)
        useCadStore.getState().loadProject(data)
        setError(undefined)
      } catch (cause) {
        setError(cause instanceof ProjectDataParseError ? cause.message : 'Dosya okunamadı.')
      }
    })
  }, [])

  return { inputRef, error, triggerImport, handleFileSelected }
}
