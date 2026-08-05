import { beforeEach, describe, expect, it } from 'vitest'

import {
  FIXTURE_NEXT_FREE_ID,
  FIXTURE_OPENINGS,
  FIXTURE_POINTS,
  FIXTURE_WALLS,
  WALL_ID,
} from './architectureFixture'
import { DEFAULT_FLOOR_ID, DEFAULT_FLOOR_NAME } from '../../core/model'
import { useCadStore } from '../cadStore'

/** Zemin katta hazır bir çizim + üstünde boş bir kat. */
const UPPER_FLOOR_ID = 100

function resetFloorState(): void {
  useCadStore.setState({
    floors: [
      { id: DEFAULT_FLOOR_ID, name: DEFAULT_FLOOR_NAME },
      { id: UPPER_FLOOR_ID, name: '1. Kat' },
    ],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: FIXTURE_POINTS,
    walls: FIXTURE_WALLS,
    openings: FIXTURE_OPENINGS,
    installationElements: [],
    nextUniqueId: FIXTURE_NEXT_FREE_ID,
    revision: 0,
    savedRevision: 0,
  })
  useCadStore.temporal.getState().clear()
}

beforeEach(resetFloorState)

describe('addFloor', () => {
  it('yeni katı en üste ekler ve sıradaki adı üretir', () => {
    const id = useCadStore.getState().addFloor()

    const { floors } = useCadStore.getState()
    expect(floors.at(-1)).toEqual({ id, name: '2. Kat' })
  })

  it('verilen adı kırpar', () => {
    const id = useCadStore.getState().addFloor({ name: '  Çatı Katı  ' })

    expect(useCadStore.getState().floors.at(-1)).toEqual({ id, name: 'Çatı Katı' })
  })

  it('çakışan adı reddeder ve id HARCAMAZ', () => {
    const before = useCadStore.getState().nextUniqueId

    expect(useCadStore.getState().addFloor({ name: '1. Kat' })).toBeUndefined()
    expect(useCadStore.getState().floors).toHaveLength(2)
    expect(useCadStore.getState().nextUniqueId).toBe(before)
  })

  it('reddedilen ekleme projeyi kirletmez', () => {
    useCadStore.getState().addFloor({ name: '   ' })
    expect(useCadStore.getState().revision).toBe(0)
  })
})

describe('renameFloor', () => {
  it('katın adını değiştirir', () => {
    expect(useCadStore.getState().renameFloor(UPPER_FLOOR_ID, 'Çatı Katı')).toBe(true)
    expect(useCadStore.getState().floors.at(-1)?.name).toBe('Çatı Katı')
  })

  it('başka katın adını reddeder', () => {
    expect(useCadStore.getState().renameFloor(UPPER_FLOOR_ID, DEFAULT_FLOOR_NAME)).toBe(false)
    expect(useCadStore.getState().floors.at(-1)?.name).toBe('1. Kat')
  })

  it('katın KENDİ adını yeniden vermek çakışma değildir ama değişiklik de değildir', () => {
    expect(useCadStore.getState().renameFloor(UPPER_FLOOR_ID, '1. Kat')).toBe(false)
    expect(useCadStore.getState().revision).toBe(0)
  })
})

describe('removeFloor', () => {
  it('katın duvar, nokta ve açıklıklarını da siler', () => {
    expect(useCadStore.getState().removeFloor(DEFAULT_FLOOR_ID)).toBe(true)

    const state = useCadStore.getState()
    expect(state.floors.map((floor) => floor.id)).toEqual([UPPER_FLOOR_ID])
    expect(state.walls).toHaveLength(0)
    expect(state.points).toHaveLength(0)
    // Açıklık floorId taşımaz: duvarı üzerinden silinmeli.
    expect(state.openings).toHaveLength(0)
  })

  it('katın tesisat elemanlarını da siler', () => {
    useCadStore.setState({
      installationElements: [
        { id: 500, floorId: DEFAULT_FLOOR_ID, type: 'boiler', position: { x: 0, y: 0 }, angleDeg: 0, scale: 1 },
        { id: 501, floorId: UPPER_FLOOR_ID, type: 'boiler', position: { x: 0, y: 0 }, angleDeg: 0, scale: 1 },
      ],
    })

    useCadStore.getState().removeFloor(DEFAULT_FLOOR_ID)

    expect(useCadStore.getState().installationElements.map((element) => element.id)).toEqual([501])
  })

  it('başka katın çizimine dokunmaz', () => {
    expect(useCadStore.getState().removeFloor(UPPER_FLOOR_ID)).toBe(true)

    const state = useCadStore.getState()
    expect(state.walls).toHaveLength(FIXTURE_WALLS.length)
    expect(state.openings).toHaveLength(FIXTURE_OPENINGS.length)
  })

  it('aktif kat silinince altındaki kat aktif olur', () => {
    useCadStore.setState({ activeFloorId: UPPER_FLOOR_ID })

    useCadStore.getState().removeFloor(UPPER_FLOOR_ID)

    expect(useCadStore.getState().activeFloorId).toBe(DEFAULT_FLOOR_ID)
  })

  it('son kat silinemez', () => {
    useCadStore.getState().removeFloor(UPPER_FLOOR_ID)

    expect(useCadStore.getState().removeFloor(DEFAULT_FLOOR_ID)).toBe(false)
    expect(useCadStore.getState().floors).toHaveLength(1)
  })

  it('silme TEK geri alma adımıdır: çizim ve aktif kat birlikte döner', () => {
    useCadStore.setState({ activeFloorId: UPPER_FLOOR_ID })
    useCadStore.getState().removeFloor(UPPER_FLOOR_ID)

    useCadStore.temporal.getState().undo()

    const state = useCadStore.getState()
    expect(state.floors).toHaveLength(2)
    expect(state.activeFloorId).toBe(UPPER_FLOOR_ID)
  })
})

describe('moveFloor', () => {
  it('katı bir sıra aşağı taşır', () => {
    expect(useCadStore.getState().moveFloor(UPPER_FLOOR_ID, 'down')).toBe(true)
    expect(useCadStore.getState().floors.map((floor) => floor.id)).toEqual([
      UPPER_FLOOR_ID,
      DEFAULT_FLOOR_ID,
    ])
  })

  it('sınırda hiçbir şey yapmaz ve projeyi kirletmez', () => {
    expect(useCadStore.getState().moveFloor(UPPER_FLOOR_ID, 'up')).toBe(false)
    expect(useCadStore.getState().revision).toBe(0)
  })
})

describe('setActiveFloor', () => {
  it('aktif katı değiştirir', () => {
    useCadStore.getState().setActiveFloor(UPPER_FLOOR_ID)
    expect(useCadStore.getState().activeFloorId).toBe(UPPER_FLOOR_ID)
  })

  it('olmayan kata geçilmez', () => {
    useCadStore.getState().setActiveFloor(404)
    expect(useCadStore.getState().activeFloorId).toBe(DEFAULT_FLOOR_ID)
  })

  it('kat geçişi projeyi kirletmez', () => {
    useCadStore.getState().setActiveFloor(UPPER_FLOOR_ID)
    expect(useCadStore.getState().revision).toBe(0)
  })

  it('kat geçişi geçmişe adım YAZMAZ — Ctrl+Z kullanıcıyı başka kata ışınlamasın', () => {
    useCadStore.getState().setActiveFloor(UPPER_FLOOR_ID)

    expect(useCadStore.temporal.getState().pastStates).toHaveLength(0)
  })

  it('çizim değişiklikleri geri alınırken aktif kat korunur', () => {
    useCadStore.getState().addFloor({ name: 'Çatı Katı' })
    useCadStore.getState().setActiveFloor(UPPER_FLOOR_ID)

    useCadStore.temporal.getState().undo()

    expect(useCadStore.getState().floors).toHaveLength(2)
  })
})

describe('kat silme ile açıklık temizliği', () => {
  it('silinen kattaki duvara bağlı açıklık sahipsiz KALMAZ', () => {
    useCadStore.getState().removeFloor(DEFAULT_FLOOR_ID)

    const orphaned = useCadStore
      .getState()
      .openings.filter((opening) => opening.wallId === WALL_ID)
    expect(orphaned).toHaveLength(0)
  })
})
