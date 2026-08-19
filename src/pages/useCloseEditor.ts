import { useNavigate } from 'react-router-dom'

export const PROJECT_LIST_PATH = '/projects'

/**
 * "← Projeler" butonu ve Dosya > Kapat aynı akışı tetikler (KK-10.3);
 * tek yerde durması ikisinin zamanla ayrışmasını önler.
 *
 * Bu hook yalnız GEZİNİR ve onay SORMAZ. Kaydedilmemiş değişiklik penceresini
 * açan şey düğme değil, gezinmenin router tarafından DURDURULMASI
 * (`useBlocker`, K111) — geri tuşu da aynı kapıdan geçsin diye. Buraya onay
 * eklenirse aynı soru iki yerden sorulur.
 */
export function useCloseEditor(): () => void {
  const navigate = useNavigate()
  //  kaydedilmemiş değişiklik uyarısı "kaydet ve çık" issue'sunda eklenecek.
  return () => navigate(PROJECT_LIST_PATH)
}
