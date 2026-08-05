import { describe, expect, it } from 'vitest'

import { DEFAULT_FLOOR_ID, DEFAULT_FLOOR_NAME, type ProjectData } from '../model'
import { ProjectDataParseError, parseProjectJson, serializeProjectData } from '../serialize'

const emptyProject: ProjectData = {
  nextUniqueId: 2,
  activeFloorId: DEFAULT_FLOOR_ID,
  floors: [{ id: DEFAULT_FLOOR_ID, name: DEFAULT_FLOOR_NAME }],
  points: [],
  walls: [],
  openings: [],
  rooms: [],
  symbols: [],
}

describe('serializeProjectData', () => {
  it('alanları sabit sırayla yazar', () => {
    expect(serializeProjectData(emptyProject)).toBe(
      '{"nextUniqueId":2,"activeFloorId":1,"floors":[{"id":1,"name":"Zemin Kat"}],' +
        '"points":[],"walls":[],"openings":[],"rooms":[],"symbols":[]}',
    )
  })

  it('rooms/symbols alanı OLMAYAN eski dosyayı açar', () => {
    // Depodaki çizimler bu diziler modele girmeden önce kaydedildi. Zorunlu
    // tutulursa kullanıcının verisi elimizde ama erişilemez olur.
    const legacy =
      '{"nextUniqueId":2,"activeFloorId":1,"floors":[{"id":1,"name":"Zemin Kat"}],' +
      '"points":[],"walls":[],"openings":[]}'

    const parsed = parseProjectJson(legacy)

    expect(parsed.rooms).toEqual([])
    expect(parsed.symbols).toEqual([])
  })

  it('eski dosya bir kez kaydedilince alanlar dosyaya yazılır', () => {
    const legacy =
      '{"nextUniqueId":2,"activeFloorId":1,"floors":[{"id":1,"name":"Zemin Kat"}],' +
      '"points":[],"walls":[],"openings":[]}'

    expect(serializeProjectData(parseProjectJson(legacy))).toContain('"rooms":[],"symbols":[]')
  })

  it('store’a sızmış fazladan alanı JSON’a taşımaz', () => {
    // Kaydedilen JSON = sözleşme. Geçici bir UI alanı store’a eklenirse
    // spread ile sessizce dosyaya yazılırdı.
    const polluted = {
      ...emptyProject,
      points: [{ id: 2, floorId: 1, x: 1, y: 2, isHovered: true }],
    } as unknown as ProjectData

    expect(serializeProjectData(polluted)).not.toContain('isHovered')
  })

  it('ondalıkları yuvarlamaz', () => {
    const withFloat: ProjectData = {
      ...emptyProject,
      points: [{ id: 2, floorId: 1, x: 1000 / 3, y: -0.5 }],
    }

    expect(serializeProjectData(withFloat)).toContain('"x":333.3333333333333')
  })
})

describe('parseProjectJson', () => {
  it('geçerli JSON’u modele çevirir', () => {
    expect(parseProjectJson(serializeProjectData(emptyProject))).toEqual(emptyProject)
  })

  it('JSON olmayan metni reddeder', () => {
    expect(() => parseProjectJson('<html>oturum düştü</html>')).toThrow(ProjectDataParseError)
  })

  it('eksik alanı reddeder', () => {
    expect(() => parseProjectJson('{"nextUniqueId":2}')).toThrow(ProjectDataParseError)
  })

  it('tanınmayan açıklık tipini reddeder', () => {
    const raw = JSON.stringify({
      ...emptyProject,
      openings: [{ id: 3, wallId: 4, offsetCm: 10, widthCm: 90, type: 'hatch' }],
    })

    expect(() => parseProjectJson(raw)).toThrow(ProjectDataParseError)
  })

  it('id’nin ondalık gelmesini reddeder', () => {
    // Id artan TAMSAYI (knowledge/id-scheme.md); 1.5 gelirse eşleşmeler sessizce şaşar.
    const raw = JSON.stringify({ ...emptyProject, floors: [{ id: 1.5, name: 'Bodrum' }] })

    expect(() => parseProjectJson(raw)).toThrow(ProjectDataParseError)
  })

  it('hangi alanın bozuk olduğunu söyler', () => {
    try {
      parseProjectJson('{"nextUniqueId":2}')
      expect.unreachable('parse başarısız olmalıydı')
    } catch (error) {
      expect((error as ProjectDataParseError).issues.join(' ')).toContain('activeFloorId')
    }
  })
})
