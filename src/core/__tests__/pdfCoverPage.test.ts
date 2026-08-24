import { describe, expect, it } from 'vitest'

import { layoutCoverPage, type CoverPageInfo } from '../pdf/coverPage'
import { getDrawableArea, getPageSizePt } from '../pdf/paper'

const PAGE = getPageSizePt('A4', 'portrait')
const AREA = getDrawableArea(PAGE)

const EMPTY_INFO: CoverPageInfo = {
  appName: 'STARCAD',
  projectName: '',
  projectNumber: '',
  scale: '1:50',
  printedAt: new Date(2026, 7, 22),
  installation: {
    meterCount: '',
    deviceCount: '',
    totalFlowCubicMeterPerHour: '',
    usagePressure: '',
  },
  building: {
    city: '',
    district: '',
    address: '',
    blockLotParcel: '',
    projectType: '',
    heatingType: '',
    floorCount: '',
    residenceCount: '',
    shopCount: '',
    totalAreaSquareMeters: '',
  },
  designer: { name: '' },
  firm: { title: '', address: '', phone: '', taxNumber: '' },
  approval: { gasFirmName: '', approverName: '', gasFirmContactPerson: '' },
}

function makeInfo(overrides: Partial<CoverPageInfo> = {}): CoverPageInfo {
  return {
    ...EMPTY_INFO,
    projectName: 'Adalar İlave Projesi',
    projectNumber: '2005951489',
    installation: {
      meterCount: '2',
      deviceCount: '4',
      totalFlowCubicMeterPerHour: '7',
      usagePressure: '21 mbar',
    },
    building: {
      ...EMPTY_INFO.building,
      city: 'İstanbul',
      district: 'Adalar',
      address: 'Adalar Mah. Atatürk Sok. No:1',
      blockLotParcel: '100/1',
      projectType: 'İLAVE',
      heatingType: 'Bireysel',
      floorCount: '7',
      residenceCount: '0',
      shopCount: '0',
      totalAreaSquareMeters: '2016',
    },
    designer: { name: 'Fatma Çelik' },
    firm: {
      title: 'Kütahya Test Firması',
      address: 'Altunizade Mahir İz',
      phone: '2164021000',
      taxNumber: '2222222222',
    },
    approval: {
      gasFirmName: 'TOROSGAZ-KÜTAHYA',
      approverName: 'Kontrol Mühendisi',
      gasFirmContactPerson: 'Dağıtım Yetkilisi',
    },
    ...overrides,
  }
}

const textsOf = (info: CoverPageInfo) => layoutCoverPage(PAGE, info).texts.map((text) => text.text)

describe('layoutCoverPage', () => {
  it('proje detayından gelen künyeyi ve çizimden gelen tesisat özetini basar', () => {
    const texts = textsOf(makeInfo())

    for (const expected of [
      // Proje detayı referansı.
      'Adalar İlave Projesi',
      '2005951489',
      'İstanbul',
      'Adalar',
      '100/1',
      'İLAVE',
      'Bireysel',
      '2016',
      'Fatma Çelik',
      'Kütahya Test Firması',
      '2164021000',
      '2222222222',
      // Çizim referansı.
      '2',
      '4',
      '21 mbar',
      // Dışa aktarma ayarı ve baskı tarihi.
      '1:50',
      '22.08.2026',
    ]) {
      expect(texts).toContain(expected)
    }
  })

  it('kaşe kutusunun sağ altına imzalayanın adını ve firmasının ünvanını yazar', () => {
    const { texts } = layoutCoverPage(PAGE, makeInfo())
    const stamped = texts.filter((text) => text.align === 'right').map((text) => text.text)

    // Solda çizen kişi + firması, sağda dağıtım şirketi + onay mühendisi.
    expect(stamped).toEqual([
      'Kütahya Test Firması',
      'Fatma Çelik',
      'Kontrol Mühendisi',
      'TOROSGAZ-KÜTAHYA',
    ])
  })

  it('ONAYLANMAMIŞ projede kaşeye dağıtım şirketinin YETKİLİSİ yazılır', () => {
    // Kutu bir imza yeri: kimin imzalayacağını her hâlükârda göstermeli
    // (kullanıcı isteği, K159). "ONAYLAYAN" satırı ise boş kalır — olmayan bir
    // onayı ima etmemek için.
    const { texts } = layoutCoverPage(
      PAGE,
      makeInfo({
        approval: {
          gasFirmName: 'TOROSGAZ-KÜTAHYA',
          approverName: '',
          gasFirmContactPerson: 'Dağıtım Yetkilisi',
        },
      }),
    )
    const stamped = texts.filter((text) => text.align === 'right').map((text) => text.text)

    expect(stamped).toEqual([
      'Kütahya Test Firması',
      'Fatma Çelik',
      'Dağıtım Yetkilisi',
      'TOROSGAZ-KÜTAHYA',
    ])
  })

  it('kaşe künyesi eksikse o satırı hiç yazmaz, boşluk bırakmaz', () => {
    const { texts } = layoutCoverPage(
      PAGE,
      makeInfo({
        approval: { gasFirmName: 'TOROSGAZ-KÜTAHYA', approverName: '', gasFirmContactPerson: '' },
      }),
    )
    const stamped = texts.filter((text) => text.align === 'right').map((text) => text.text)

    expect(stamped).toEqual(['Kütahya Test Firması', 'Fatma Çelik', 'TOROSGAZ-KÜTAHYA'])
  })

  it('tesisat özetini BAŞLIKSIZ basar; bölüm başlıkları BİNANIN + tasarımcı/firma', () => {
    const texts = textsOf(makeInfo())

    expect(texts).toContain('SAYAÇ ADEDİ')
    expect(texts).toContain('TOPLAM DEBİ (m³/h)')
    // Çizimden gelen satırın kendi başlığı yok: kaşe kutularının hemen altında.
    expect(texts).not.toContain('TESİSATIN')
    expect(texts.filter((text) => text === 'BİNANIN')).toHaveLength(1)
    expect(texts).toContain('PROJE TASARIMCISININ')
    expect(texts).toContain('FİRMANIN')
  })

  it('onay başlıklarının altına çizgi çeker; künye hücrelerine çekmez', () => {
    const { lines } = layoutCoverPage(PAGE, makeInfo())

    expect(lines).toHaveLength(2)
  })

  it('bölüm başlıklarını künye etiketlerinden BÜYÜK punto ile yazar', () => {
    const { texts } = layoutCoverPage(PAGE, makeInfo())
    const find = (value: string) => texts.find((text) => text.text === value)

    for (const title of ['BİNANIN', 'PROJE TASARIMCISININ', 'FİRMANIN']) {
      expect(find(title)?.align).toBe('center')
      expect(find(title)!.sizePt).toBeGreaterThan(find('İLİ')!.sizePt)
    }
  })

  it('değeri olmayan alanın KUTUSUNU çizer ama değerini yazmaz', () => {
    const full = layoutCoverPage(PAGE, makeInfo())
    const empty = layoutCoverPage(PAGE, EMPTY_INFO)

    // Kutu sayısı DEĞİŞMEZ, yalnız değerler düşer.
    expect(empty.rects).toHaveLength(full.rects.length)
    expect(empty.texts.length).toBeLessThan(full.texts.length)
    expect(empty.texts.map((text) => text.text)).toContain('PROJE TASARIMCISI')
    expect(empty.texts.map((text) => text.text)).not.toContain('Fatma Çelik')
  })

  it('sayfa kenarına DIŞ ÇERÇEVE çizmez', () => {
    const { rects } = layoutCoverPage(PAGE, makeInfo())

    // Dış çerçeve olsaydı bloklar arasındaki beyaz boşluklar onun içinde kalan
    // gri şeritlere dönerdi; üç blok tek tablo gibi görünürdü.
    const isFullArea = (rect: (typeof rects)[number]) =>
      Math.abs(rect.heightPt - AREA.heightPt) < 0.01 &&
      Math.abs(rect.widthPt - AREA.widthPt) < 0.01
    expect(rects.some(isFullArea)).toBe(false)
  })

  it('üç bloğu ince beyaz şeritle ayırır', () => {
    const { rects } = layoutCoverPage(PAGE, makeInfo())

    // Kutuların kapladığı dikey aralıkları birleştirip aradaki boşlukları say.
    const spans = [...rects]
      .map((rect) => ({ bottom: rect.yPt, top: rect.yPt + rect.heightPt }))
      .sort((a, b) => b.top - a.top)

    let gapCount = 0
    let lowestPt = spans[0].top
    for (const span of spans) {
      if (span.top < lowestPt - 0.01) gapCount += 1
      lowestPt = Math.min(lowestPt, span.bottom)
    }

    expect(gapCount).toBe(2)
  })

  it('bütün kutuları çizim alanının içinde tutar', () => {
    const { rects, logo } = layoutCoverPage(PAGE, makeInfo())

    for (const rect of [...rects, logo]) {
      expect(rect.xPt).toBeGreaterThanOrEqual(AREA.xPt - 0.01)
      expect(rect.yPt).toBeGreaterThanOrEqual(AREA.yPt - 0.01)
      expect(rect.xPt + rect.widthPt).toBeLessThanOrEqual(AREA.xPt + AREA.widthPt + 0.01)
      expect(rect.yPt + rect.heightPt).toBeLessThanOrEqual(AREA.yPt + AREA.heightPt + 0.01)
    }
  })

  it.each([
    ['A4', 'portrait'],
    ['A4', 'landscape'],
    ['A3', 'portrait'],
    ['A3', 'landscape'],
  ] as const)('%s %s: bantlar sayfayı tam doldurur', (paper, orientation) => {
    const pageSize = getPageSizePt(paper, orientation)
    const area = getDrawableArea(pageSize)
    const { rects } = layoutCoverPage(pageSize, makeInfo())

    expect(Math.min(...rects.map((rect) => rect.yPt))).toBeCloseTo(area.yPt)
  })

  it('büyük kâğıtta hücreleri şişirmez, artan yeri KAŞE bandına verir', () => {
    const small = layoutCoverPage(getPageSizePt('A4', 'portrait'), makeInfo())
    const large = layoutCoverPage(getPageSizePt('A3', 'portrait'), makeInfo())
    const footerHeight = (layout: typeof small) => layout.rects[layout.rects.length - 1].heightPt

    expect(footerHeight(large)).toBeCloseTo(footerHeight(small))
  })

  it('logoyu üst banda ve sayfa ortasına oturtur', () => {
    const { logo } = layoutCoverPage(PAGE, makeInfo())

    expect(logo.xPt + logo.widthPt / 2).toBeCloseTo(AREA.xPt + AREA.widthPt / 2)
    expect(logo.yPt).toBeGreaterThan(AREA.yPt + AREA.heightPt * 0.8)
  })
})
