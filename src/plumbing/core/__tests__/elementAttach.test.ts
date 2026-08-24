import { describe, expect, it } from 'vitest'

import {
  resolveFreeEndAttachment,
  resolveNearestLineAttachment,
  resolveVerticalArmAttachment,
  resolveVerticalEndAttachment,
} from '../elementAttach'
import type { InstallationConnection, InstallationLine } from '../installationModel'
import { DEFAULT_PIPE_TYPE_NAME } from '../pipeTypes'
import type { SymbolMetadata } from '../symbolMetadata'

/** Akış geçişli armatür: portları akış ekseninde, çapası merkezde. */
const VALVE_METADATA: SymbolMetadata = {
  id: 'valve',
  label: 'Vana',
  asset: 'valve.svg',
  viewBox: [0, 0, 20, 20],
  origin: [10, 10],
  ports: [
    { id: 'in', type: 'input', position: [0, 10], direction: [1, 0] },
    { id: 'out', type: 'output', position: [20, 10], direction: [1, 0] },
  ],
  bounds: { min: [0, 0], max: [20, 20] },
}

const getMetadata = () => VALVE_METADATA

/** Saf dikey boru (K102): iki nokta da aynı plan konumunda, kot 0 → 300. */
const RISER: InstallationLine = {
  id: 1,
  floorId: 10,
  kind: 'pipe',
  pipeTypeName: DEFAULT_PIPE_TYPE_NAME,
  points: [
    { id: 100, position: { x: 0, y: 0 } },
    { id: 101, position: { x: 0, y: 0 } },
  ],
  segments: [{ id: 1000, fromPointId: 100, toPointId: 101 }],
  pipe: { startHeightCm: 0, endHeightCm: 300, description: '' },
}

const HORIZONTAL: InstallationLine = {
  id: 2,
  floorId: 10,
  kind: 'pipe',
  pipeTypeName: DEFAULT_PIPE_TYPE_NAME,
  points: [
    { id: 200, position: { x: 0, y: 0 } },
    { id: 201, position: { x: 300, y: 0 } },
  ],
  segments: [{ id: 2000, fromPointId: 200, toPointId: 201 }],
  pipe: { startHeightCm: 300, endHeightCm: 300, description: '' },
}

describe('resolveVerticalEndAttachment', () => {
  it('dikey borunun ucuna yapışır ve o düğümün KOTUNU alır', () => {
    const attachment = resolveVerticalEndAttachment([RISER], getMetadata, 'valve', { x: 4, y: 3 }, 30)

    expect(attachment?.lineId).toBe(1)
    // İki uç da boşken YÜKSEK olan seçilir: kolonun tepesi açıkta duran uçtur.
    expect(attachment?.endPointId).toBe(101)
    expect(attachment?.elevationCm).toBe(300)
    expect(attachment?.placement.position).toEqual({ x: 0, y: 0 })
  })

  it('dolu düğüm aday değil: boş kalan uca ve ONUN kotuna oturur', () => {
    const topTaken: InstallationLine = {
      ...RISER,
      points: [RISER.points[0], { ...RISER.points[1], inlineElementId: 900 }],
    }

    const attachment = resolveVerticalEndAttachment([topTaken], getMetadata, 'valve', { x: 0, y: 0 }, 30)

    expect(attachment?.endPointId).toBe(100)
    expect(attachment?.elevationCm).toBe(0)
  })

  it('iki ucu da dolu kolona armatür eklenmez', () => {
    const full: InstallationLine = {
      ...RISER,
      points: [
        { ...RISER.points[0], inlineElementId: 900 },
        { ...RISER.points[1], inlineElementId: 901 },
      ],
    }

    expect(resolveVerticalEndAttachment([full], getMetadata, 'valve', { x: 0, y: 0 }, 30)).toBeNull()
  })

  it('yatay boru bu yoldan yakalanmaz — onun gövdesi bölünebilir', () => {
    expect(
      resolveVerticalEndAttachment([HORIZONTAL], getMetadata, 'valve', { x: 150, y: 0 }, 30),
    ).toBeNull()
  })

  it('yarıçap dışındaki kolon aday değil', () => {
    expect(resolveVerticalEndAttachment([RISER], getMetadata, 'valve', { x: 100, y: 0 }, 30)).toBeNull()
  })
})

describe('resolveVerticalArmAttachment', () => {
  it('kolonun ucundan İMLEÇ tarafına kısa kol çıkar, kot kolondan gelir', () => {
    const attachment = resolveVerticalArmAttachment([RISER], getMetadata, 'valve', { x: 20, y: 0 }, 30)

    expect(attachment?.armStart).toEqual({ x: 0, y: 0 })
    // Kol boyu = vananın yarı uzunluğu (10) + pay (10).
    expect(attachment?.armEnd).toEqual({ x: 20, y: 0 })
    expect(attachment?.elevationCm).toBe(300)
    expect(attachment?.endPointId).toBe(101)
  })

  it('kol imlecin bulunduğu tarafa döner', () => {
    const attachment = resolveVerticalArmAttachment([RISER], getMetadata, 'valve', { x: 0, y: -20 }, 30)

    expect(attachment?.armEnd).toEqual({ x: 0, y: -20 })
  })

  it('vana kolonun UÇ düğümünde; elemanın GİRİŞ PORTU kolun ucuna oturur', () => {
    const attachment = resolveVerticalArmAttachment([RISER], getMetadata, 'valve', { x: 20, y: 0 }, 30)
    expect(attachment?.placements[1].position).toEqual({ x: 0, y: 0 })
    // Çapa portun kendisi: gövde portun ötesinde kalır (yarı uzunluk kadar).
    expect(attachment?.placements[0].position).toEqual({ x: 30, y: 0 })
  })

  it('kolon yakalanamazsa kol da doğmaz', () => {
    expect(
      resolveVerticalArmAttachment([HORIZONTAL], getMetadata, 'valve', { x: 150, y: 0 }, 30),
    ).toBeNull()
  })
})

/** Kolonun DİBİ yatay boruya bağlı; açıkta kalan tek uç tepesidir (101). */
const RISER_CONNECTIONS: readonly InstallationConnection[] = [
  { lineId: 1, end: 'start', target: { kind: 'line', lineId: 2, pointId: 200 } },
]

describe('resolveNearestLineAttachment — dikey boru', () => {
  it('yakıcı cihaz kolonun açık ucuna kolla bağlanır', () => {
    const attachment = resolveNearestLineAttachment(
      [RISER, HORIZONTAL],
      RISER_CONNECTIONS,
      getMetadata,
      'combiBoiler',
      { x: 0, y: 40 },
    )

    expect(attachment?.lineId).toBe(1)
    expect(attachment?.endPointId).toBe(101)
    // Kol kolonun plan konumundan çıkar; cihaz imlecin bırakıldığı yerde durur.
    expect(attachment?.nodePosition).toEqual({ x: 0, y: 0 })
    expect(attachment?.placements[0].position).toEqual({ x: 0, y: 40 })
    // Vana kolonun UÇ düğümünde, plan ekseninde (kolonun plan yönü yoktur).
    expect(attachment?.placements[1].position).toEqual({ x: 0, y: 0 })
    expect(Number.isNaN(attachment?.inputPortPosition.x ?? NaN)).toBe(false)
    expect(Number.isNaN(attachment?.inputPortPosition.y ?? NaN)).toBe(false)
  })

  it('yatay boru daha yakınsa o kazanır — kolon önceliği yoktur', () => {
    const attachment = resolveNearestLineAttachment(
      [RISER, HORIZONTAL],
      RISER_CONNECTIONS,
      getMetadata,
      'combiBoiler',
      { x: 300, y: 40 },
    )

    expect(attachment?.lineId).toBe(2)
    expect(attachment?.endPointId).toBe(201)
  })

  it('kolon ucu doluysa aday değil', () => {
    const topTaken: InstallationLine = {
      ...RISER,
      points: [RISER.points[0], { ...RISER.points[1], inlineElementId: 900 }],
    }
    const attachment = resolveNearestLineAttachment(
      [topTaken],
      RISER_CONNECTIONS,
      getMetadata,
      'combiBoiler',
      { x: 0, y: 40 },
    )

    expect(attachment).toBeNull()
  })
})

describe('resolveFreeEndAttachment — kolon hâlâ dışarıda', () => {
  it('sayaç kolonun ucundan hattı UZATMAZ (kol yolu ayrı: verticalArm)', () => {
    expect(
      resolveFreeEndAttachment([RISER], RISER_CONNECTIONS, getMetadata, 'gasMeter', { x: 0, y: 10 }, 30),
    ).toBeNull()
  })
})
