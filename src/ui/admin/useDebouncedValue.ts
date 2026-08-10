import { useEffect, useState } from 'react'

/**
 * Yazma durduktan sonra sorgunun uygulanması için beklenen süre. Kısaltılırsa
 * her tuş vuruşunda binlerce kayıt yeniden taranır, uzatılırsa arama geç
 * hisseder.
 */
export const SEARCH_DEBOUNCE_MS = 300

/**
 * Değerin gecikmeli kopyası: `value` durulana kadar eski değer döner.
 *
 * Zamanlayıcı her değişimde temizlenip yeniden kurulur — aksi hâlde hızlı yazan
 * kullanıcıda ara değerlerin hepsi sırayla uygulanırdı.
 */
export function useDebouncedValue<TValue>(value: TValue, delayMs: number): TValue {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs)
    return () => clearTimeout(timer)
  }, [value, delayMs])

  return debouncedValue
}
