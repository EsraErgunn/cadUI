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
    nextUniqueId: 100,
    revision: 0,
    savedRevision: 0,
  })
  useCadStore.temporal.getState().clear()
}

/** Serbest bağlanma yardımcısı: testlerin çoğu duvarla ilgilenmiyor. */
function freeAt(position: { x: number; y: number }) {
  // Kat AKTİF kattan okunur: üretimde de bağlanmayı araç çözüyor ve serbest
  // sembol aktif kata düşüyor.
  return {
    attachment: 'free' as const,
    floorId: useCadStore.getState().activeFloorId,
    x: position.x,
    y: position.y,
    rotationDeg: 0,
  }
}

function findSymbol(symbolId: number) {
  return useCadStore.getState().symbols.find((symbol) => symbol.id === symbolId)
}

/** Testlerin çoğu serbest sembolle ilgileniyor; açı yalnız orada saklanıyor. */
function findFreeSymbol(symbolId: number) {
  const symbol = findSymbol(symbolId)
  return symbol?.attachment === 'free' ? symbol : undefined
}

beforeEach(resetState)

describe('addPointSymbol', () => {
  it('sembolü aktif kata ekler ve etiketini üretir', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'panel', attachment: freeAt({ x: 120, y: 80 }) })

    expect(findSymbol(id!)).toMatchObject({
      floorId: DEFAULT_FLOOR_ID,
      type: 'panel',
      x: 120,
      y: 80,
      rotationDeg: 0,
      label: 'P-01',
      note: '',
    })
  })

  it('arka arkaya eklemede etiket ilerler', () => {
    const add = () =>
      useCadStore.getState().addPointSymbol({ type: 'panel', attachment: freeAt({ x: 0, y: 0 }) })
    add()
    const secondId = add()

    expect(findSymbol(secondId!)?.label).toBe('P-02')
  })

  it('kat değişince numaralandırma yeniden başlar', () => {
    useCadStore.getState().addPointSymbol({ type: 'panel', attachment: freeAt({ x: 0, y: 0 }) })
    useCadStore.getState().setActiveFloor(UPPER_FLOOR_ID)

    const id = useCadStore.getState().addPointSymbol({ type: 'panel', attachment: freeAt({ x: 0, y: 0 }) })

    expect(findSymbol(id!)).toMatchObject({ floorId: UPPER_FLOOR_ID, label: 'P-01' })
  })

  it('her ekleme TEK geri alma adımıdır', () => {
    useCadStore.getState().addPointSymbol({ type: 'vent', attachment: freeAt({ x: 0, y: 0 }) })

    expect(useCadStore.temporal.getState().pastStates).toHaveLength(1)

    useCadStore.temporal.getState().undo()
    expect(useCadStore.getState().symbols).toHaveLength(0)
  })
})

describe('movePointSymbol', () => {
  it('konumu günceller', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'vent', attachment: freeAt({ x: 0, y: 0 }) })

    expect(useCadStore.getState().movePointSymbol(id!, freeAt({ x: 50, y: 60 }))).toBe(true)
    expect(findSymbol(id!)).toMatchObject({ x: 50, y: 60 })
  })

  it('bağlanma yazımı her zaman uygulanır — sürükleme bırakışta tek yazım', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'vent', attachment: freeAt({ x: 10, y: 10 }) })

    expect(useCadStore.getState().movePointSymbol(id!, freeAt({ x: 10, y: 10 }))).toBe(true)
  })

  it('tanınmayan id hiçbir şey yapmaz', () => {
    expect(useCadStore.getState().movePointSymbol(999, freeAt({ x: 0, y: 0 }))).toBe(false)
  })
})

describe('rotatePointSymbol', () => {
  it('açıyı 15 derece adımına yakalar (KK-3)', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'panel', attachment: freeAt({ x: 0, y: 0 }) })

    useCadStore.getState().rotatePointSymbol(id!, 47)

    expect(findFreeSymbol(id!)?.rotationDeg).toBe(45)
  })

  it('açıyı [0, 360) aralığına indirir', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'panel', attachment: freeAt({ x: 0, y: 0 }) })

    useCadStore.getState().rotatePointSymbol(id!, -15)

    expect(findFreeSymbol(id!)?.rotationDeg).toBe(345)
  })

  it('aynı açı projeyi kirletmez', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'panel', attachment: freeAt({ x: 0, y: 0 }) })

    expect(useCadStore.getState().rotatePointSymbol(id!, 0)).toBe(false)
  })
})

describe('setPointSymbolLabel', () => {
  it('etiketi değiştirir ve kırpar', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'panel', attachment: freeAt({ x: 0, y: 0 }) })

    expect(useCadStore.getState().setPointSymbolLabel(id!, '  Mutfak panosu ')).toBe(true)
    expect(findSymbol(id!)?.label).toBe('Mutfak panosu')
  })

  it('aynı kattaki çakışan etiketi REDDEDER (KK-10)', () => {
    const first = useCadStore.getState().addPointSymbol({ type: 'panel', attachment: freeAt({ x: 0, y: 0 }) })
    const second = useCadStore.getState().addPointSymbol({ type: 'vent', attachment: freeAt({ x: 0, y: 0 }) })

    expect(useCadStore.getState().setPointSymbolLabel(second!, 'P-01')).toBe(false)
    expect(findSymbol(second!)?.label).toBe('MN-01')
    expect(findSymbol(first!)?.label).toBe('P-01')
  })

  it('başka kattaki aynı etiket çakışma değildir', () => {
    useCadStore.getState().addPointSymbol({ type: 'panel', attachment: freeAt({ x: 0, y: 0 }) })
    useCadStore.getState().setActiveFloor(UPPER_FLOOR_ID)
    const upper = useCadStore.getState().addPointSymbol({ type: 'vent', attachment: freeAt({ x: 0, y: 0 }) })

    expect(useCadStore.getState().setPointSymbolLabel(upper!, 'P-01')).toBe(true)
  })

  it('boş etiket reddedilir', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'panel', attachment: freeAt({ x: 0, y: 0 }) })

    expect(useCadStore.getState().setPointSymbolLabel(id!, '   ')).toBe(false)
    expect(findSymbol(id!)?.label).toBe('P-01')
  })
})

describe('setPointSymbolNote', () => {
  it('notu yazar', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'vent', attachment: freeAt({ x: 0, y: 0 }) })

    expect(useCadStore.getState().setPointSymbolNote(id!, 'Mutfak menfezi')).toBe(true)
    expect(findSymbol(id!)?.note).toBe('Mutfak menfezi')
  })

  it('aynı not projeyi kirletmez', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'vent', attachment: freeAt({ x: 0, y: 0 }) })

    expect(useCadStore.getState().setPointSymbolNote(id!, '')).toBe(false)
  })
})

describe('kalıcılık', () => {
  it('semboller kaydedilen projeye girer — tesisat elemanlarının aksine', () => {
    useCadStore.getState().addPointSymbol({ type: 'panel', attachment: freeAt({ x: 120, y: 80 }) })

    const saved = useCadStore.getState().symbols
    expect(saved).toHaveLength(1)

    // Yükleme turu: kaydedilip geri yüklenince sembol geliyor mu.
    const data = {
      nextUniqueId: useCadStore.getState().nextUniqueId,
      activeFloorId: DEFAULT_FLOOR_ID,
      floors: useCadStore.getState().floors,
      points: [],
      walls: [],
      openings: [],
      rooms: [],
      symbols: saved,
    }
    useCadStore.getState().resetProject()
    expect(useCadStore.getState().symbols).toHaveLength(0)

    useCadStore.getState().loadProject(data)
    expect(useCadStore.getState().symbols).toHaveLength(1)
  })
})
