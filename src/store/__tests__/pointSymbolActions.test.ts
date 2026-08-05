import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_FLOOR_ID, DEFAULT_FLOOR_NAME } from '../../core/model'
import { useCadStore } from '../cadStore'

const UPPER_FLOOR_ID = 14

function resetState(): void {
  useCadStore.setState({
    floors: [
      { id: DEFAULT_FLOOR_ID, name: DEFAULT_FLOOR_NAME },
      { id: UPPER_FLOOR_ID, name: '1. Kat' },
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

function findSymbol(symbolId: number) {
  return useCadStore.getState().symbols.find((symbol) => symbol.id === symbolId)
}

beforeEach(resetState)

describe('addPointSymbol', () => {
  it('sembolü aktif kata ekler ve etiketini üretir', () => {
    const id = useCadStore.getState().addPointSymbol({
      type: 'panel',
      position: { x: 120, y: 80 },
    })

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
      useCadStore.getState().addPointSymbol({ type: 'panel', position: { x: 0, y: 0 } })
    add()
    const secondId = add()

    expect(findSymbol(secondId!)?.label).toBe('P-02')
  })

  it('kat değişince numaralandırma yeniden başlar', () => {
    useCadStore.getState().addPointSymbol({ type: 'panel', position: { x: 0, y: 0 } })
    useCadStore.getState().setActiveFloor(UPPER_FLOOR_ID)

    const id = useCadStore.getState().addPointSymbol({ type: 'panel', position: { x: 0, y: 0 } })

    expect(findSymbol(id!)).toMatchObject({ floorId: UPPER_FLOOR_ID, label: 'P-01' })
  })

  it('her ekleme TEK geri alma adımıdır', () => {
    useCadStore.getState().addPointSymbol({ type: 'vent', position: { x: 0, y: 0 } })

    expect(useCadStore.temporal.getState().pastStates).toHaveLength(1)

    useCadStore.temporal.getState().undo()
    expect(useCadStore.getState().symbols).toHaveLength(0)
  })
})

describe('movePointSymbol', () => {
  it('konumu günceller', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'vent', position: { x: 0, y: 0 } })

    expect(useCadStore.getState().movePointSymbol(id!, { x: 50, y: 60 })).toBe(true)
    expect(findSymbol(id!)).toMatchObject({ x: 50, y: 60 })
  })

  it('aynı konuma taşımak projeyi kirletmez', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'vent', position: { x: 10, y: 10 } })
    const revisionAfterAdd = useCadStore.getState().revision

    expect(useCadStore.getState().movePointSymbol(id!, { x: 10, y: 10 })).toBe(false)
    expect(useCadStore.getState().revision).toBe(revisionAfterAdd)
  })

  it('tanınmayan id hiçbir şey yapmaz', () => {
    expect(useCadStore.getState().movePointSymbol(999, { x: 0, y: 0 })).toBe(false)
  })
})

describe('rotatePointSymbol', () => {
  it('açıyı 15 derece adımına yakalar (KK-3)', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'panel', position: { x: 0, y: 0 } })

    useCadStore.getState().rotatePointSymbol(id!, 47)

    expect(findSymbol(id!)?.rotationDeg).toBe(45)
  })

  it('açıyı [0, 360) aralığına indirir', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'panel', position: { x: 0, y: 0 } })

    useCadStore.getState().rotatePointSymbol(id!, -15)

    expect(findSymbol(id!)?.rotationDeg).toBe(345)
  })

  it('aynı açı projeyi kirletmez', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'panel', position: { x: 0, y: 0 } })

    expect(useCadStore.getState().rotatePointSymbol(id!, 0)).toBe(false)
  })
})

describe('setPointSymbolLabel', () => {
  it('etiketi değiştirir ve kırpar', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'panel', position: { x: 0, y: 0 } })

    expect(useCadStore.getState().setPointSymbolLabel(id!, '  Mutfak panosu ')).toBe(true)
    expect(findSymbol(id!)?.label).toBe('Mutfak panosu')
  })

  it('aynı kattaki çakışan etiketi REDDEDER (KK-10)', () => {
    const first = useCadStore.getState().addPointSymbol({ type: 'panel', position: { x: 0, y: 0 } })
    const second = useCadStore.getState().addPointSymbol({ type: 'vent', position: { x: 0, y: 0 } })

    expect(useCadStore.getState().setPointSymbolLabel(second!, 'P-01')).toBe(false)
    expect(findSymbol(second!)?.label).toBe('MN-01')
    expect(findSymbol(first!)?.label).toBe('P-01')
  })

  it('başka kattaki aynı etiket çakışma değildir', () => {
    useCadStore.getState().addPointSymbol({ type: 'panel', position: { x: 0, y: 0 } })
    useCadStore.getState().setActiveFloor(UPPER_FLOOR_ID)
    const upper = useCadStore.getState().addPointSymbol({ type: 'vent', position: { x: 0, y: 0 } })

    expect(useCadStore.getState().setPointSymbolLabel(upper!, 'P-01')).toBe(true)
  })

  it('boş etiket reddedilir', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'panel', position: { x: 0, y: 0 } })

    expect(useCadStore.getState().setPointSymbolLabel(id!, '   ')).toBe(false)
    expect(findSymbol(id!)?.label).toBe('P-01')
  })
})

describe('setPointSymbolNote', () => {
  it('notu yazar', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'vent', position: { x: 0, y: 0 } })

    expect(useCadStore.getState().setPointSymbolNote(id!, 'Mutfak menfezi')).toBe(true)
    expect(findSymbol(id!)?.note).toBe('Mutfak menfezi')
  })

  it('aynı not projeyi kirletmez', () => {
    const id = useCadStore.getState().addPointSymbol({ type: 'vent', position: { x: 0, y: 0 } })

    expect(useCadStore.getState().setPointSymbolNote(id!, '')).toBe(false)
  })
})

describe('kalıcılık', () => {
  it('semboller kaydedilen projeye girer — tesisat elemanlarının aksine', () => {
    useCadStore.getState().addPointSymbol({ type: 'panel', position: { x: 120, y: 80 } })

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
