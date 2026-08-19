import { useCallback, useState } from 'react'

type EditorExitOptions = {
  isDirty: boolean
  /** Sunucu kaydı kabul ettiyse true döner (useProjectPersistence.save). */
  save: () => Promise<boolean>
  close: () => void
}

export type EditorExit = {
  isPromptOpen: boolean
  /** Onay penceresinden yapılan kaydetme denemesi başarısız oldu mu. */
  hasSaveFailed: boolean
  /** "Projeler" / Dosya ▸ Kapat — kirliyse sorar, temizse doğrudan çıkar. */
  requestClose: () => void
  cancel: () => void
  discardAndClose: () => void
  saveAndClose: () => Promise<void>
}

/**
 * Editörden çıkış akışı. `EditorPage`'in içinde kalsaydı dallanmayı sınamak
 * için tüm sahneyi (R3F) kurmak gerekirdi; burada saf durum olarak duruyor.
 *
 * Temizken soru sorulmaz: her çıkışta pencere açmak uyarıyı gürültüye çevirir
 * ve kullanıcı okumadan kapatmayı öğrenir.
 */
export function useEditorExit({ isDirty, save, close }: EditorExitOptions): EditorExit {
  const [isPromptOpen, setIsPromptOpen] = useState(false)
  const [hasSaveFailed, setHasSaveFailed] = useState(false)

  const requestClose = useCallback(() => {
    if (!isDirty) {
      close()
      return
    }
    // Önceki denemenin hatası yeni soruya taşınmaz.
    setHasSaveFailed(false)
    setIsPromptOpen(true)
  }, [isDirty, close])

  const saveAndClose = useCallback(async () => {
    // Çıkış YALNIZ sunucu kabul edince: başarısız kayıtta çıkılsaydı uyarının
    // amacı olan iş tam da orada kaybolurdu.
    if (await save()) close()
    else setHasSaveFailed(true)
  }, [save, close])

  return {
    isPromptOpen,
    hasSaveFailed,
    requestClose,
    cancel: useCallback(() => setIsPromptOpen(false), []),
    discardAndClose: close,
    saveAndClose,
  }
}
