import { describe, expect, it } from 'vitest'

import type { Opening, Point, Room, Wall } from '../model'
import { buildPlanSvg, type PlanSvgInput } from '../pdf/planSvg'

const FLOOR = 1

const point = (id: number, x: number, y: number): Point => ({ id, floorId: FLOOR, x, y })
const wall = (id: number, p1Id: number, p2Id: number, thickness = 20): Wall => ({
  id,
  floorId: FLOOR,
  p1Id,
  p2Id,
  thickness,
  height: 280,
})

/**
 *   4-------3   y = 300
 *   |       |
 *   1-------2   y = 0
 *   0     400
 */
function square(): Pick<PlanSvgInput, 'points' | 'walls'> {
  return {
    points: [point(1, 0, 0), point(2, 400, 0), point(3, 400, 300), point(4, 0, 300)],
    walls: [wall(10, 1, 2), wall(11, 2, 3), wall(12, 3, 4), wall(13, 4, 1)],
  }
}

/** Zorunlu alanların hepsi boş; test yalnız ilgilendiği parçayı doldurur. */
const EMPTY = {
  openings: [],
  rooms: [],
  symbols: [],
  areaObjects: [],
  beams: [],
  texts: [],
  installationLines: [],
  fontFamily: 'Roboto',
  installationElements: [],
  resolveLineColor: () => '#c0392b',
  resolveSymbolAsset: () => undefined,
  resolveElementLabel: () => undefined,
} satisfies Omit<PlanSvgInput, 'points' | 'walls' | 'floorId'>

function build(overrides: Partial<PlanSvgInput> = {}) {
  return buildPlanSvg({ ...square(), ...EMPTY, floorId: FLOOR, ...overrides })
}

describe('buildPlanSvg', () => {
  it('duvarı YUVARLAK UÇLU kalın çizgi olarak basar (kapsül, K23)', () => {
    const { markup } = build()

    // Kavşak hesabı yok: uçlar üst üste binerek dolduruyor, ekrandaki ile aynı.
    expect(markup).toContain('stroke-linecap="round"')
    // Kalınlık doğrudan stroke-width: SVG birimi plan santimi.
    expect(markup).toContain('stroke-width="20"')
  })

  it('plan y YUKARI, SVG y AŞAĞI: koordinat çevrilir', () => {
    const { markup } = build()

    // (0,300) köşesi SVG de y = -300 olmalı.
    expect(markup).toContain('y1="-300"')
  })

  it('viewBox çizimi tam sarar ve duvar KALINLIĞINI da kapsar', () => {
    const { markup, bounds } = build()

    // Duvar ekseni 0..400 x 0..300; kapsül her yöne yarım kalınlık (10) VE
    // dış konturun kalınlığı (2) kadar taşıyor. Yalnız eksene bakılsaydı
    // duvarın dış yüzü sayfa kenarında kırpılırdı.
    expect(bounds).toEqual({ minX: -12, minY: -12, maxX: 412, maxY: 312 })
    // Çevrilmiş uzayda üst kenar y = -maxY.
    expect(markup).toContain('viewBox="-12 -312 424 324"')
  })

  it('duvar İÇİ BOŞ: kontur geçişi boşluk geçişinden ÖNCE ve daha kalın', () => {
    const { markup } = build()
    const strokes = [...markup.matchAll(/<line[^>]*stroke="(#[0-9a-f]{6})"[^>]*stroke-width="(\d+)"/g)]

    // Dört duvar iki kez geçiyor: önce hepsi kontur renginde kalın, SONRA hepsi
    // tam kalınlıkta boşluk renginde. Duvar duvar konturlansaydı kapsüller
    // kavşakta üst üste biner ve her birinin konturu ötekinin içinden geçerdi.
    expect(strokes).toHaveLength(8)
    const outlinePass = strokes.slice(0, 4)
    const voidPass = strokes.slice(4)

    for (const [, color, width] of outlinePass) {
      expect(color).not.toBe('#ffffff')
      // Duvar kalınlığı 20; kontur her yöne 2 taşıyor.
      expect(width).toBe('24')
    }
    for (const [, color, width] of voidPass) {
      expect(color).toBe('#ffffff')
      expect(width).toBe('20')
    }
  })

  it('oda DOLGUSU basılmaz (K154), yalnız adı ve alanı yazılır', () => {
    const rooms: Room[] = [{ id: 20, wallIds: [10, 11, 12, 13], usageType: 'livingRoom' }]
    const { markup } = build({ rooms })

    // Pafta tesisat odaklı: dolu hiçbir mimari yüzey yok. Odalı ve odasız
    // çizimin poligon sayısı aynı kalmalı — fark yalnız yazılarda.
    expect(markup).not.toContain('<polygon')
    expect(markup).toContain('>Salon<')
  })

  it('oda adı KULLANIM TİPİNDEN türer, alanıyla birlikte yazılır', () => {
    const rooms: Room[] = [{ id: 20, wallIds: [10, 11, 12, 13], usageType: 'livingRoom' }]
    const { markup } = build({ rooms })

    // Serbest metin ad kalktı (K117); etiket `getRoomDisplayName` ile türüyor.
    expect(markup).toContain('>Salon<')
    // 400x300 cm dış ölçü, duvar kalınlığı düşülünce oda alanı 12 m² nin altında.
    expect(markup).toMatch(/>\d+\.\d{2} m²</)
  })

  it('yazılar EN ÜSTTE: duvarın altında kalmasın', () => {
    const rooms: Room[] = [{ id: 20, wallIds: [10, 11, 12, 13], usageType: 'livingRoom' }]
    const { markup } = build({ rooms })

    expect(markup.lastIndexOf('<line')).toBeLessThan(markup.indexOf('<text'))
  })

  it('açıklık duvarın ÜSTÜNE beyaz basılır: delik boşluk gibi okunsun', () => {
    const openings: Opening[] = [
      { id: 30, wallId: 10, offsetCm: 200, widthCm: 90, type: 'window' },
    ]
    const { markup } = build({ openings })

    expect(markup).toContain('fill="#ffffff"')
    expect(markup.indexOf('<line')).toBeLessThan(markup.lastIndexOf('<polygon'))
  })

  it('açıklığın beyazı duvar YÜZ ÇİZGİSİNİ de siler', () => {
    const openings: Opening[] = [
      { id: 30, wallId: 10, offsetCm: 200, widthCm: 90, type: 'window' },
    ]
    const { markup } = build({ openings })

    // Poligon tam duvar kalınlığında; olduğu gibi basılsaydı duvarın iki yüz
    // çizgisi açıklığın önünden kesintisiz geçer, delik okunmazdı. Aynı renkte
    // kontur poligonu her yöne yarım genişletiyor — kontur kalınlığının İKİ
    // katı verildiği için taşma tam yüz çizgisi kadar.
    expect(markup).toMatch(/<polygon[^>]*fill="#ffffff"[^>]*stroke="#ffffff" stroke-width="4"/)
  })

  it('BAŞKA kattaki açıklık çizilmez', () => {
    const openings: Opening[] = [
      { id: 30, wallId: 999, offsetCm: 200, widthCm: 90, type: 'window' },
    ]
    const { markup } = build({ openings })

    expect(markup).not.toContain('fill="#ffffff"')
  })

  it('boş kat geçerli SVG üretir: sayfa antetiyle basılabilsin', () => {
    const { markup, bounds } = buildPlanSvg({
      ...EMPTY,
      points: [],
      walls: [],
      floorId: FLOOR,
    })

    expect(bounds).toBeUndefined()
    // Sıfır boyutlu viewBox geçersizdir; 1x1 kutu yazılır.
    expect(markup).toContain('viewBox="0 0 1 1"')
    expect(markup).toContain('</svg>')
  })

  it('tipi seçilmemiş mahal "Tanımsız" yazar', () => {
    // Varsayılan artık "Oda" DEĞİL: serbest metin ad kalkınca varsayılan da
    // değişti ve referans uygulamadaki yazıya oturdu (K117).
    const rooms: Room[] = [{ id: 20, wallIds: [10, 11, 12, 13] }]
    const { markup } = build({ rooms })

    expect(markup).toContain('>Tanımsız<')
  })

  it('SERBEST METİNDEKİ XML karakterleri kaçırılır', () => {
    // Oda adı artık serbest metin değil; kaçırma yalnız kullanıcının yazdığı
    // metinlerde anlamlı.
    const { markup } = build({
      texts: [
        { id: 51, floorId: FLOOR, x: 100, y: 100, text: 'Depo & <Arşiv>', heightCm: 20, angleDeg: 0 },
      ],
    })

    expect(markup).toContain('Depo &amp; &lt;Arşiv&gt;')
    expect(markup).not.toContain('<Arşiv>')
  })

  it('Türkçe karakterler olduğu gibi korunur', () => {
    const rooms: Room[] = [{ id: 20, wallIds: [10, 11, 12, 13], usageType: 'stairwell' }]
    const { markup } = build({ rooms })

    expect(markup).toContain('Merdiven Boşluğu')
  })

})
