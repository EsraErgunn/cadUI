import { beforeEach, describe, expect, it } from 'vitest'

import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_ID, type ProjectData } from '../../core/model'
import { parseProjectJson, serializeProjectData } from '../../core/serialize'
import { selectProjectData, useCadStore } from '../cadStore'

/**
 * Düğüm ekleme/kaldırmanın VERİYİ bozmadığını doğrular (K161).
 *
 * Ayrı dosya: `architectureWallNode.test.ts` işlemin kendi kurallarını (ret
 * koşulları, açıklık taşıma) ölçüyor, burası ise sonucun bütünlüğünü — kimlik
 * tekilliği, öksüz nokta, mahal kaydı ve JSON turu. İkisi ayrı sebeplerle
 * kırılır.
 */

/** 500 x 400 kapalı dikdörtgen; dört duvarı çevreleyen tanımlı bir mahal. */
function seedRoom(): ProjectData {
  return {
    nextUniqueId: 100,
    activeFloorId: DEFAULT_FLOOR_ID,
    floors: [createGroundFloor()],
    points: [
      { id: 1, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
      { id: 2, floorId: DEFAULT_FLOOR_ID, x: 500, y: 0 },
      { id: 3, floorId: DEFAULT_FLOOR_ID, x: 500, y: 400 },
      { id: 4, floorId: DEFAULT_FLOOR_ID, x: 0, y: 400 },
    ],
    walls: [
      { id: 10, floorId: DEFAULT_FLOOR_ID, p1Id: 1, p2Id: 2, thickness: 20, height: 280 },
      { id: 11, floorId: DEFAULT_FLOOR_ID, p1Id: 2, p2Id: 3, thickness: 20, height: 280 },
      { id: 12, floorId: DEFAULT_FLOOR_ID, p1Id: 3, p2Id: 4, thickness: 20, height: 280 },
      { id: 13, floorId: DEFAULT_FLOOR_ID, p1Id: 4, p2Id: 1, thickness: 20, height: 280 },
    ],
    openings: [{ id: 20, wallId: 10, offsetCm: 100, widthCm: 90, type: 'door' }],
    rooms: [{ id: 30, wallIds: [10, 11, 12, 13], usageType: 'kitchen' }],
    symbols: [],
    areaObjects: [],
    beams: [],
    texts: [],
    installationElements: [],
    installationLines: [],
    installationConnections: [],
    floorPipeLinks: [],
  }
}

/** Kimlik havuzları AYRI: nokta ile duvar aynı id'yi taşıyabilir, kendi içinde tekil olmalı. */
function collectDuplicateIds(data: ProjectData): string[] {
  const problems: string[] = []
  const check = (label: string, ids: readonly number[]) => {
    if (new Set(ids).size !== ids.length) problems.push(label)
  }
  check('points', data.points.map((point) => point.id))
  check('walls', data.walls.map((wall) => wall.id))
  check('openings', data.openings.map((opening) => opening.id))
  check('rooms', data.rooms.map((room) => room.id))
  return problems
}

function collectBrokenReferences(data: ProjectData): string[] {
  const problems: string[] = []
  const pointIds = new Set(data.points.map((point) => point.id))
  const wallIds = new Set(data.walls.map((wall) => wall.id))

  for (const wall of data.walls) {
    if (!pointIds.has(wall.p1Id) || !pointIds.has(wall.p2Id)) problems.push(`wall ${wall.id}`)
  }
  for (const opening of data.openings) {
    if (!wallIds.has(opening.wallId)) problems.push(`opening ${opening.id}`)
  }
  for (const room of data.rooms) {
    for (const id of room.wallIds) {
      if (!wallIds.has(id)) problems.push(`room ${room.id} → wall ${id}`)
    }
  }
  return problems
}

/** Hiçbir duvarın ucu olmayan nokta: grafta artık. */
function collectOrphanPointIds(data: ProjectData): number[] {
  const used = new Set<number>()
  for (const wall of data.walls) {
    used.add(wall.p1Id)
    used.add(wall.p2Id)
  }
  return data.points.filter((point) => !used.has(point.id)).map((point) => point.id)
}

function expectHealthy() {
  const data = selectProjectData(useCadStore.getState())
  expect(collectDuplicateIds(data)).toEqual([])
  expect(collectBrokenReferences(data)).toEqual([])
  expect(collectOrphanPointIds(data)).toEqual([])
  return data
}

beforeEach(() => {
  useCadStore.getState().loadProject(seedRoom())
})

describe('düğüm ekleme — veri bütünlüğü', () => {
  it('kimlikler tekil, referanslar sağlam, öksüz nokta yok', () => {
    useCadStore.getState().splitWallAtPoint(10, { x: 300, y: 0 })
    expectHealthy()
  })

  it('üretilen id\'ler nextUniqueId\'den gelir ve sayaç ilerler', () => {
    // Kural 6: kalıcı id'ler proje bazlı ARTAN tamsayı, asla yeniden üretilmez.
    const before = useCadStore.getState().nextUniqueId
    useCadStore.getState().splitWallAtPoint(10, { x: 300, y: 0 })
    const after = useCadStore.getState().nextUniqueId

    expect(after).toBeGreaterThan(before)
    const fresh = useCadStore
      .getState()
      .points.filter((point) => point.id >= before)
      .concat()
    expect(fresh.length).toBeGreaterThan(0)
  })

  it('MAHAL kaydı korunur: adı ve tipi kaybolmaz (K31)', () => {
    // Bölünen duvarı sınırında sayan oda parçaları da kapsamalı; kapsamazsa
    // duvar kümesi yüzünkiyle tutmaz ve kullanıcının verdiği tip kaybolur.
    useCadStore.getState().splitWallAtPoint(10, { x: 300, y: 0 })

    const rooms = useCadStore.getState().rooms
    expect(rooms).toHaveLength(1)
    expect(rooms[0]).toMatchObject({ id: 30, usageType: 'kitchen' })
    // Bölünen duvarın iki parçası da odanın kümesinde olmalı.
    expect(rooms[0].wallIds.length).toBe(5)
  })

  it('JSON turu bit bit AYNI kalır', () => {
    useCadStore.getState().splitWallAtPoint(10, { x: 300, y: 0 })

    const data = selectProjectData(useCadStore.getState())
    const json = serializeProjectData(data)
    expect(serializeProjectData(parseProjectJson(json))).toBe(json)
  })
})

describe('düğüm kaldırma — veri bütünlüğü', () => {
  beforeEach(() => {
    // Önce böl, sonra aynı düğümü kaldır: kullanıcının yaptığı tam tur.
    useCadStore.getState().splitWallAtPoint(10, { x: 300, y: 0 })
  })

  it('kimlikler tekil, referanslar sağlam, öksüz nokta yok', () => {
    const added = useCadStore.getState().points.find((point) => point.id >= 100)
    useCadStore.getState().mergeWallsAtPoint(added!.id)
    expectHealthy()
  })

  it('böl → birleştir turu duvar ve nokta sayısını GERİ getirir', () => {
    const added = useCadStore.getState().points.find((point) => point.id >= 100)
    useCadStore.getState().mergeWallsAtPoint(added!.id)

    const { walls, points } = useCadStore.getState()
    expect(walls).toHaveLength(4)
    expect(points).toHaveLength(4)
  })

  it('MAHAL kaydı turdan sağ çıkar', () => {
    const added = useCadStore.getState().points.find((point) => point.id >= 100)
    useCadStore.getState().mergeWallsAtPoint(added!.id)

    const rooms = useCadStore.getState().rooms
    expect(rooms).toHaveLength(1)
    expect(rooms[0]).toMatchObject({ id: 30, usageType: 'kitchen' })
    expect(rooms[0].wallIds).toHaveLength(4)
  })

  it('AÇIKLIK turdan sağ çıkar: duvarı ve offset\'i geri gelir', () => {
    const added = useCadStore.getState().points.find((point) => point.id >= 100)
    useCadStore.getState().mergeWallsAtPoint(added!.id)

    expect(useCadStore.getState().openings).toHaveLength(1)
    expect(useCadStore.getState().openings[0]).toMatchObject({ wallId: 10, offsetCm: 100 })
  })

  it('JSON turu bit bit AYNI kalır', () => {
    const added = useCadStore.getState().points.find((point) => point.id >= 100)
    useCadStore.getState().mergeWallsAtPoint(added!.id)

    const data = selectProjectData(useCadStore.getState())
    const json = serializeProjectData(data)
    expect(serializeProjectData(parseProjectJson(json))).toBe(json)
  })

  it('kaldırılan id YENİDEN kullanılmaz', () => {
    // Kural 6: id bir kez üretilir, ASLA yeniden üretilmez. Geri alma eski
    // nesneleri geri getiriyor; sayaç geriye çekilseydi id tekrarı doğardı.
    const added = useCadStore.getState().points.find((point) => point.id >= 100)!
    const counterAfterSplit = useCadStore.getState().nextUniqueId

    useCadStore.getState().mergeWallsAtPoint(added.id)
    expect(useCadStore.getState().nextUniqueId).toBeGreaterThanOrEqual(counterAfterSplit)

    useCadStore.getState().splitWallAtPoint(10, { x: 300, y: 0 })
    const reused = useCadStore.getState().points.filter((point) => point.id === added.id)
    expect(reused).toHaveLength(0)
  })
})
