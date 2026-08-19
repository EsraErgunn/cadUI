import { useNavigate } from 'react-router-dom'

export const PROJECT_LIST_PATH = '/projects'

/**
 * Editörden çıkış. Menüdeki "Kapat" maddesi K111'de kalktı (aynı işi yapan iki
 * düğme vardı), geriye üst bardaki "← Projeler" kaldı — yol yine de tek yerde
 * duruyor: kimin çağırdığından bağımsız olarak hedef burada tanımlı.
 *
 * Bu hook yalnız GEZİNİR ve onay SORMAZ. Kaydedilmemiş değişiklik penceresini
 * açan şey düğme değil, gezinmenin router tarafından DURDURULMASI
 * (`useBlocker`, K112) — geri tuşu da aynı kapıdan geçsin diye. Buraya onay
 * eklenirse aynı soru iki yerden sorulur.
 */
export function useCloseEditor(): () => void {
  const navigate = useNavigate()
  //  kaydedilmemiş değişiklik uyarısı "kaydet ve çık" issue'sunda eklenecek.
  return () => navigate(PROJECT_LIST_PATH)
}
