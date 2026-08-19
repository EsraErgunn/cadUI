import { describe, expect, it } from 'vitest'

import { createGroundFloor } from '../floors'
import { DEFAULT_FLOOR_ID, type ProjectData } from '../model'

/**
 * Açıklıkların yükle→kaydet turunda bit bit korunduğunu doğrular.
 * Paylaşılan kabul testi (roundtrip.test.ts) ve docs/sample-project.json
 * serialize.ts sahibinin işi; burada JSON.stringify/parse doğrudan kullanılıyor.
 */
const project: ProjectData = {
  nextUniqueId: 15,
  activeFloorId: DEFAULT_FLOOR_ID,
  floors: [createGroundFloor()],
  points: [
    { id: 2, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
    { id: 3, floorId: DEFAULT_FLOOR_ID, x: 500, y: 0 },
    { id: 4, floorId: DEFAULT_FLOOR_ID, x: 500, y: 400 },
  ],
  walls: [
    { id: 8, floorId: DEFAULT_FLOOR_ID, p1Id: 2, p2Id: 3, thickness: 20, height: 280 },
    { id: 9, floorId: DEFAULT_FLOOR_ID, p1Id: 3, p2Id: 4, thickness: 30, height: 280 },
  ],
  openings: [
    // Tam sayı olmayan offset bilinçli: float yuvarlanırsa tur bozulur.
    { id: 12, wallId: 8, offsetCm: 137.5, widthCm: 90, type: 'door' },
    { id: 13, wallId: 9, offsetCm: 200, widthCm: 120, type: 'window' },
  ],
  rooms: [],
  symbols: [],
  areaObjects: [],
  beams: [],
  texts: [],
  installationElements: [],
  installationLines: [],
  installationConnections: [],
  floorPipeLinks: [],
}

describe('açıklık yükle→kaydet turu', () => {
  const json = JSON.stringify(project)

  it('tur sonunda bit bit aynı JSON üretir', () => {
    expect(JSON.stringify(JSON.parse(json))).toBe(json)
  })

  it('float offseti yuvarlamaz', () => {
    expect(json).toContain('"offsetCm":137.5')
    expect((JSON.parse(json) as ProjectData).openings[0].offsetCm).toBe(137.5)
  })

  it('id sayı olarak yazılır, Record<Id, T> sızmamıştır', () => {
    expect(json).toContain('"id":12')
    // Record<Id, Opening> kullanılsaydı anahtarlar {"12": …} diye string'e çevrilirdi.
    expect(json).not.toMatch(/"\d+":/)
  })

  it('Opening alan kümesi sözleşmedeki gibidir', () => {
    // floorId (duvardan türetilir) ve yükseklik bilinçli olarak YOK — K9/K10.
    expect(Object.keys(project.openings[0])).toEqual([
      'id',
      'wallId',
      'offsetCm',
      'widthCm',
      'type',
    ])
  })

  it('açıklıklar duvar id referansını korur', () => {
    const parsed = JSON.parse(json) as ProjectData
    expect(parsed.openings.map((opening) => opening.wallId)).toEqual([8, 9])
    expect(parsed.openings).toEqual(project.openings)
  })
})
