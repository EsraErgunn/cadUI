import { describe, expect, it } from 'vitest'

import type {
  InstallationElement,
  InstallationLine,
} from '../../plumbing/core/installationModel'
import type { AreaObject, Beam, Point, PointSymbol, TextLabel, Wall } from '../model'
import { buildPlanSvg, type PlanSvgInput } from '../pdf/planSvg'

const FLOOR = 1

const point = (id: number, x: number, y: number): Point => ({ id, floorId: FLOOR, x, y })
const wall = (id: number, p1Id: number, p2Id: number): Wall => ({
  id,
  floorId: FLOOR,
  p1Id,
  p2Id,
  thickness: 20,
  height: 280,
})

const BASE = {
  points: [point(1, 0, 0), point(2, 400, 0), point(3, 400, 300), point(4, 0, 300)],
  walls: [wall(10, 1, 2), wall(11, 2, 3), wall(12, 3, 4), wall(13, 4, 1)],
  openings: [],
  rooms: [],
  symbols: [],
  areaObjects: [],
  beams: [],
  texts: [],
  installationLines: [],
  floorId: FLOOR,
  fontFamily: 'Roboto',
  installationElements: [],
  resolveLineColor: () => '#c0392b',
  resolveSymbolAsset: () => undefined,
  resolveElementLabel: () => undefined,
} satisfies PlanSvgInput

const build = (overrides: Partial<PlanSvgInput> = {}) =>
  buildPlanSvg({ ...BASE, ...overrides }).markup

describe('ölçü yazıları', () => {
  it('duvar ölçüleri METRE cinsinden basılır', () => {
    // Paftada okunan birim metre; modelin birimi cm.
    expect(build()).toMatch(/>\d+\.\d{2} m</)
  })

  it('KÖŞE AÇILARI basılmaz (K154)', () => {
    // Pafta tesisat odaklı: dik köşede "90°" mimari bir ayrıntı, tesisatçıya
    // bir şey söylemiyor ve yazı kalabalığını artırıyordu. Ekranda duruyorlar.
    expect(build()).not.toMatch(/>\d+°</)
  })
})

describe('nesneler', () => {
  const beam: Beam = {
    id: 40,
    floorId: FLOOR,
    x1: 0,
    y1: 150,
    x2: 400,
    y2: 150,
    thicknessCm: 25,
    label: 'K-01',
  }

  const areaObject: AreaObject = {
    id: 41,
    type: 'stairs',
    floorId: FLOOR,
    x: 200,
    y: 200,
    widthCm: 100,
    lengthCm: 240,
    angleDeg: 0,
    label: 'M-01',
  }

  it('kiriş DOLGUSUZ kontur olarak basılır: altındaki oda dolgusu kaybolmasın', () => {
    const markup = build({ beams: [beam] })

    expect(markup).toContain('fill="none"')
  })

  it('alan nesnesi de kontur olarak basılır', () => {
    const markup = build({ areaObjects: [areaObject] })

    expect(markup.match(/fill="none"/g)?.length).toBeGreaterThan(0)
  })

  it('BAŞKA kattaki nesne çizilmez', () => {
    const markup = build({ beams: [{ ...beam, floorId: 999 }] })

    expect(markup).not.toContain('fill="none"')
  })

  it('serbest sembol çizilir', () => {
    const symbol: PointSymbol = {
      id: 42,
      type: 'panel',
      label: 'P-01',
      note: '',
      attachment: 'free',
      floorId: FLOOR,
      x: 100,
      y: 100,
      rotationDeg: 0,
    }

    // Sembol geometrisi çizgi/dolgu üretir; duvarlar dışında en az bir şey daha olmalı.
    const withSymbol = build({ symbols: [symbol] })
    expect(withSymbol.length).toBeGreaterThan(build().length)
  })
})

describe('serbest metin', () => {
  const text: TextLabel = {
    id: 50,
    floorId: FLOOR,
    x: 200,
    y: 150,
    text: 'Kazan Dairesi',
    heightCm: 30,
    angleDeg: 0,
  }

  it('metin yazılır ve boyu DÜNYA ölçüsü olarak geçer', () => {
    const markup = build({ texts: [text] })

    expect(markup).toContain('>Kazan Dairesi<')
    expect(markup).toContain('font-size="30"')
  })

  it('açılı metin döndürülür', () => {
    const markup = build({ texts: [{ ...text, angleDeg: 45 }] })

    // Plan açısı saat yönünün TERSİNE, SVG rotate saat yönünde → işaret çevrilir.
    expect(markup).toContain('rotate(-45')
  })
})

const line: InstallationLine = {
    id: 60,
    floorId: FLOOR,
    kind: 'pipe',
    pipeTypeName: 'DN25',
    points: [
      { id: 61, position: { x: 50, y: 50 } },
      { id: 62, position: { x: 350, y: 50 } },
    ],
  segments: [],
}

describe('tesisat', () => {
  it('hat GERÇEK çapıyla basılır: ölçekli paftada kalınlık ölçülebilir bilgidir', () => {
    const markup = build({ installationLines: [line] })

    expect(markup).toContain('<polyline')
    // DN25'in dış çapı katalogdan gelir; sıfır olmamalı.
    expect(markup).toMatch(/<polyline[^>]*stroke-width="[1-9]/)
  })

  it('renk DIŞARIDAN gelir: core sahne paletini import etmez', () => {
    const markup = build({ installationLines: [line], resolveLineColor: () => '#123456' })

    expect(markup).toContain('#123456')
  })

  it('tek noktalı hat çizilmez', () => {
    const markup = build({
      installationLines: [{ ...line, points: [{ id: 61, position: { x: 0, y: 0 } }] }],
    })

    expect(markup).not.toContain('<polyline')
  })

  it('BAŞKA kattaki hat çizilmez', () => {
    const markup = build({ installationLines: [{ ...line, floorId: 999 }] })

    expect(markup).not.toContain('<polyline')
  })
})

describe('tesisat elemanları', () => {
  const element: InstallationElement = {
    id: 70,
    floorId: FLOOR,
    type: 'boiler',
    position: { x: 200, y: 150 },
    angleDeg: 0,
    scale: 1,
  }

  // Gerçek sembol varlığının yerine sade bir gövde: test dönüşümü sınıyor,
  // varlık dosyasının içeriğini değil.
  const asset = { body: '<rect width="10" height="10" />', originX: 30, originY: 27 }
  const withAsset = (overrides: Partial<InstallationElement> = {}) =>
    build({ installationElements: [{ ...element, ...overrides }], resolveSymbolAsset: () => asset })

  it('eleman sembolü çizime GİRER', () => {
    expect(withAsset()).toContain('<rect width="10" height="10" />')
  })

  it('bağlanma noktası elemanın konumuna oturur', () => {
    // Zincir sağdan sola: origin sıfıra çekilir, sonra konuma taşınır.
    // y işareti çevrilir çünkü çıktı svg'sinde y AŞAĞI büyür.
    expect(withAsset()).toContain('translate(200 -150)')
    expect(withAsset()).toContain('translate(-30 -27)')
  })

  it('açı TERS işaretle uygulanır: plan saat yönünün tersine, svg saat yönünde', () => {
    expect(withAsset({ angleDeg: 90 })).toContain('rotate(-90)')
  })

  it('ölçek uygulanır', () => {
    expect(withAsset({ scale: 2 })).toContain('scale(2)')
  })

  it('sembolü çözülemeyen eleman çizilmez', () => {
    const markup = build({
      installationElements: [element],
      resolveSymbolAsset: () => undefined,
    })

    expect(markup).not.toContain('<g transform')
  })

  it('BAŞKA kattaki eleman çizilmez', () => {
    expect(withAsset({ floorId: 999 })).not.toContain('<g transform')
  })

  it('eleman hattın ÜSTÜNDE: armatür borunun altında kalmasın', () => {
    const markup = build({
      installationLines: [line],
      installationElements: [element],
      resolveSymbolAsset: () => asset,
    })

    expect(markup.indexOf('<polyline')).toBeLessThan(markup.indexOf('<g transform'))
  })
})

describe('baskı paleti', () => {
  const wallStroke = () => (build().match(/<line[^>]*stroke="(#[0-9a-f]{6})"/) ?? [])[1]

  it('duvar ne siyah ne de tesisat hayaleti tonunda', () => {
    // İki tur ayar gerekti: önce #1f2933 (boruyu yutuyordu), sonra #94a3b8
    // (fazla soluk kaldı ve sembolleri görünmez etti).
    expect(wallStroke()).not.toBe('#1f2933')
    expect(wallStroke()).not.toBe('#94a3b8')
  })

  it('duvara oturan SEMBOL duvardan farklı renkte — yoksa görünmez olur', () => {
    const symbol: PointSymbol = {
      id: 43,
      type: 'vent',
      label: 'M-01',
      note: '',
      attachment: 'free',
      floorId: FLOOR,
      x: 200,
      y: 0,
      rotationDeg: 0,
    }
    const markup = build({ symbols: [symbol] })
    const symbolStrokes = [...markup.matchAll(/<polyline[^>]*stroke="(#[0-9a-f]{6})"/g)].map(
      (m) => m[1],
    )

    // Menfez duvarın ÜSTÜNE oturuyor; aynı tonda çizilince kayboluyordu
    // (kullanıcı bildirimi).
    expect(symbolStrokes.length).toBeGreaterThan(0)
    for (const stroke of symbolStrokes) expect(stroke).not.toBe(wallStroke())
  })

  it('KOLON da dahil hiçbir alan nesnesi DOLU değil (K154)', () => {
    const base: AreaObject = {
      id: 44,
      type: 'structuralColumn',
      floorId: FLOOR,
      x: 200,
      y: 150,
      widthCm: 40,
      lengthCm: 40,
      angleDeg: 0,
      label: 'S-01',
    }

    // Kolon eskiden taşıyıcı kütle diye DOLU basılıyordu; pafta tesisat odaklı
    // olunca kural düştü — altından geçen boru mimari yüzeyin arkasında
    // kalmamalı. Sınır yine çiziliyor, yalnız konturla.
    for (const type of ['structuralColumn', 'stairs'] as const) {
      const markup = build({ areaObjects: [{ ...base, type }] })
      for (const fill of [...markup.matchAll(/<polygon[^>]*fill="([^"]+)"/g)]) {
        expect(fill[1]).toBe('none')
      }
      expect(markup).toMatch(/<polygon[^>]*stroke="#[0-9a-f]{6}"/)
    }
  })

  it('mimarinin İKİ kademesi var: duvar belirgin, geri kalanı silik', () => {
    const areaObject: AreaObject = {
      id: 44,
      type: 'structuralColumn',
      floorId: FLOOR,
      x: 200,
      y: 150,
      widthCm: 40,
      lengthCm: 40,
      angleDeg: 0,
      label: 'S-01',
    }
    const markup = build({ areaObjects: [areaObject] })
    const objectStroke = (markup.match(/<polyline[^>]*stroke="(#[0-9a-f]{6})"/) ?? [])[1]

    // Tek ton istenmedi (kullanıcı kararı): merdiven basamağı ile duvar aynı
    // ağırlıkta çıkınca plan yine kalabalık okunuyor.
    expect(objectStroke).toBeDefined()
    expect(objectStroke).not.toBe(wallStroke())
  })

  it('tesisat eleman etiketi mimari yazıdan KOYU', () => {
    const areaObject: AreaObject = {
      id: 44,
      type: 'structuralColumn',
      floorId: FLOOR,
      x: 200,
      y: 150,
      widthCm: 40,
      lengthCm: 40,
      angleDeg: 0,
      label: 'S-01',
    }
    // Yapı elemanı adı ile cihaz adı AYNI çizim yolundan (buildLabelSvg) geçiyor;
    // renk sabitlenseydi cihaz adı plan yazısı gibi okunurdu.
    const architectureText = (build({ areaObjects: [areaObject] }).match(
      /<text[^>]*>Kolon</,
    ) ?? [])[0]
    const installationText = (build({
      installationElements: [
        {
          id: 90,
          floorId: FLOOR,
          type: 'combiBoiler',
          position: { x: 200, y: 150 },
          angleDeg: 0,
          scale: 1,
        },
      ],
      resolveSymbolAsset: () => ({ body: '<rect />', originX: 0, originY: 0 }),
      resolveElementLabel: () => ({ anchor: { x: 260, y: 200 }, lines: ['K-01'] }),
    }).match(/<text[^>]*>K-01</) ?? [])[0]

    expect(architectureText).toBeDefined()
    expect(installationText).toBeDefined()
    expect(installationText).not.toContain('#8a94a1')
    expect(architectureText).toContain('#8a94a1')
  })

  it('tesisat KENDİ renginde kalır: solmaz', () => {
    const markup = build({ installationLines: [line], resolveLineColor: () => '#c0392b' })

    expect(markup).toContain('#c0392b')
  })
})

describe('eleman etiketi', () => {
  const element: InstallationElement = {
    id: 80,
    floorId: FLOOR,
    type: 'combiBoiler',
    position: { x: 200, y: 150 },
    angleDeg: 0,
    scale: 1,
  }

  const withLabel = (lines: readonly string[]) =>
    build({
      installationElements: [element],
      resolveSymbolAsset: () => ({ body: '<rect />', originX: 0, originY: 0 }),
      resolveElementLabel: () => ({ anchor: { x: 200, y: 200 }, lines }),
    })

  it('satırlar yazılır', () => {
    const markup = withLabel(['Kombi', '24 kW'])

    expect(markup).toContain('>Kombi<')
    expect(markup).toContain('>24 kW<')
  })

  it('satırlar AŞAĞI doğru dizilir: plan y yukarı büyüdüğü için eksilir', () => {
    const markup = withLabel(['Kombi', '24 kW'])
    const first = markup.indexOf('>Kombi<')
    const second = markup.indexOf('>24 kW<')

    // İkinci satırın y'si (svg uzayında) birinciden BÜYÜK olmalı = daha aşağıda.
    const yOf = (at: number) => Number(/y="(-?[\d.]+)"/.exec(markup.slice(0, at).split('<text').pop() ?? '')?.[1] ?? '0')
    expect(yOf(second)).toBeGreaterThan(yOf(first))
  })

  it('etiketi olmayan eleman yazı üretmez', () => {
    const markup = build({
      installationElements: [element],
      resolveSymbolAsset: () => ({ body: '<rect />', originX: 0, originY: 0 }),
      resolveElementLabel: () => undefined,
    })

    // Ölçü yazıları zaten var; kontrol edilen ELEMAN etiketinin yokluğu.
    expect(markup).not.toContain('>Kombi<')
  })

  it('boş satır listesi yazı üretmez', () => {
    expect(withLabel([])).not.toContain('>Kombi<')
  })
})

describe('kesikli kılavuz çizgiler', () => {
  it('tesisat elemanının etiketi nesnesine kesikli çizgiyle bağlanır', () => {
    const markup = build({
      installationElements: [
        {
          id: 90,
          floorId: FLOOR,
          type: 'combiBoiler',
          position: { x: 200, y: 150 },
          angleDeg: 0,
          scale: 1,
        },
      ],
      resolveSymbolAsset: () => ({ body: '<rect />', originX: 0, originY: 0 }),
      resolveElementLabel: () => ({ anchor: { x: 200, y: 240 }, lines: ['Kombi'] }),
    })

    expect(markup).toMatch(/<line[^>]*stroke-dasharray=/)
  })

  it('kılavuz nesneden çıkar ve yazının KUTUSUNDA durur, merkezinde değil', () => {
    const markup = build({
      installationElements: [
        {
          id: 91,
          floorId: FLOOR,
          type: 'combiBoiler',
          position: { x: 200, y: 100 },
          angleDeg: 0,
          scale: 1,
        },
      ],
      resolveSymbolAsset: () => ({ body: '<rect />', originX: 0, originY: 0 }),
      resolveElementLabel: () => ({ anchor: { x: 200, y: 250 }, lines: ['Kombi'] }),
    })

    const leader = /<line x1="200" y1="-100" x2="200" y2="(-?[\d.]+)"[^>]*dasharray/.exec(markup)
    expect(leader).not.toBeNull()
    // Yazı merkezi y=250 (svg -250); kılavuz kutunun ALT kenarında durmalı,
    // yani merkeze VARMADAN. svg uzayında -250'den büyük (daha aşağıda) bir y.
    expect(Number(leader?.[1])).toBeGreaterThan(-250)
  })

  it('alan nesnesinin adı da kesikli çizgiyle bağlanır', () => {
    const markup = build({
      areaObjects: [
        {
          id: 92,
          type: 'flueShaft',
          floorId: FLOOR,
          x: 200,
          y: 150,
          widthCm: 40,
          lengthCm: 40,
          angleDeg: 0,
          label: 'BŞ-01',
        },
      ],
    })

    // TÜRÜN adı yazılır, kod ("BŞ-01") değil — ekrandaki kuralın aynısı.
    expect(markup).toContain('>Baca Şaftı<')
    expect(markup).not.toContain('>BŞ-01<')
    expect(markup).toMatch(/<line[^>]*stroke-dasharray=/)
  })

  it('MERDİVEN adlanmaz: oku ve basamakları zaten anlatıyor', () => {
    const markup = build({
      areaObjects: [
        {
          id: 93,
          type: 'stairs',
          floorId: FLOOR,
          x: 200,
          y: 150,
          widthCm: 100,
          lengthCm: 240,
          angleDeg: 0,
          label: 'M-01',
        },
      ],
    })

    expect(markup).not.toContain('>Merdiven<')
  })
})

describe('baca ve havalandırma kanalı', () => {
  const duct = (kind: 'chimney' | 'ventilationDuct'): InstallationLine => ({
    id: 95,
    floorId: FLOOR,
    kind,
    pipeTypeName: 'DN25',
    points: [
      { id: 96, position: { x: 60, y: 60 } },
      { id: 97, position: { x: 340, y: 60 } },
    ],
    segments: [],
  })

  it('boru gibi TEK çizgi değil, çift çizgili kanal olarak çizilir', () => {
    const pipeStrokes = (build({ installationLines: [line] }).match(/<polyline/g) ?? []).length
    const ductStrokes = (build({ installationLines: [duct('chimney')] }).match(/<polyline/g) ?? [])
      .length

    // Kanal en az iki duvar çizgisi + kapak üretir; boru tek polyline.
    expect(pipeStrokes).toBe(1)
    expect(ductStrokes).toBeGreaterThan(2)
  })

  it('havalandırma da kanal olarak çizilir', () => {
    expect((build({ installationLines: [duct('ventilationDuct')] }).match(/<polyline/g) ?? []).length)
      .toBeGreaterThan(2)
  })
})

describe('kapı ve pencere sembolü', () => {
  const opening = (type: 'door' | 'window') => ({
    id: 98,
    wallId: 10,
    offsetCm: 200,
    widthCm: 90,
    type,
  })

  it('kapıda KANAT dolu basılır', () => {
    // Ekranda kapı kanadı dolu koyu alan; pencerede yok.
    const door = build({ openings: [opening('door')] })
    const window = build({ openings: [opening('window')] })

    expect((door.match(/<polygon/g) ?? []).length).toBeGreaterThan(
      (window.match(/<polygon/g) ?? []).length,
    )
  })

  it('söve ve yüz çizgileri basılır: düz dikdörtgen değil', () => {
    const markup = build({ openings: [opening('window')] })

    // Sembol birden çok çizgi üretir; boşluğun beyaz dolgusu tek başına yetmezdi.
    expect((markup.match(/<polyline/g) ?? []).length).toBeGreaterThan(2)
  })
})
