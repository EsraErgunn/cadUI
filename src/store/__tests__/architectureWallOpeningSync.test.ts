import { beforeEach, describe, expect, it } from 'vitest'

import { selectOccupiedRanges } from '../architectureSlice'
import { useCadStore } from '../cadStore'

/**
 * Duvar (fay A) ↔ açıklık (fay B) entegrasyonu: açıklık kodu MOCK duvarlarla
 * değil, gerçek addWall/movePoint/deleteWall action'larıyla sınanır.
 * Bkz. knowledge/snap-contract.md ve K16.
 */
const initialState = useCadStore.getState()

/** Serbest uçlu 500 cm duvar: köşe payı yok, yerleştirme aralığı [0, 500]. */
function addFreeWall() {
  const added = useCadStore.getState().addWall({
    start: { position: { x: 0, y: 0 } },
    end: { position: { x: 500, y: 0 } },
  })
  if (!added) throw new Error('duvar eklenemedi')
  return added
}

function addCentredWindow(wallId: number) {
  return useCadStore.getState().addOpening({
    wallId,
    offsetCm: 250,
    widthCm: 120,
    type: 'window',
  })
}

beforeEach(() => {
  useCadStore.setState(initialState, true)
})

describe('gerçek duvar üzerine açıklık', () => {
  it('çizilen duvara açıklık yerleştirilebilir', () => {
    const { wallId } = addFreeWall()

    expect(addCentredWindow(wallId)).toBeDefined()
    expect(useCadStore.getState().openings).toHaveLength(1)
  })

  it('duvarın kendi ucundan taşan açıklığı reddeder', () => {
    const { wallId } = addFreeWall()

    // 480 ortalı 120 cm → [420, 540]; duvar 500 cm.
    expect(
      useCadStore.getState().addOpening({ wallId, offsetCm: 480, widthCm: 120, type: 'door' }),
    ).toBeUndefined()
  })

  it('komşu duvar eklenince köşe payı yerleştirmeyi daraltır', () => {
    const { wallId, p2Id } = addFreeWall()
    // p2 köşesine 30 cm kalınlığında dik duvar: aralık [0, 470] olur.
    useCadStore.getState().addWall({
      start: { pointId: p2Id },
      end: { position: { x: 500, y: 400 } },
      thickness: 30,
    })

    expect(
      useCadStore.getState().addOpening({ wallId, offsetCm: 460, widthCm: 60, type: 'door' }),
    ).toBeUndefined()
  })
})

describe('duvar silinince açıklık temizlenir (K16)', () => {
  it('duvarı silinen açıklık düşer', () => {
    const { wallId } = addFreeWall()
    addCentredWindow(wallId)

    useCadStore.getState().deleteWall(wallId)

    expect(useCadStore.getState().openings).toEqual([])
    expect(useCadStore.getState().walls).toEqual([])
  })

  it('silme + temizlik TEK geri alma adımıdır', () => {
    const { wallId } = addFreeWall()
    addCentredWindow(wallId)
    const revisionBefore = useCadStore.getState().revision

    useCadStore.getState().deleteWall(wallId)

    // Duvar + sahipsiz noktalar + açıklık tek set() içinde gitti.
    expect(useCadStore.getState().revision).toBe(revisionBefore + 1)
  })

  it('başka duvarın açıklığına dokunmaz', () => {
    const first = addFreeWall()
    addCentredWindow(first.wallId)
    const second = useCadStore.getState().addWall({
      start: { position: { x: 0, y: 300 } },
      end: { position: { x: 500, y: 300 } },
    })!

    useCadStore.getState().deleteWall(second.wallId)

    expect(useCadStore.getState().openings).toHaveLength(1)
  })
})

describe('duvar kısalınca açıklık temizlenir (K16)', () => {
  it('sığmayacak kadar kısalan duvarın açıklığı düşer', () => {
    const { wallId, p2Id } = addFreeWall()
    addCentredWindow(wallId)

    // 500 → 300: aralık [0, 300], açıklığın [190, 310] aralığı taşar.
    useCadStore.getState().movePoint(p2Id, { x: 300, y: 0 })

    expect(useCadStore.getState().openings).toEqual([])
  })

  it('hâlâ sığıyorsa açıklık kalır ve duvarla birlikte taşınır', () => {
    const { wallId, p2Id } = addFreeWall()
    addCentredWindow(wallId)

    useCadStore.getState().movePoint(p2Id, { x: 400, y: 0 })

    // offsetCm değişmedi: açıklık duvara bağlı, mutlak koordinat tutmuyor.
    expect(useCadStore.getState().openings).toHaveLength(1)
    expect(useCadStore.getState().openings[0].offsetCm).toBe(250)
    expect(selectOccupiedRanges(useCadStore.getState(), wallId)).toEqual([[190, 310]])
  })
})

describe('B→A sözleşmesi gerçek duvarda', () => {
  it('A duvarı kısaltmadan önce dolu aralıkları okuyabilir', () => {
    const { wallId } = addFreeWall()
    addCentredWindow(wallId)
    useCadStore.getState().addOpening({ wallId, offsetCm: 80, widthCm: 90, type: 'door' })

    expect(selectOccupiedRanges(useCadStore.getState(), wallId)).toEqual([
      [35, 125],
      [190, 310],
    ])
  })
})
