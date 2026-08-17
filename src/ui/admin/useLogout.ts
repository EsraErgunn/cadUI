import { useCallback, useState } from 'react'

import { logout } from '../../api/auth'

export interface LogoutControls {
  /** İstek uçarken düğme kilitlenir; ikinci bir çıkış isteği gitmez. */
  isLoggingOut: boolean
  requestLogout: () => void
}

/**
 * Çıkış eylemi. Yönlendirme BURADA YAPILMAZ ve `useNavigate` kullanılmaz:
 * oturum düşünce `useAuthSession` aboneleri uyanıyor ve `RequireAuth` girişe
 * yönlendiriyor (`app/RequireAuth.tsx`). Yani oturumu temizlemek yönlendirmenin
 * KENDİSİ — ikinci bir yönlendirme yazmak, süresi dolan token yolundan (http.ts
 * 401'de aynı mekanizmayı kullanıyor) farklı davranan bir çıkış demekti.
 *
 * Hata YUTULUYOR: `logout` oturumu her durumda temizlediği için çağrı dönene
 * kadar kullanıcı zaten giriş ekranına gitmiş oluyor; hata şeridi gösterecek bir
 * yüzey kalmıyor (üst bar sökülmüş durumda).
 */
export function useLogout(): LogoutControls {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const requestLogout = useCallback(() => {
    // Çift tıklama koruması: ikinci istek ilkinin token'ı düşürdüğü ana denk
    // gelip gereksiz bir 401 üretirdi.
    if (isLoggingOut) return
    setIsLoggingOut(true)

    void logout().finally(() => setIsLoggingOut(false))
  }, [isLoggingOut])

  return { isLoggingOut, requestLogout }
}
