import { useEffect } from 'react'

/**
 * Sekme kapatma / yenileme / adres çubuğuyla gidişte tarayıcının kendi
 * "sayfadan ayrılmak istediğinize emin misiniz" sorusunu açar (ürün kuralı:
 * kaydedilmemiş değişiklik varsa kullanıcı uyarılır).
 *
 * Dinleyici YALNIZ kirliyken kuruluyor: sürekli kayıtlı bir `beforeunload`
 * bazı tarayıcılarda geri-ileri önbelleğini (bfcache) devre dışı bırakıyor ve
 * temiz bir projeden çıkarken de soru sordurma riski taşıyor.
 *
 * Uygulama İÇİ çıkış bunun kapsamında DEĞİL — `beforeunload` yalnız belge
 * boşaltılırken çalışır, React Router gezinmesinde hiç tetiklenmez. Onun
 * karşılığı editörün kendi çıkış onayı (EditorPage → UnsavedChangesDialog);
 * router `BrowserRouter` olduğu için `useBlocker` kullanılamıyor, zaten
 * editörden çıkışın tek yolu "Projeler"/"Kapat" eylemi.
 */
export function useUnsavedChangesWarning(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return undefined

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Metin YAZILMAZ: tarayıcılar kendi genel mesajını gösteriyor, özel metin
      // yok sayılıyor. `returnValue` eski tarayıcılar için, preventDefault
      // güncel olanlar için — ikisi birlikte gerekiyor.
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])
}
