import { useSyncExternalStore } from 'react'

import { getAuthSession, subscribeAuthSession, type AuthSession } from './authToken'

/**
 * Oturumun React yüzü. Kaynak authToken.ts'teki modül değişkeni; burada
 * kopyalanmıyor, yalnız abone olunuyor — iki kaynak olsaydı 401 sonrası
 * http.ts token'ı atarken arayüz hâlâ "giriş yapılmış" gösterirdi.
 */
export function useAuthSession(): AuthSession | undefined {
  return useSyncExternalStore(subscribeAuthSession, getAuthSession, getServerSnapshot)
}

// SSR yok; getServerSnapshot yalnız useSyncExternalStore sözleşmesi için var.
function getServerSnapshot(): AuthSession | undefined {
  return undefined
}
