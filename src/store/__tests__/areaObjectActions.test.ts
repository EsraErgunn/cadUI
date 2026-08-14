import { beforeEach, describe, expect, it } from 'vitest'

import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_HEIGHT_CM, DEFAULT_FLOOR_ID } from '../../core/model'
import { useCadStore } from '../cadStore'

const UPPER_FLOOR_ID = 14

function resetState(): void {
  useCadStore.setState({
    floors: [
      createGroundFloor(),
      { id: UPPER_FLOOR_ID, name: '1. Kat', heightCm: DEFAULT_FLOOR_HEIGHT_CM, isBasement: false },
    ],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: [],
    walls: [],
    openings: [],
    rooms: [],
    symbols: [],
    areaObjects: [],
    nextUniqueId: 100,
    revision: 0,
    savedRevision: 0,
  })
  useCadStore.temporal.getState().clear()
}

function findAreaObject(id: number) {
  return useCadStore.getState().areaObjects.find((areaObject) => areaObject.id === id)
}

beforeEach(resetState)

describe('addAreaObject', () => {
  it('nesneyi aktif kata varsayılan boyutla ekler ve etiketini üretir', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 120, y: 80 })

    expect(findAreaObject(id!)).toMatchObject({
      floorId: DEFAULT_FLOOR_ID,
      type: 'structuralColumn',
      x: 120,
      y: 80,
      widthCm: 100,
      lengthCm: 100,
      angleDeg: 0,
      label: 'K-01',
    })
  })

  it('kolon havalandırmasını basit yuvarlak varsayılan boyutla ekler', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'columnVentilation', x: 50, y: 60 })

    expect(findAreaObject(id!)).toMatchObject({
      type: 'columnVentilation',
      // Baca şaftının iç çemberinden bir tık küçük çap.
      widthCm: 80,
      lengthCm: 80,
      label: 'KH-01',
    })
  })

  it('ikinci aynı tip nesne sıradaki numarayı alır', () => {
    useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 0, y: 0 })
    const secondId = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 100, y: 100 })

    expect(findAreaObject(secondId!)?.label).toBe('K-02')
  })

  it('bir kapının tam üstüne yerleştirme reddedilir, id bile harcanmaz', () => {
    useCadStore.setState({
      points: [
        { id: 1, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
        { id: 2, floorId: DEFAULT_FLOOR_ID, x: 400, y: 0 },
      ],
      walls: [{ id: 1, floorId: DEFAULT_FLOOR_ID, p1Id: 1, p2Id: 2, thickness: 20, height: 280 }],
      openings: [{ id: 1, wallId: 1, offsetCm: 200, widthCm: 90, type: 'door' }],
    })
    const nextIdBefore = useCadStore.getState().nextUniqueId

    const id = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 200, y: 0 })

    expect(id).toBeUndefined()
    expect(useCadStore.getState().areaObjects).toHaveLength(0)
    expect(useCadStore.getState().nextUniqueId).toBe(nextIdBefore)
  })
})

describe('moveAreaObject', () => {
  it('geçerli konuma taşır', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 0, y: 0 })

    const isMoved = useCadStore.getState().moveAreaObject(id!, 300, 300)

    expect(isMoved).toBe(true)
    expect(findAreaObject(id!)).toMatchObject({ x: 300, y: 300 })
  })

  it('bir kapının üstüne taşıma reddedilir, konum DEĞİŞMEZ', () => {
    useCadStore.setState({
      points: [
        { id: 1, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
        { id: 2, floorId: DEFAULT_FLOOR_ID, x: 400, y: 0 },
      ],
      walls: [{ id: 1, floorId: DEFAULT_FLOOR_ID, p1Id: 1, p2Id: 2, thickness: 20, height: 280 }],
      openings: [{ id: 1, wallId: 1, offsetCm: 200, widthCm: 90, type: 'door' }],
    })
    const id = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 350, y: 0 })

    const isMoved = useCadStore.getState().moveAreaObject(id!, 200, 0)

    expect(isMoved).toBe(false)
    expect(findAreaObject(id!)).toMatchObject({ x: 350, y: 0 })
  })
})

describe('setAreaObjectSize', () => {
  it('genişlik/uzunluğu günceller', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'stairs', x: 0, y: 0 })

    const isResized = useCadStore.getState().setAreaObjectSize(id!, 150, 350)

    expect(isResized).toBe(true)
    expect(findAreaObject(id!)).toMatchObject({ widthCm: 150, lengthCm: 350 })
  })

  it('sıfır veya negatif boyut reddedilir', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'stairs', x: 0, y: 0 })

    expect(useCadStore.getState().setAreaObjectSize(id!, 0, 100)).toBe(false)
  })
})

describe('resizeAreaObject', () => {
  it('konum ve boyutu TEK adımda yazar — tek Ctrl+Z (K44)', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 0, y: 0 })
    const revisionBefore = useCadStore.getState().revision

    const isResized = useCadStore
      .getState()
      .resizeAreaObject(id!, { x: 25, y: -25, widthCm: 150, lengthCm: 150 })

    expect(isResized).toBe(true)
    expect(findAreaObject(id!)).toMatchObject({ x: 25, y: -25, widthCm: 150, lengthCm: 150 })
    // Tek markDirty: merkez ve boyut ayrı action'lara bölünseydi revision iki artardı.
    expect(useCadStore.getState().revision).toBe(revisionBefore + 1)
  })

  it('sıfır boyut reddedilir, nesne DEĞİŞMEZ', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 0, y: 0 })

    const isResized = useCadStore
      .getState()
      .resizeAreaObject(id!, { x: 10, y: 10, widthCm: 0, lengthCm: 100 })

    expect(isResized).toBe(false)
    expect(findAreaObject(id!)).toMatchObject({ x: 0, y: 0, widthCm: 100 })
  })

  it('sonuç bir kapının üstüne düşerse reddedilir (K35/K36)', () => {
    useCadStore.setState({
      points: [
        { id: 1, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
        { id: 2, floorId: DEFAULT_FLOOR_ID, x: 400, y: 0 },
      ],
      walls: [{ id: 1, floorId: DEFAULT_FLOOR_ID, p1Id: 1, p2Id: 2, thickness: 20, height: 280 }],
      openings: [{ id: 1, wallId: 1, offsetCm: 200, widthCm: 90, type: 'door' }],
    })
    const id = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 200, y: 300 })

    // Büyüterek kapının üstüne uzatmaya çalışıyoruz.
    const isResized = useCadStore
      .getState()
      .resizeAreaObject(id!, { x: 200, y: 150, widthCm: 100, lengthCm: 400 })

    expect(isResized).toBe(false)
    expect(findAreaObject(id!)).toMatchObject({ y: 300, lengthCm: 100 })
  })
})

describe('rotateAreaObject', () => {
  it('açıyı 15° adımına yakalar', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 0, y: 0 })

    useCadStore.getState().rotateAreaObject(id!, 40)

    expect(findAreaObject(id!)?.angleDeg).toBe(45)
  })
})

describe('setAreaObjectLabel', () => {
  it('çakışan etiketi reddeder', () => {
    const firstId = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 0, y: 0 })
    const secondId = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 200, y: 200 })

    const isApplied = useCadStore.getState().setAreaObjectLabel(secondId!, findAreaObject(firstId!)!.label)

    expect(isApplied).toBe(false)
  })

  it('boş etiketi reddeder', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 0, y: 0 })

    expect(useCadStore.getState().setAreaObjectLabel(id!, '   ')).toBe(false)
  })

  it('geçerli yeni etiketi kabul eder', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 0, y: 0 })

    const isApplied = useCadStore.getState().setAreaObjectLabel(id!, 'Asansör Boşluğu')

    expect(isApplied).toBe(true)
    expect(findAreaObject(id!)?.label).toBe('Asansör Boşluğu')
  })
})

describe('setAreaObjectLabelOffset', () => {
  it('ad etiketinin kaymasını yazar', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 0, y: 0 })!

    expect(useCadStore.getState().setAreaObjectLabelOffset(id, { x: 40, y: 90 })).toBe(true)
    expect(findAreaObject(id)?.labelOffsetCm).toEqual({ x: 40, y: 90 })
  })

  it('aynı kaymayı ikinci kez yazmaz — geçmişe boş adım girmesin', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 0, y: 0 })!
    useCadStore.getState().setAreaObjectLabelOffset(id, { x: 40, y: 90 })
    const before = useCadStore.getState().revision

    expect(useCadStore.getState().setAreaObjectLabelOffset(id, { x: 40, y: 90 })).toBe(false)
    expect(useCadStore.getState().revision).toBe(before)
  })

  it('etiket kayması nesneyle birlikte gelir: taşıma kaymayı DEĞİŞTİRMEZ', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 0, y: 0 })!
    useCadStore.getState().setAreaObjectLabelOffset(id, { x: 0, y: 90 })

    useCadStore.getState().moveAreaObject(id, 300, 200)

    // Kayma merkeze GÖRELİ saklandığı için değişmez; mutlak konum türetilir.
    expect(findAreaObject(id)?.labelOffsetCm).toEqual({ x: 0, y: 90 })
  })
})

describe('rotateAreaObject — yakalama anahtarı (K51)', () => {
  it('varsayılan olarak 15° adımına yakalar (panel yolu)', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 0, y: 0 })!

    useCadStore.getState().rotateAreaObject(id, 37)

    expect(findAreaObject(id)?.angleDeg).toBe(30)
  })

  it('isSnapEnabled=false ham açıyı yazar (Ctrl ile döndürme)', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 0, y: 0 })!

    useCadStore.getState().rotateAreaObject(id, 37, false)

    expect(findAreaObject(id)?.angleDeg).toBe(37)
  })

  it('yakalama kapalıyken de açı 0-359 aralığına indirgenir', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'structuralColumn', x: 0, y: 0 })!

    useCadStore.getState().rotateAreaObject(id, -30, false)

    expect(findAreaObject(id)?.angleDeg).toBe(330)
  })
})

describe('addAreaObject — düşey eksen kimliği (KK-19)', () => {
  it('baca şaftı kendi eksen kimliğiyle doğar', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'flueShaft', x: 100, y: 100 })

    const flueShaft = findAreaObject(id!)
    expect(flueShaft?.axisId).toBeDefined()
    // Kimlik id evreninden geliyor (kural 6) ama nesnenin id'si DEĞİL.
    expect(flueShaft?.axisId).not.toBe(id)
  })

  it('kolon havalandırması da eksen taşır', () => {
    const id = useCadStore.getState().addAreaObject({ type: 'columnVentilation', x: 100, y: 100 })

    expect(findAreaObject(id!)?.axisId).toBeDefined()
  })

  it('merdiven ve kolon eksen TAŞIMAZ', () => {
    const stairsId = useCadStore.getState().addAreaObject({ type: 'stairs', x: 100, y: 100 })
    const columnId = useCadStore
      .getState()
      .addAreaObject({ type: 'structuralColumn', x: 400, y: 400 })

    expect(findAreaObject(stairsId!)?.axisId).toBeUndefined()
    expect(findAreaObject(columnId!)?.axisId).toBeUndefined()
  })

  it('iki ayrı baca şaftı AYRI eksenler başlatır', () => {
    const first = useCadStore.getState().addAreaObject({ type: 'flueShaft', x: 100, y: 100 })
    const second = useCadStore.getState().addAreaObject({ type: 'flueShaft', x: 600, y: 600 })

    expect(findAreaObject(first!)?.axisId).not.toBe(findAreaObject(second!)?.axisId)
  })

  it('reddedilen yerleştirme eksen kimliği HARCAMAZ', () => {
    // Açıklığın içine düşen nesne reddediliyor (K35/K36) ve id harcanmıyor;
    // eksen kimliği de aynı sayaçtan geldiği için o da harcanmamalı.
    const before = useCadStore.getState().nextUniqueId

    useCadStore.setState({
      points: [
        { id: 2, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
        { id: 3, floorId: DEFAULT_FLOOR_ID, x: 500, y: 0 },
      ],
      walls: [{ id: 6, floorId: DEFAULT_FLOOR_ID, p1Id: 2, p2Id: 3, thickness: 20, height: 280 }],
      openings: [{ id: 10, wallId: 6, offsetCm: 250, widthCm: 200, type: 'door' }],
      nextUniqueId: before,
    })

    expect(useCadStore.getState().addAreaObject({ type: 'flueShaft', x: 250, y: 0 })).toBeUndefined()
    expect(useCadStore.getState().nextUniqueId).toBe(before)
  })
})
