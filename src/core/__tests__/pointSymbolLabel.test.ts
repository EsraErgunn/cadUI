import { describe, expect, it } from 'vitest'

import { SYMBOL_DISPLAY } from '../architectureSymbol'
import type { PointSymbol, PointSymbolType } from '../model'
import {
  getPointSymbolLabelAnchorCm,
  getPointSymbolLabelOffsetCm,
  getPointSymbolNameLabel,
  getPointSymbolWorldBoundsCm,
  pickPointSymbolLabelAt,
} from '../pointSymbolLabel'
import type { SymbolPose } from '../symbolPlacement'

const ALL_TYPES = Object.keys(SYMBOL_DISPLAY) as PointSymbolType[]

/** Duvara yatay bağlı, işareti +y yönünde duran cihaz. */
const POSE: SymbolPose = {
  position: { x: 200, y: 100 },
  rotationDeg: 0,
  outwardSign: 1,
  wallThicknessCm: 20,
}

/** Zoom 1 = 1 cm başına 1 piksel; testlerde px ↔ cm birebir okunsun. */
const ZOOM = 1

describe('getPointSymbolNameLabel', () => {
  it('TÜRÜN adını verir, cihazın kodunu değil', () => {
    expect(getPointSymbolNameLabel('earthquakeSensor')).toBe('Deprem Sensörü')
    expect(getPointSymbolNameLabel('fireExtinguisher')).toBe('Yangın Söndürücü')
  })

  it('HER cihaz tipi etiketlenir — hiçbiri boş kalmaz (kullanıcı: "hepsine")', () => {
    for (const type of ALL_TYPES) {
      expect(getPointSymbolNameLabel(type).length).toBeGreaterThan(0)
    }
  })
})

describe('getPointSymbolWorldBoundsCm', () => {
  it('çekme çizgili cihazda kutu İŞARETE kadar uzanır', () => {
    // Alarm işareti duvardan ~45 cm dışarıda; kutu duvar yüzünde bitemez.
    const bounds = getPointSymbolWorldBoundsCm('alarmDevice', POSE)

    expect(bounds.maxY).toBeGreaterThan(POSE.position.y + 45)
  })

  it('gömülü cihazda kutu duvarın İÇİNDE kalır', () => {
    // Pano yüzeyden içeri (yerel -y) uzuyor; dışarıda hiçbir şey çizilmiyor.
    const bounds = getPointSymbolWorldBoundsCm('panel', POSE)

    expect(bounds.maxY).toBeLessThanOrEqual(POSE.position.y)
  })

  it('cihaz DÖNDÜĞÜNDE kutu da döner', () => {
    const rotated = getPointSymbolWorldBoundsCm('alarmDevice', { ...POSE, rotationDeg: 90 })

    // 90°'de işaret ekranda -x yönüne uzar, +y'ye değil.
    expect(rotated.minX).toBeLessThan(POSE.position.x - 45)
    expect(rotated.maxY - rotated.minY).toBeLessThan(rotated.maxX - rotated.minX)
  })
})

describe('getPointSymbolLabelAnchorCm', () => {
  it('yazı çizimin DIŞINDA ve cihazın enine göre ortalanmış durur', () => {
    const bounds = getPointSymbolWorldBoundsCm('alarmDevice', POSE)
    const anchor = getPointSymbolLabelAnchorCm({ type: 'alarmDevice' }, POSE, ZOOM)

    expect(anchor.x).toBeCloseTo((bounds.minX + bounds.maxX) / 2, 5)
    expect(anchor.y).toBeGreaterThan(bounds.maxY)
  })

  it('pay EKRAN pikselinde: uzaklaşınca yazı cihazın üstüne binmez', () => {
    const bounds = getPointSymbolWorldBoundsCm('alarmDevice', POSE)
    const near = getPointSymbolLabelAnchorCm({ type: 'alarmDevice' }, POSE, 1)
    const far = getPointSymbolLabelAnchorCm({ type: 'alarmDevice' }, POSE, 0.5)

    // Zoom yarıya inince aynı piksel payı İKİ KAT dünya birimi eder.
    expect(far.y - bounds.maxY).toBeCloseTo((near.y - bounds.maxY) * 2, 5)
  })

  it('gömülü cihazda etiket duvarın DIŞINDA kalır, içinde değil', () => {
    // Pano yüzeyden içeri çiziliyor; yazı monte edildiği yüzün önünde durur.
    const anchor = getPointSymbolLabelAnchorCm({ type: 'panel' }, POSE, ZOOM)

    expect(anchor.y).toBeGreaterThan(POSE.position.y)
  })

  it('etiket cihazın BAKTIĞI yöne gider — ters yüzde ters tarafa (kullanıcı bulgusu)', () => {
    // İlk sürüm etiketi dünya +y'sine koyuyordu: aşağı bakan bir cihazda işaret
    // duvarın altında, yazısı üstünde kalıyor ve kılavuz duvarı kesiyordu.
    const flipped: SymbolPose = { ...POSE, outwardSign: -1 }
    const anchor = getPointSymbolLabelAnchorCm({ type: 'alarmDevice' }, flipped, ZOOM)
    const bounds = getPointSymbolWorldBoundsCm('alarmDevice', flipped)

    expect(anchor.y).toBeLessThan(POSE.position.y)
    expect(anchor.y).toBeLessThan(bounds.minY)
  })

  it('döndürülmüş duvarda etiket YANA gider, yukarı değil', () => {
    const rotated: SymbolPose = { ...POSE, rotationDeg: 90 }
    const anchor = getPointSymbolLabelAnchorCm({ type: 'alarmDevice' }, rotated, ZOOM)

    // 90°'de dışa yön ekranda -x; yazı da o tarafta durmalı.
    expect(anchor.x).toBeLessThan(POSE.position.x - 45)
    expect(anchor.y).toBeCloseTo(POSE.position.y, 5)
  })

  it('kullanıcı taşıdıysa SAKLANAN kayma kazanır, varsayılan yer değil', () => {
    const moved = { type: 'alarmDevice', labelOffsetCm: { x: -300, y: -50 } } as const
    const anchor = getPointSymbolLabelAnchorCm(moved, POSE, ZOOM)

    expect(anchor.x).toBeCloseTo(POSE.position.x - 300, 5)
    expect(anchor.y).toBeCloseTo(POSE.position.y - 50, 5)
  })

  it('kayma ÇAPA NOKTASINA göreli: cihaz taşınınca etiket birlikte gelir', () => {
    const moved = { type: 'alarmDevice', labelOffsetCm: { x: 30, y: 90 } } as const
    const elsewhere: SymbolPose = { ...POSE, position: { x: 900, y: 400 } }
    const anchor = getPointSymbolLabelAnchorCm(moved, elsewhere, ZOOM)

    expect(anchor).toEqual({ x: 930, y: 490 })
  })
})

describe('getPointSymbolLabelOffsetCm', () => {
  it('taşınmamış etikette varsayılan yerin kayması döner', () => {
    const offset = getPointSymbolLabelOffsetCm({ type: 'alarmDevice' }, POSE, ZOOM)
    const anchor = getPointSymbolLabelAnchorCm({ type: 'alarmDevice' }, POSE, ZOOM)

    // Sürükleme bu değerden başlıyor: etiket ilk dokunuşta zıplamamalı.
    expect(offset.x).toBeCloseTo(anchor.x - POSE.position.x, 5)
    expect(offset.y).toBeCloseTo(anchor.y - POSE.position.y, 5)
  })
})

describe('pickPointSymbolLabelAt', () => {
  const symbol: PointSymbol = {
    id: 1,
    type: 'alarmDevice',
    label: 'AL-01',
    note: '',
    attachment: 'wall',
    wallId: 2,
    offsetCm: 100,
    isMountedOnFarFace: false,
  }
  const pick = (target: { x: number; y: number }, candidates: PointSymbol[] = [symbol]) =>
    pickPointSymbolLabelAt(target, candidates, () => POSE, ZOOM)

  it('yazının üstündeki imleç etiketin cihazını verir', () => {
    const anchor = getPointSymbolLabelAnchorCm(symbol, POSE, ZOOM)

    expect(pick(anchor)?.id).toBe(symbol.id)
  })

  it('yazıdan uzakta undefined döner', () => {
    expect(pick({ x: 1000, y: 1000 })).toBeUndefined()
  })

  it('üst üste binenlerde SON eklenen kazanır', () => {
    const upper: PointSymbol = { ...symbol, id: 2 }
    const anchor = getPointSymbolLabelAnchorCm(symbol, POSE, ZOOM)

    expect(pick(anchor, [symbol, upper])?.id).toBe(upper.id)
  })

  it('pozu çözülemeyen cihaz (duvarı silinmiş) atlanır', () => {
    expect(pickPointSymbolLabelAt({ x: 200, y: 200 }, [symbol], () => undefined, ZOOM)).toBeUndefined()
  })
})
