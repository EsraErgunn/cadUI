import { beforeEach, describe, expect, it } from 'vitest'

import {
  FIXTURE_NEXT_FREE_ID,
  FIXTURE_OPENINGS,
  FIXTURE_POINTS,
  FIXTURE_WALLS,
} from './architectureFixture'
import { addDraftFloor, createFloorPlanDraft, removeDraftFloors } from '../../core/floorPlan'
import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_ID } from '../../core/model'
import { useCadStore } from '../cadStore'
import { undoProject } from '../cadStore'

/** Zemin katta hazır bir çizim, üstünde boş bir kat. */
const UPPER_FLOOR_ID = 100

function currentDraft() {
  const { floors, activeFloorId } = useCadStore.getState()
  return createFloorPlanDraft(floors, activeFloorId)
}

beforeEach(() => {
  useCadStore.setState({
    floors: [
      createGroundFloor(),
      { id: UPPER_FLOOR_ID, name: '1. Kat', heightCm: 300, isBasement: false },
    ],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: FIXTURE_POINTS,
    walls: FIXTURE_WALLS,
    openings: FIXTURE_OPENINGS,
    rooms: [],
    symbols: [],
    installationElements: [],
    nextUniqueId: FIXTURE_NEXT_FREE_ID,
    revision: 0,
    savedRevision: 0,
  })
  useCadStore.temporal.getState().clear()
})

describe('applyFloorPlan', () => {
  it('ad, yükseklik ve sırayı bir arada yazar', () => {
    const draft = currentDraft()
    const plan = {
      floors: [
        { ...draft.floors[1], name: 'Çatı', heightCm: 280 },
        { ...draft.floors[0], heightCm: 320 },
      ],
      activeFloorId: DEFAULT_FLOOR_ID,
    }

    expect(useCadStore.getState().applyFloorPlan(plan)).toBe(true)

    const { floors } = useCadStore.getState()
    expect(floors.map((floor) => floor.name)).toEqual(['Çatı', 'Zemin Kat'])
    expect(floors.map((floor) => floor.heightCm)).toEqual([280, 320])
  })

  it('geçici id"li yeni kat gerçek id alır', () => {
    const draft = addDraftFloor(currentDraft())
    const before = useCadStore.getState().nextUniqueId

    expect(useCadStore.getState().applyFloorPlan(draft)).toBe(true)

    const added = useCadStore.getState().floors.at(-1)
    expect(added?.id).toBe(before)
    expect(added?.name).toBe('2. Kat')
  })

  it('kopya kaynağı verilen yeni kat çizimle gelir (madde 10)', () => {
    const draft = addDraftFloor(currentDraft(), { copyFromFloorId: DEFAULT_FLOOR_ID })

    expect(useCadStore.getState().applyFloorPlan(draft)).toBe(true)

    const addedId = useCadStore.getState().floors.at(-1)?.id
    const copiedWalls = useCadStore.getState().walls.filter((wall) => wall.floorId === addedId)
    expect(copiedWalls.length).toBe(FIXTURE_WALLS.length)
    // Kopya YENİ id alır; kaynağın duvarı hedefe taşınmış olamaz.
    expect(copiedWalls.some((wall) => FIXTURE_WALLS.some((source) => source.id === wall.id))).toBe(
      false,
    )
  })

  it('kaynak aynı pencerede silinmişse yeni kat BOŞ açılır, çökmez', () => {
    const withCopy = addDraftFloor(currentDraft(), { copyFromFloorId: DEFAULT_FLOOR_ID })
    const draft = removeDraftFloors(withCopy, [DEFAULT_FLOOR_ID])

    expect(useCadStore.getState().applyFloorPlan(draft)).toBe(true)

    const addedId = useCadStore.getState().floors.at(-1)?.id
    expect(useCadStore.getState().walls.filter((wall) => wall.floorId === addedId)).toHaveLength(0)
  })

  it('listeden düşen katın ÇİZİMİ de silinir', () => {
    const draft = removeDraftFloors(currentDraft(), [DEFAULT_FLOOR_ID])

    expect(useCadStore.getState().applyFloorPlan(draft)).toBe(true)

    const state = useCadStore.getState()
    expect(state.floors.map((floor) => floor.id)).toEqual([UPPER_FLOOR_ID])
    expect(state.walls).toHaveLength(0)
    expect(state.points).toHaveLength(0)
    // Açıklık floorId taşımaz; duvarı gidince o da gitmeli (K9).
    expect(state.openings).toHaveLength(0)
  })

  it('aktif kat silinmişse plandaki aktif kat yerine kalan bir kat seçilir', () => {
    const draft = removeDraftFloors(currentDraft(), [DEFAULT_FLOOR_ID])

    useCadStore.getState().applyFloorPlan({ ...draft, activeFloorId: DEFAULT_FLOOR_ID })

    expect(useCadStore.getState().activeFloorId).toBe(UPPER_FLOOR_ID)
  })

  it('ekleme + silme + yeniden adlandırma TEK Ctrl+Z ile geri alınır (KK-20)', () => {
    const draft = addDraftFloor(removeDraftFloors(currentDraft(), [UPPER_FLOOR_ID]))
    useCadStore.getState().applyFloorPlan(draft)

    undoProject()

    const { floors } = useCadStore.getState()
    expect(floors.map((floor) => floor.name)).toEqual(['Zemin Kat', '1. Kat'])
    expect(useCadStore.getState().walls).toHaveLength(FIXTURE_WALLS.length)
  })

  it('boş plan, çakışan ad ve sınır dışı yükseklik reddedilir — id HARCANMAZ', () => {
    const draft = currentDraft()
    const before = useCadStore.getState().nextUniqueId

    expect(useCadStore.getState().applyFloorPlan({ ...draft, floors: [] })).toBe(false)
    expect(
      useCadStore.getState().applyFloorPlan({
        ...draft,
        floors: draft.floors.map((floor) => ({ ...floor, name: 'Aynı' })),
      }),
    ).toBe(false)
    expect(
      useCadStore.getState().applyFloorPlan({
        ...draft,
        floors: [{ ...draft.floors[0], heightCm: 999 }, draft.floors[1]],
      }),
    ).toBe(false)

    expect(useCadStore.getState().nextUniqueId).toBe(before)
    expect(useCadStore.getState().floors).toHaveLength(2)
  })

  it('bodrumu zemin üstüne koyan planı reddeder', () => {
    const draft = currentDraft()
    const plan = {
      ...draft,
      floors: [draft.floors[0], { ...draft.floors[1], isBasement: true }],
    }

    expect(useCadStore.getState().applyFloorPlan(plan)).toBe(false)
  })

  it('reddedilen plan projeyi KİRLETMEZ', () => {
    const draft = currentDraft()
    const before = useCadStore.getState().revision

    useCadStore.getState().applyFloorPlan({ ...draft, floors: [] })

    expect(useCadStore.getState().revision).toBe(before)
  })
})
