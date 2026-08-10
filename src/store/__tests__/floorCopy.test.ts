import { beforeEach, describe, expect, it } from 'vitest'

import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_HEIGHT_CM, DEFAULT_FLOOR_ID } from '../../core/model'
import { useCadStore } from '../cadStore'

const UPPER_FLOOR_ID = 14

/** Zemin katta kapalı kare + kapı + oda + sembol; üst kat BOŞ. */
function resetState(): void {
  useCadStore.setState({
    floors: [
      createGroundFloor(),
      { id: UPPER_FLOOR_ID, name: '1. Kat', heightCm: DEFAULT_FLOOR_HEIGHT_CM, isBasement: false },
    ],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: [
      { id: 2, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
      { id: 3, floorId: DEFAULT_FLOOR_ID, x: 500, y: 0 },
      { id: 4, floorId: DEFAULT_FLOOR_ID, x: 500, y: 400 },
      { id: 5, floorId: DEFAULT_FLOOR_ID, x: 0, y: 400 },
    ],
    walls: [
      { id: 6, floorId: DEFAULT_FLOOR_ID, p1Id: 2, p2Id: 3, thickness: 20, height: 280 },
      { id: 7, floorId: DEFAULT_FLOOR_ID, p1Id: 3, p2Id: 4, thickness: 20, height: 280 },
      { id: 8, floorId: DEFAULT_FLOOR_ID, p1Id: 4, p2Id: 5, thickness: 20, height: 280 },
      { id: 9, floorId: DEFAULT_FLOOR_ID, p1Id: 5, p2Id: 2, thickness: 30, height: 280 },
    ],
    openings: [{ id: 10, wallId: 6, offsetCm: 250, widthCm: 90, type: 'door' }],
    rooms: [{ id: 11, wallIds: [6, 7, 8, 9], name: 'Salon' }],
    symbols: [
      {
        id: 12,
        type: 'panel',
        label: 'P-01',
        note: 'kaynak',
        attachment: 'wall',
        wallId: 6,
        offsetCm: 120,
        isMountedOnFarFace: true,
      },
    ],
    installationElements: [
      { id: 13, floorId: DEFAULT_FLOOR_ID, type: 'boiler', position: { x: 5, y: 5 }, angleDeg: 0, scale: 1 },
    ],
    nextUniqueId: 100,
    revision: 0,
    savedRevision: 0,
  })
  useCadStore.temporal.getState().clear()
}

const bothIncluded = { isArchitectureIncluded: true, isInstallationIncluded: true }

function onFloor(floorId: number) {
  const state = useCadStore.getState()
  const wallIds = new Set(
    state.walls.filter((wall) => wall.floorId === floorId).map((wall) => wall.id),
  )
  return {
    points: state.points.filter((point) => point.floorId === floorId),
    walls: [...wallIds],
    openings: state.openings.filter((opening) => wallIds.has(opening.wallId)),
    rooms: state.rooms.filter((room) => room.wallIds.some((id) => wallIds.has(id))),
    symbols: state.symbols.filter(
      (symbol) => symbol.attachment === 'wall' && wallIds.has(symbol.wallId),
    ),
    elements: state.installationElements.filter((element) => element.floorId === floorId),
  }
}

beforeEach(resetState)

describe('copyFloor', () => {
  it('mimariyi hedef kata aktarır', () => {
    expect(
      useCadStore.getState().copyFloor({
        sourceFloorId: DEFAULT_FLOOR_ID,
        targetFloorId: UPPER_FLOOR_ID,
        ...bothIncluded,
      }),
    ).toBe(true)

    const target = onFloor(UPPER_FLOOR_ID)
    expect(target.points).toHaveLength(4)
    expect(target.walls).toHaveLength(4)
    expect(target.openings).toHaveLength(1)
    expect(target.rooms).toHaveLength(1)
    expect(target.symbols).toHaveLength(1)
  })

  it('kaynak kata dokunmaz', () => {
    useCadStore.getState().copyFloor({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorId: UPPER_FLOOR_ID,
      ...bothIncluded,
    })

    const ground = onFloor(DEFAULT_FLOOR_ID)
    expect(ground.points).toHaveLength(4)
    expect(ground.symbols[0].label).toBe('P-01')
  })

  it('kopyanın açıklığı KOPYA duvara bağlanır — kaynağınkine değil', () => {
    useCadStore.getState().copyFloor({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorId: UPPER_FLOOR_ID,
      ...bothIncluded,
    })

    const target = onFloor(UPPER_FLOOR_ID)
    expect(target.walls).toContain(target.openings[0].wallId)
    expect(target.openings[0].wallId).not.toBe(6)
  })

  it('kopyanın odası KOPYA duvarları gösterir', () => {
    useCadStore.getState().copyFloor({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorId: UPPER_FLOOR_ID,
      ...bothIncluded,
    })

    const target = onFloor(UPPER_FLOOR_ID)
    expect(target.rooms[0].wallIds.every((id) => target.walls.includes(id))).toBe(true)
    expect(target.rooms[0].name).toBe('Salon')
  })

  it('yalnız mimari seçilirse tesisat kopyalanmaz', () => {
    useCadStore.getState().copyFloor({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorId: UPPER_FLOOR_ID,
      isArchitectureIncluded: true,
      isInstallationIncluded: false,
    })

    expect(onFloor(UPPER_FLOOR_ID).walls).toHaveLength(4)
    expect(onFloor(UPPER_FLOOR_ID).elements).toHaveLength(0)
  })

  it('yalnız tesisat seçilirse mimari kopyalanmaz', () => {
    useCadStore.getState().copyFloor({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorId: UPPER_FLOOR_ID,
      isArchitectureIncluded: false,
      isInstallationIncluded: true,
    })

    expect(onFloor(UPPER_FLOOR_ID).walls).toHaveLength(0)
    expect(onFloor(UPPER_FLOOR_ID).elements).toHaveLength(1)
  })

  it('hiçbiri seçilmezse reddedilir', () => {
    expect(
      useCadStore.getState().copyFloor({
        sourceFloorId: DEFAULT_FLOOR_ID,
        targetFloorId: UPPER_FLOOR_ID,
        isArchitectureIncluded: false,
        isInstallationIncluded: false,
      }),
    ).toBe(false)
    expect(useCadStore.getState().revision).toBe(0)
  })

  it('DOLU kata kopyalama reddedilir — üzerine yazılmaz', () => {
    useCadStore.getState().copyFloor({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorId: UPPER_FLOOR_ID,
      ...bothIncluded,
    })
    const wallCountAfterFirst = useCadStore.getState().walls.length

    expect(
      useCadStore.getState().copyFloor({
        sourceFloorId: DEFAULT_FLOOR_ID,
        targetFloorId: UPPER_FLOOR_ID,
        ...bothIncluded,
      }),
    ).toBe(false)
    expect(useCadStore.getState().walls).toHaveLength(wallCountAfterFirst)
  })

  it('katın kendine kopyalanması reddedilir', () => {
    expect(
      useCadStore.getState().copyFloor({
        sourceFloorId: DEFAULT_FLOOR_ID,
        targetFloorId: DEFAULT_FLOOR_ID,
        ...bothIncluded,
      }),
    ).toBe(false)
  })

  it('tanınmayan kat reddedilir ve id harcamaz', () => {
    const before = useCadStore.getState().nextUniqueId

    expect(
      useCadStore.getState().copyFloor({
        sourceFloorId: DEFAULT_FLOOR_ID,
        targetFloorId: 404,
        ...bothIncluded,
      }),
    ).toBe(false)
    expect(useCadStore.getState().nextUniqueId).toBe(before)
  })

  it('kopyalama TEK geri alma adımıdır', () => {
    useCadStore.getState().copyFloor({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorId: UPPER_FLOOR_ID,
      ...bothIncluded,
    })

    expect(useCadStore.temporal.getState().pastStates).toHaveLength(1)

    useCadStore.temporal.getState().undo()
    expect(onFloor(UPPER_FLOOR_ID).walls).toHaveLength(0)
  })

  it('kopyalanan kat bağımsızdır: kaynağın köşesi oynayınca kopya oynamaz', () => {
    useCadStore.getState().copyFloor({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorId: UPPER_FLOOR_ID,
      ...bothIncluded,
    })
    const copiedBefore = onFloor(UPPER_FLOOR_ID).points.map((point) => ({ ...point }))

    useCadStore.getState().movePoint(2, { x: -300, y: -300 })

    expect(onFloor(UPPER_FLOOR_ID).points).toEqual(copiedBefore)
  })
})
