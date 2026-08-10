import { useEffect, useState } from 'react'

import { msUntilNextDay, toDayKey } from '../../../api/dayKey'

/**
 * Zamanlayıcı gece yarısından bu kadar sonraya kurulur. Kıl payı erken uyanan
 * bir `setTimeout` (tarayıcılar birkaç ms şaşabiliyor) hâlâ dünü görür ve gün
 * hiç dönmemiş gibi davranırdı.
 */
const DAY_ROLLOVER_BUFFER_MS = 500

export interface CurrentDay {
  date: Date
  /** `YYYY-MM-DD` — sorgu anahtarı ve `?date=` parametresi bu değerdir. */
  dayKey: string
}

/**
 * İçinde bulunulan takvim günü. Gün dönünce (gece yarısı) DEĞER DEĞİŞİR ve
 * bileşen yeniden render olur; ekran açık kalsa bile tarih ve güne bağlı
 * sayaçlar dünde takılı kalmaz.
 *
 * Tarih doğrudan `new Date()` ile okunsaydı da her render'da güncel görünürdü
 * ama render'ı TETİKLEYEN bir şey olmazdı: sekme gece boyunca açık kalan bir
 * ekranda dünkü tarih ve dünkü sayaçlar ekranda kalırdı.
 */
export function useCurrentDay(): CurrentDay {
  const [date, setDate] = useState(() => new Date())

  useEffect(() => {
    let timer = 0

    const refreshIfDayChanged = () => {
      const now = new Date()
      // Aynı gün içindeki uyanışlar durumu DEĞİŞTİRMEZ: her seferinde yeni bir
      // Date yazsaydık gün dönmese de sorgu yeniden çalışırdı.
      setDate((current) => (toDayKey(current) === toDayKey(now) ? current : now))
    }

    // Uyanış sonrası zamanlayıcı yeniden kuruluyor: gün dönmemişse durum
    // değişmediği için efekt tekrar çalışmaz, kendi kendini kurmayan bir
    // zamanlayıcı bir daha hiç ateşlenmezdi.
    const schedule = () => {
      timer = window.setTimeout(() => {
        refreshIfDayChanged()
        schedule()
      }, msUntilNextDay(new Date()) + DAY_ROLLOVER_BUFFER_MS)
    }

    schedule()
    // Arka plandaki sekmede tarayıcı zamanlayıcıları kısar; kullanıcı ertesi gün
    // sekmeye döndüğünde ekranın dünde kalmaması için görünürlük de dinleniyor.
    document.addEventListener('visibilitychange', refreshIfDayChanged)

    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', refreshIfDayChanged)
    }
  }, [])

  return { date, dayKey: toDayKey(date) }
}
