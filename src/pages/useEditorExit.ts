import { useCallback, useState } from 'react'

/**
 * Gezinmeyi durduran engelin bu akışa bakan yüzü. React Router'ın `Blocker`
 * tipi doğrudan alınmıyor: hook o zaman veri router'ı olmadan test edilemezdi
 * ve dallanmayı sınamak için tüm rota ağacını kurmak gerekirdi.
 */
export type ExitBlocker = {
  isBlocked: boolean
  /** Durdurulan gezinmeyi sürdürür (hangi hedefe gidiliyorsa oraya). */
  proceed: () => void
  /** Gezinmeyi iptal eder, kullanıcı editörde kalır. */
  reset: () => void
}

type EditorExitOptions = {
  blocker: ExitBlocker
  /** Sunucu kaydı kabul ettiyse true döner (useProjectPersistence.save). */
  save: () => Promise<boolean>
}

export type EditorExit = {
  isPromptOpen: boolean
  /** Onay penceresinden yapılan kaydetme denemesi başarısız oldu mu. */
  hasSaveFailed: boolean
  cancel: () => void
  discardAndClose: () => void
  saveAndClose: () => Promise<void>
}

/**
 * Editörden çıkış akışı. Soruyu AÇAN şey artık düğme değil, durdurulmuş
 * gezinmenin kendisi: "Projeler", Dosya ▸ Kapat, tarayıcının GERİ tuşu ve
 * ileride eklenecek her uygulama içi bağlantı aynı kapıdan geçiyor (K111).
 * Düğmeye bağlı olsaydı geri tuşu uyarısız çıkardı — nitekim çıkıyordu.
 *
 * Temizken engel hiç kurulmuyor (`useBlocker(isDirty)`), yani soru da sorulmaz:
 * her çıkışta pencere açmak uyarıyı gürültüye çevirir ve kullanıcı okumadan
 * kapatmayı öğrenir.
 */
export function useEditorExit({ blocker, save }: EditorExitOptions): EditorExit {
  const [hasSaveFailed, setHasSaveFailed] = useState(false)

  const cancel = useCallback(() => {
    // Bayrak pencere KAPANIRKEN temizleniyor: bir sonraki soru önceki denemenin
    // hatasıyla açılmasın. Effect'e gerek yok, pencereyi kapatan tek yol bu.
    setHasSaveFailed(false)
    blocker.reset()
  }, [blocker])

  const saveAndClose = useCallback(async () => {
    // Çıkış YALNIZ sunucu kabul edince: başarısız kayıtta çıkılsaydı uyarının
    // kurtarmaya çalıştığı iş tam da orada kaybolurdu.
    if (await save()) blocker.proceed()
    else setHasSaveFailed(true)
  }, [save, blocker])

  return {
    isPromptOpen: blocker.isBlocked,
    hasSaveFailed,
    cancel,
    discardAndClose: blocker.proceed,
    saveAndClose,
  }
}
