import { useNavigate } from 'react-router-dom'

export const PROJECT_LIST_PATH = '/projects'

/**
 * "← Projeler" butonu ve Dosya > Kapat aynı akışı tetikler (KK-10.3);
 * tek yerde durması ikisinin zamanla ayrışmasını önler.
 *
 * Bu hook yalnız GEZİNİR; kaydedilmemiş değişiklik onayı çağıranda
 * (EditorPage → UnsavedChangesDialog). Ayrım bilinçli: "çıkmayı iste" ile
 * "çık" farklı adımlar, onay penceresinin "Kaydetmeden Çık" düğmesi de sonuçta
 * buraya geliyor. Tarayıcı kapatma/yenileme ayrı yoldan uyarılıyor
 * (`useUnsavedChangesWarning`) — `beforeunload` router gezinmesinde tetiklenmez.
 */
export function useCloseEditor(): () => void {
  const navigate = useNavigate()
  //  kaydedilmemiş değişiklik uyarısı "kaydet ve çık" issue'sunda eklenecek.
  return () => navigate(PROJECT_LIST_PATH)
}
