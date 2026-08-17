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
    lines: state.installationLines.filter((line) => line.floorId === floorId),
    connections: state.installationConnections.filter((connection) =>
      state.installationLines.some(
        (line) => line.id === connection.lineId && line.floorId === floorId,
      ),
    ),
  }
}

beforeEach(resetState)

describe('copyFloorToTargets', () => {
  it('mimariyi hedef kata aktarır', () => {
    expect(
      useCadStore.getState().copyFloorToTargets({
        sourceFloorId: DEFAULT_FLOOR_ID,
        targetFloorIds: [UPPER_FLOOR_ID],
        mode: 'overwrite',
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
    useCadStore.getState().copyFloorToTargets({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorIds: [UPPER_FLOOR_ID],
      mode: 'overwrite',
      ...bothIncluded,
    })

    const ground = onFloor(DEFAULT_FLOOR_ID)
    expect(ground.points).toHaveLength(4)
    expect(ground.symbols[0].label).toBe('P-01')
  })

  it('kopyanın açıklığı KOPYA duvara bağlanır — kaynağınkine değil', () => {
    useCadStore.getState().copyFloorToTargets({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorIds: [UPPER_FLOOR_ID],
      mode: 'overwrite',
      ...bothIncluded,
    })

    const target = onFloor(UPPER_FLOOR_ID)
    expect(target.walls).toContain(target.openings[0].wallId)
    expect(target.openings[0].wallId).not.toBe(6)
  })

  it('kopyanın odası KOPYA duvarları gösterir', () => {
    useCadStore.getState().copyFloorToTargets({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorIds: [UPPER_FLOOR_ID],
      mode: 'overwrite',
      ...bothIncluded,
    })

    const target = onFloor(UPPER_FLOOR_ID)
    expect(target.rooms[0].wallIds.every((id) => target.walls.includes(id))).toBe(true)
    expect(target.rooms[0].name).toBe('Salon')
  })

  it('yalnız mimari seçilirse tesisat kopyalanmaz', () => {
    useCadStore.getState().copyFloorToTargets({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorIds: [UPPER_FLOOR_ID],
      mode: 'overwrite',
      isArchitectureIncluded: true,
      isInstallationIncluded: false,
    })

    expect(onFloor(UPPER_FLOOR_ID).walls).toHaveLength(4)
    expect(onFloor(UPPER_FLOOR_ID).elements).toHaveLength(0)
  })

  it('yalnız tesisat seçilirse mimari kopyalanmaz', () => {
    useCadStore.getState().copyFloorToTargets({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorIds: [UPPER_FLOOR_ID],
      mode: 'overwrite',
      isArchitectureIncluded: false,
      isInstallationIncluded: true,
    })

    expect(onFloor(UPPER_FLOOR_ID).walls).toHaveLength(0)
    expect(onFloor(UPPER_FLOOR_ID).elements).toHaveLength(1)
  })

  it('hiçbiri seçilmezse reddedilir', () => {
    expect(
      useCadStore.getState().copyFloorToTargets({
        sourceFloorId: DEFAULT_FLOOR_ID,
        targetFloorIds: [UPPER_FLOOR_ID],
        mode: 'overwrite',
        isArchitectureIncluded: false,
        isInstallationIncluded: false,
      }),
    ).toBe(false)
    expect(useCadStore.getState().revision).toBe(0)
  })

  it('"üzerine yaz" kipinde dolu hedefin AYNI TÜRDEN çizimi silinip yenisi yazılır', () => {
    useCadStore.getState().copyFloorToTargets({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorIds: [UPPER_FLOOR_ID],
      mode: 'overwrite',
      ...bothIncluded,
    })
    const firstCopyWallIds = onFloor(UPPER_FLOOR_ID).walls

    expect(
      useCadStore.getState().copyFloorToTargets({
        sourceFloorId: DEFAULT_FLOOR_ID,
        targetFloorIds: [UPPER_FLOOR_ID],
        mode: 'overwrite',
        ...bothIncluded,
      }),
    ).toBe(true)

    const second = onFloor(UPPER_FLOOR_ID)
    // Birikmedi: dört duvar yine dört, ama hepsi YENİ id taşıyor.
    expect(second.walls).toHaveLength(4)
    expect(second.walls.some((id) => firstCopyWallIds.includes(id))).toBe(false)
  })

  it('"atla" kipinde dolu hedef işlem dışında kalır', () => {
    useCadStore.getState().copyFloorToTargets({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorIds: [UPPER_FLOOR_ID],
      mode: 'overwrite',
      ...bothIncluded,
    })
    const wallCountAfterFirst = useCadStore.getState().walls.length

    expect(
      useCadStore.getState().copyFloorToTargets({
        sourceFloorId: DEFAULT_FLOOR_ID,
        targetFloorIds: [UPPER_FLOOR_ID],
        mode: 'skip',
        ...bothIncluded,
      }),
    ).toBe(false)
    expect(useCadStore.getState().walls).toHaveLength(wallCountAfterFirst)
  })

  it('yalnız mimari kopyalanınca hedefteki TESİSAT silinmez', () => {
    useCadStore.setState({
      installationElements: [
        ...useCadStore.getState().installationElements,
        {
          id: 90,
          floorId: UPPER_FLOOR_ID,
          type: 'boiler',
          position: { x: 1, y: 1 },
          angleDeg: 0,
          scale: 1,
        },
      ],
    })

    useCadStore.getState().copyFloorToTargets({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorIds: [UPPER_FLOOR_ID],
      mode: 'overwrite',
      isArchitectureIncluded: true,
      isInstallationIncluded: false,
    })

    expect(onFloor(UPPER_FLOOR_ID).elements.map((element) => element.id)).toEqual([90])
  })

  it('birden çok hedefe TEK adımda kopyalar (madde 19)', () => {
    const thirdFloorId = 15
    useCadStore.setState({
      floors: [
        ...useCadStore.getState().floors,
        { id: thirdFloorId, name: '2. Kat', heightCm: 300, isBasement: false },
      ],
    })
    // Kurulumun kendi setState"i de geçmişe yazıyor; ölçülen yalnız kopyalama olsun.
    useCadStore.temporal.getState().clear()

    expect(
      useCadStore.getState().copyFloorToTargets({
        sourceFloorId: DEFAULT_FLOOR_ID,
        targetFloorIds: [UPPER_FLOOR_ID, thirdFloorId],
        mode: 'overwrite',
        ...bothIncluded,
      }),
    ).toBe(true)

    expect(onFloor(UPPER_FLOOR_ID).walls).toHaveLength(4)
    expect(onFloor(thirdFloorId).walls).toHaveLength(4)
    expect(useCadStore.temporal.getState().pastStates).toHaveLength(1)
  })

  it('kaynak kat hedeflerden ELENİR — kendi üstüne kopyalanmaz', () => {
    expect(
      useCadStore.getState().copyFloorToTargets({
        sourceFloorId: DEFAULT_FLOOR_ID,
        targetFloorIds: [DEFAULT_FLOOR_ID],
        mode: 'overwrite',
        ...bothIncluded,
      }),
    ).toBe(false)
    expect(onFloor(DEFAULT_FLOOR_ID).walls).toHaveLength(4)
  })

  it('tanınmayan kat reddedilir ve id harcamaz', () => {
    const before = useCadStore.getState().nextUniqueId

    expect(
      useCadStore.getState().copyFloorToTargets({
        sourceFloorId: DEFAULT_FLOOR_ID,
        targetFloorIds: [404],
        mode: 'overwrite',
        ...bothIncluded,
      }),
    ).toBe(false)
    expect(useCadStore.getState().nextUniqueId).toBe(before)
  })

  it('kopyalama TEK geri alma adımıdır', () => {
    useCadStore.getState().copyFloorToTargets({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorIds: [UPPER_FLOOR_ID],
      mode: 'overwrite',
      ...bothIncluded,
    })

    expect(useCadStore.temporal.getState().pastStates).toHaveLength(1)

    useCadStore.temporal.getState().undo()
    expect(onFloor(UPPER_FLOOR_ID).walls).toHaveLength(0)
  })

  it('kopyalanan kat bağımsızdır: kaynağın köşesi oynayınca kopya oynamaz', () => {
    useCadStore.getState().copyFloorToTargets({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorIds: [UPPER_FLOOR_ID],
      mode: 'overwrite',
      ...bothIncluded,
    })
    const copiedBefore = onFloor(UPPER_FLOOR_ID).points.map((point) => ({ ...point }))

    useCadStore.getState().movePoint(2, { x: -300, y: -300 })

    expect(onFloor(UPPER_FLOOR_ID).points).toEqual(copiedBefore)
  })
})

const VALVE_ID = 20
const LINE_ID = 21
const LINE_POINT_IDS = [22, 23, 24]

/**
 * Zemin kata üç köşeli bir boru: ortasında armatür (vana), son ucu kazandaki
 * (id 13) giriş portuna bağlı. Hattın kendisi, üstündeki armatür ve bağlantı
 * kaydı AYRI referans tipleri — üçü de remap'ten geçmezse kopya sessizce
 * kaynağa bağlı kalır.
 */
function seedInstallationLine(): void {
  useCadStore.setState({
    installationElements: [
      ...useCadStore.getState().installationElements,
      {
        id: VALVE_ID,
        floorId: DEFAULT_FLOOR_ID,
        type: 'valve',
        position: { x: 250, y: 0 },
        angleDeg: 0,
        scale: 1,
      },
    ],
    installationLines: [
      {
        id: LINE_ID,
        floorId: DEFAULT_FLOOR_ID,
        kind: 'pipe',
        pipeTypeName: 'DN25',
        points: [
          { id: LINE_POINT_IDS[0], position: { x: 0, y: 0 } },
          { id: LINE_POINT_IDS[1], position: { x: 250, y: 0 }, inlineElementId: VALVE_ID },
          { id: LINE_POINT_IDS[2], position: { x: 500, y: 0 } },
        ],
        segments: [
          { id: 25, fromPointId: LINE_POINT_IDS[0], toPointId: LINE_POINT_IDS[1] },
          { id: 26, fromPointId: LINE_POINT_IDS[1], toPointId: LINE_POINT_IDS[2] },
        ],
      },
    ],
    installationConnections: [
      { lineId: LINE_ID, end: 'end', target: { kind: 'port', elementId: 13, portId: 'in' } },
    ],
  })
  useCadStore.temporal.getState().clear()
}

const installationOnly = { isArchitectureIncluded: false, isInstallationIncluded: true }

function copyToUpperFloor(mode: 'overwrite' | 'skip' = 'overwrite') {
  return useCadStore.getState().copyFloorToTargets({
    sourceFloorId: DEFAULT_FLOOR_ID,
    targetFloorIds: [UPPER_FLOOR_ID],
    mode,
    ...installationOnly,
  })
}

describe('copyFloorToTargets — tesisat hattı', () => {
  beforeEach(seedInstallationLine)

  it('hattı köşeleri ve parçalarıyla birlikte aktarır', () => {
    expect(copyToUpperFloor()).toBe(true)

    const [line] = onFloor(UPPER_FLOOR_ID).lines
    expect(line.kind).toBe('pipe')
    expect(line.pipeTypeName).toBe('DN25')
    expect(line.points.map((point) => point.position)).toEqual([
      { x: 0, y: 0 },
      { x: 250, y: 0 },
      { x: 500, y: 0 },
    ])
    expect(line.segments).toHaveLength(2)
  })

  it('parçalar KOPYA köşeleri gösterir — kaynağınkileri değil', () => {
    copyToUpperFloor()

    const [line] = onFloor(UPPER_FLOOR_ID).lines
    const pointIds = line.points.map((point) => point.id)
    expect(pointIds.some((id) => LINE_POINT_IDS.includes(id))).toBe(false)
    for (const segment of line.segments) {
      expect(pointIds).toContain(segment.fromPointId)
      expect(pointIds).toContain(segment.toPointId)
    }
  })

  it('hattın üstündeki armatür KOPYA elemana bağlanır', () => {
    copyToUpperFloor()

    const target = onFloor(UPPER_FLOOR_ID)
    const [line] = target.lines
    const inlineId = line.points.find((point) => point.inlineElementId)?.inlineElementId

    expect(inlineId).toBeDefined()
    expect(inlineId).not.toBe(VALVE_ID)
    // Armatür kopya kattaki bir elemanı göstermeli; kaynağınkini gösterseydi
    // vana iki katta birden "aynı" nesne olurdu.
    expect(target.elements.map((element) => element.id)).toContain(inlineId)
  })

  it('bağlantı kaydı KOPYA hatta ve KOPYA elemana bakar', () => {
    copyToUpperFloor()

    const target = onFloor(UPPER_FLOOR_ID)
    expect(target.connections).toHaveLength(1)

    const [connection] = target.connections
    expect(connection.lineId).toBe(target.lines[0].id)
    expect(connection.end).toBe('end')
    expect(connection.target.kind).toBe('port')
    if (connection.target.kind !== 'port') throw new Error('port bağlantısı bekleniyordu')
    expect(connection.target.portId).toBe('in')
    expect(connection.target.elementId).not.toBe(13)
    expect(target.elements.map((element) => element.id)).toContain(connection.target.elementId)
  })

  it('kopyanın köşesi kaynaktan BAĞIMSIZ: konum nesnesi paylaşılmaz', () => {
    copyToUpperFloor()
    const copiedBefore = onFloor(UPPER_FLOOR_ID).lines[0].points.map((point) => ({
      ...point.position,
    }))

    useCadStore.getState().moveLinePoint(LINE_ID, LINE_POINT_IDS[0], { x: -300, y: -300 })

    expect(onFloor(UPPER_FLOOR_ID).lines[0].points.map((point) => point.position)).toEqual(
      copiedBefore,
    )
  })

  it('"üzerine yaz" hedefin borusunu silip YERİNE yenisini yazar', () => {
    copyToUpperFloor()
    const firstLineId = onFloor(UPPER_FLOOR_ID).lines[0].id

    expect(copyToUpperFloor()).toBe(true)

    const target = onFloor(UPPER_FLOOR_ID)
    // Birikmedi ve boşalmadı: tek hat, ama YENİ id taşıyor.
    expect(target.lines).toHaveLength(1)
    expect(target.lines[0].id).not.toBe(firstLineId)
    expect(target.connections).toHaveLength(1)
  })

  it('yalnız mimari seçilirse hedefteki hat silinmez de kopyalanmaz da', () => {
    useCadStore.getState().copyFloorToTargets({
      sourceFloorId: DEFAULT_FLOOR_ID,
      targetFloorIds: [UPPER_FLOOR_ID],
      mode: 'overwrite',
      isArchitectureIncluded: true,
      isInstallationIncluded: false,
    })

    expect(onFloor(UPPER_FLOOR_ID).lines).toHaveLength(0)
    expect(onFloor(DEFAULT_FLOOR_ID).lines).toHaveLength(1)
  })

  it('kaynak katın hattına dokunmaz', () => {
    copyToUpperFloor()

    const source = onFloor(DEFAULT_FLOOR_ID)
    expect(source.lines.map((line) => line.id)).toEqual([LINE_ID])
    expect(source.lines[0].points.map((point) => point.id)).toEqual(LINE_POINT_IDS)
    expect(source.connections).toHaveLength(1)
  })
})
