import { describe, expect, it } from 'vitest'

import { msUntilNextDay, toDayKey } from '../dayKey'

const HOUR_MS = 60 * 60 * 1000

describe('toDayKey', () => {
  it('yerel takvim gününü iki basamaklı biçimde verir', () => {
    expect(toDayKey(new Date(2026, 7, 9, 14, 30))).toBe('2026-08-09')
  })

  it('gece yarısına yakın saatlerde günü kaydırmaz', () => {
    // UTC'ye çeviren bir çözüm bu iki anı FARKLI güne yazardı; yerel gün aynı.
    expect(toDayKey(new Date(2026, 7, 9, 0, 15))).toBe('2026-08-09')
    expect(toDayKey(new Date(2026, 7, 9, 23, 45))).toBe('2026-08-09')
  })

  it('ay ve gün tek basamaklıyken sıfırla tamamlar', () => {
    expect(toDayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('msUntilNextDay', () => {
  it('gece yarısına kalan süreyi verir', () => {
    expect(msUntilNextDay(new Date(2026, 7, 9, 23, 0))).toBe(HOUR_MS)
  })

  it('gece yarısında tam bir gün döndürür — asla sıfır veya negatif', () => {
    const atMidnight = msUntilNextDay(new Date(2026, 7, 9, 0, 0, 0, 0))

    expect(atMidnight).toBeGreaterThan(0)
  })

  it('ay sonunda bir sonraki ayın ilk gününe bakar', () => {
    expect(msUntilNextDay(new Date(2026, 7, 31, 23, 0))).toBe(HOUR_MS)
  })

  it('yıl sonunda bir sonraki yıla taşar', () => {
    expect(msUntilNextDay(new Date(2026, 11, 31, 23, 0))).toBe(HOUR_MS)
  })
})
