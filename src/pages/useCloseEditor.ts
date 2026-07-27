import { useNavigate } from 'react-router-dom'

export const PROJECT_LIST_PATH = '/projects'

/**
 * "← Projeler" butonu ve Dosya > Kapat aynı akışı tetikler (KK-10.3);
 * tek yerde durması ikisinin zamanla ayrışmasını önler.
 *
 * Onay istenmiyor çünkü selectIsProjectDirty bu issue'da her zaman false döner
 * (KK-10.2). Tarayıcı geri tuşu ve yenileme de engellenmez (KK-10.4) — bunun için
 * bilerek beforeunload/blocker KAYDEDİLMİYOR.
 */
export function useCloseEditor(): () => void {
  const navigate = useNavigate()
  // TODO(ahmet): kaydedilmemiş değişiklik uyarısı "kaydet ve çık" issue'sunda eklenecek.
  return () => navigate(PROJECT_LIST_PATH)
}
