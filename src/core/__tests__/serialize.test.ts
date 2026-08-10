import { describe, expect, it } from 'vitest'

import { createGroundFloor } from '../floors'
import { DEFAULT_FLOOR_ID, type ProjectData } from '../model'
import { ProjectDataParseError, parseProjectJson, serializeProjectData } from '../serialize'

const emptyProject: ProjectData = {
  nextUniqueId: 2,
  activeFloorId: DEFAULT_FLOOR_ID,
  floors: [createGroundFloor()],
  points: [],
  walls: [],
  openings: [],
  rooms: [],
  symbols: [],
  areaObjects: [],
}

describe('serializeProjectData', () => {
  it('alanları sabit sırayla yazar', () => {
    expect(serializeProjectData(emptyProject)).toBe(

      '{"nextUniqueId":2,"activeFloorId":1,' +
        '"floors":[{"id":1,"name":"Zemin Kat","heightCm":300,"isBasement":false}],' +
        '"points":[],"walls":[],"openings":[],"rooms":[],"symbols":[],"areaObjects":[]}',

    )
  })

  it('rooms/symbols/areaObjects alanı OLMAYAN eski dosyayı açar', () => {
    // Depodaki çizimler bu diziler modele girmeden önce kaydedildi. Zorunlu
    // tutulursa kullanıcının verisi elimizde ama erişilemez olur.
    const legacy =
      '{"nextUniqueId":2,"activeFloorId":1,"floors":[{"id":1,"name":"Zemin Kat"}],' +
      '"points":[],"walls":[],"openings":[]}'

    const parsed = parseProjectJson(legacy)

    expect(parsed.rooms).toEqual([])
    expect(parsed.symbols).toEqual([])
    expect(parsed.areaObjects).toEqual([])
  })

  it('eski dosya bir kez kaydedilince alanlar dosyaya yazılır', () => {
    const legacy =
      '{"nextUniqueId":2,"activeFloorId":1,"floors":[{"id":1,"name":"Zemin Kat"}],' +
      '"points":[],"walls":[],"openings":[]}'

    expect(serializeProjectData(parseProjectJson(legacy))).toContain(
      '"rooms":[],"symbols":[],"areaObjects":[]',
    )
  })

  it('heightCm/isBasement alanı OLMAYAN eski katı varsayılanlarla okur', () => {
    // Kat yüksekliği modele sonradan geldi; zorunlu tutulsaydı depodaki her
    // çizim "expected number, received undefined" ile hiç açılmazdı.
    const legacy =
      '{"nextUniqueId":2,"activeFloorId":1,"floors":[{"id":1,"name":"Zemin Kat"}],' +
      '"points":[],"walls":[],"openings":[],"rooms":[],"symbols":[]}'

    expect(parseProjectJson(legacy).floors[0]).toEqual({
      id: 1,
      name: 'Zemin Kat',
      heightCm: 300,
      isBasement: false,
    })
  })

  it('eski kat bir kez kaydedilince yükseklik dosyaya yazılır', () => {
    const legacy =
      '{"nextUniqueId":2,"activeFloorId":1,"floors":[{"id":1,"name":"Zemin Kat"}],' +
      '"points":[],"walls":[],"openings":[],"rooms":[],"symbols":[]}'

    expect(serializeProjectData(parseProjectJson(legacy))).toContain(
      '"heightCm":300,"isBasement":false',
    )
  })

  it('attachment alanı OLMAYAN eski sembolü SERBEST olarak okur', () => {
    // Semboller duvara bağlanmadan önce hepsi serbestti; kaydedilmiş dosyalarda
    // ayırt edici alan yok. Zorunlu tutulursa proje hiç açılmaz.
    const legacy =
      '{"nextUniqueId":20,"activeFloorId":1,"floors":[{"id":1,"name":"Zemin Kat"}],' +
      '"points":[],"walls":[],"openings":[],"rooms":[],' +
      '"symbols":[{"id":16,"floorId":1,"type":"panel","x":120,"y":80,' +
      '"rotationDeg":0,"label":"P-01","note":""}]}'

    const [symbol] = parseProjectJson(legacy).symbols

    expect(symbol.attachment).toBe('free')
    expect(symbol).toMatchObject({ id: 16, type: 'panel', label: 'P-01' })
    expect(symbol.attachment === 'free' && symbol.x).toBe(120)
  })

  it('eski sembol bir kez kaydedilince attachment dosyaya yazılır', () => {
    const legacy =
      '{"nextUniqueId":20,"activeFloorId":1,"floors":[{"id":1,"name":"Zemin Kat"}],' +
      '"points":[],"walls":[],"openings":[],"rooms":[],' +
      '"symbols":[{"id":16,"floorId":1,"type":"panel","x":120,"y":80,' +
      '"rotationDeg":0,"label":"P-01","note":""}]}'

    expect(serializeProjectData(parseProjectJson(legacy))).toContain('"attachment":"free"')
  })

  it('yeni biçimdeki duvara bağlı sembol olduğu gibi okunur', () => {
    const modern =
      '{"nextUniqueId":20,"activeFloorId":1,"floors":[{"id":1,"name":"Zemin Kat"}],' +
      '"points":[],"walls":[],"openings":[],"rooms":[],' +
      '"symbols":[{"id":16,"type":"panel","label":"P-01","note":"",' +
      '"attachment":"wall","wallId":6,"offsetCm":120,"isMountedOnFarFace":true}]}'

    const [symbol] = parseProjectJson(modern).symbols

    expect(symbol.attachment).toBe('wall')
    expect(symbol.attachment === 'wall' && symbol.wallId).toBe(6)
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

  it('alan nesnesini yazar ve okur', () => {
    const withArea: ProjectData = {
      ...emptyProject,
      areaObjects: [
        {
          id: 5,
          type: 'structuralColumn',
          floorId: DEFAULT_FLOOR_ID,
          x: 100,
          y: 200,
          widthCm: 25,
          lengthCm: 25,
          angleDeg: 0,
          label: 'K-01',
        },
      ],
    }

    const roundTripped = parseProjectJson(serializeProjectData(withArea))

    expect(roundTripped).toEqual(withArea)
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
