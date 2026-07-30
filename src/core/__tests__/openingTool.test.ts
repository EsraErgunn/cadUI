import { describe, expect, it } from 'vitest'

import {
  findOpeningGrab,
  findOpeningUnderPoint,
  resolveOpeningPreview,
  type OpeningToolContext,
} from '../openingTool'
import { FLOOR_ID, horizontal, leftCorner, points, rightCorner, window12 } from './openingFixture'

const TOLERANCE_CM = 5

// Çapraz duvar (11) bilinçli dışarıda: bu testler tek duvar seçimini sınıyor.
const context: OpeningToolContext = {
  points,
  walls: [horizontal, rightCorner, leftCorner],
  openings: [window12],
  floorId: FLOOR_ID,
  toleranceCm: TOLERANCE_CM,
}

const doorRequest = { type: 'door' as const, widthCm: 90 }

describe('resolveOpeningPreview', () => {
  it('duvarın üstündeki imleç için önizleme üretir', () => {
    expect(resolveOpeningPreview({ x: 100, y: 0 }, context, doorRequest)).toEqual({
      wallId: 8,
      offsetCm: 100,
      widthCm: 90,
      type: 'door',
      isValid: true,
      outline: [
        { x: 55, y: -10 },
        { x: 145, y: -10 },
        { x: 145, y: 10 },
        { x: 55, y: 10 },
      ],
    })
  })

  it('kalınlık bandının içinde kalan imleci duvarın üstünde sayar', () => {
    // 20 cm duvarın yarım bandı 10 cm; resolveSnap'in px eşiği bunu bilmiyor.
    const narrow = { ...context, toleranceCm: 0 }
    expect(resolveOpeningPreview({ x: 100, y: 8 }, narrow, doorRequest)?.wallId).toBe(8)
  })

  it('kalınlık bandının dışında önizleme üretmez', () => {
    const narrow = { ...context, toleranceCm: 0 }
    expect(resolveOpeningPreview({ x: 100, y: 12 }, narrow, doorRequest)).toBeUndefined()
  })

  it('köşenin dibinde bile duvarı bulur', () => {
    // Köşede resolveSnap kind:'point' dönüp wallId vermiyor; kalınlığa duyarlı
    // isabet testi olmasa köşe yakınında önizleme hiç çıkmazdı.
    expect(resolveOpeningPreview({ x: 497, y: 0 }, context, doorRequest)?.wallId).toBe(8)
  })

  it('duvarın orta noktasına yapışır', () => {
    // getSnapPoints'ten gelen orta nokta: 248 → 250. Sabit aralıklı snap yok (K12).
    expect(resolveOpeningPreview({ x: 248, y: 0 }, context, doorRequest)?.offsetCm).toBe(250)
  })

  it('snap noktası uzaktaysa ham offseti korur', () => {
    expect(resolveOpeningPreview({ x: 100, y: 0 }, context, doorRequest)?.offsetCm).toBe(100)
  })

  it('var olan açıklıkla çakışan yerde önizleme gösterir ama geçersiz işaretler', () => {
    // Önizleme duvar üzerindeyken her zaman görünür; reddedilen şey yerleştirmedir.
    const preview = resolveOpeningPreview({ x: 200, y: 0 }, context, doorRequest)
    expect(preview?.wallId).toBe(8)
    expect(preview?.isValid).toBe(false)
  })

  it('köşe payının içini geçersiz işaretler', () => {
    expect(resolveOpeningPreview({ x: 10, y: 0 }, context, doorRequest)?.isValid).toBe(false)
  })

  it('taşınan açıklık kendi yerinde geçerli kalır', () => {
    const preview = resolveOpeningPreview({ x: 250, y: 0 }, context, {
      type: 'window',
      widthCm: 120,
      movingOpeningId: 12,
    })
    expect(preview?.offsetCm).toBe(250)
    expect(preview?.isValid).toBe(true)
  })

  it('tutma farkını koruyarak taşır, açıklık imlece zıplamaz', () => {
    // Pencere 250'de, imleç 220'de yakalandı → grabDelta 30. İmleç 300'e gidince
    // ortası 330 olur; snap toleransı içindeki bir nokta yoksa aynen kalır.
    const preview = resolveOpeningPreview({ x: 300, y: 0 }, context, {
      type: 'window',
      widthCm: 120,
      movingOpeningId: 12,
      grabDeltaCm: 30,
    })
    expect(preview?.offsetCm).toBe(330)
  })

  it('hiçbir duvarın üstünde değilse önizleme yok', () => {
    expect(resolveOpeningPreview({ x: 250, y: 200 }, context, doorRequest)).toBeUndefined()
  })

  it('başka kattaki duvarı görmez', () => {
    const otherFloor = { ...context, floorId: 2 }
    expect(resolveOpeningPreview({ x: 100, y: 0 }, otherFloor, doorRequest)).toBeUndefined()
  })

  it('asgari genişliğin altındaki isteği geçersiz işaretler', () => {
    const preview = resolveOpeningPreview({ x: 100, y: 0 }, context, {
      type: 'door',
      widthCm: 1,
    })
    expect(preview?.isValid).toBe(false)
  })
})

describe('findOpeningUnderPoint', () => {
  it('açıklığın üstündeki noktada o açıklığı verir', () => {
    expect(findOpeningUnderPoint({ x: 250, y: 0 }, context)).toEqual(window12)
  })

  it('açıklığın kenarında hâlâ onu verir', () => {
    expect(findOpeningUnderPoint({ x: 190, y: 0 }, context)?.id).toBe(12)
  })

  it('açıklığın 5 cm dışında undefined döner', () => {
    // Ham izdüşüm kullanılır; snap 185'i 190'a çekseydi burada yanlışlıkla isabet olurdu.
    expect(findOpeningUnderPoint({ x: 185, y: 0 }, context)).toBeUndefined()
  })

  it('duvarın üstünde ama açıklıksız yerde undefined döner', () => {
    expect(findOpeningUnderPoint({ x: 100, y: 0 }, context)).toBeUndefined()
  })

  it('duvarın dışında undefined döner', () => {
    expect(findOpeningUnderPoint({ x: 250, y: 200 }, context)).toBeUndefined()
  })
})

describe('findOpeningGrab', () => {
  it('tutma farkını açıklığın ortasına göre verir', () => {
    // Pencerenin ortası 250, imleç 220'de → sürüklerken 30 cm fark korunur.
    expect(findOpeningGrab({ x: 220, y: 0 }, context)).toEqual({
      opening: window12,
      grabDeltaCm: 30,
    })
  })

  it('tam ortadan tutunca fark sıfırdır', () => {
    expect(findOpeningGrab({ x: 250, y: 0 }, context)?.grabDeltaCm).toBe(0)
  })

  it('açıklık yoksa undefined döner', () => {
    expect(findOpeningGrab({ x: 100, y: 0 }, context)).toBeUndefined()
  })
})
