import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  asMock,
  asUnavailable,
  buildDetail,
  buildExtras,
  buildHistory,
  buildSpecs,
  buildUnits,
  renderDetail,
} from './projectDetailFixture'
import { setAuthSession } from '../../api/authToken'

const detailApi = vi.hoisted(() => ({
  getProjectDetail: vi.fn(),
  getProjectUnits: vi.fn(),
  getProjectHistory: vi.fn(),
  getProjectDocuments: vi.fn(),
  getProjectPolicies: vi.fn(),
  getProjectFirmInfo: vi.fn(),
  requestProjectFile: vi.fn(),
}))

/** `GET /api/projectfirms/{id}` karşılığı; kartın DOLU alanları buradan. */
const FIRM_INFO = {
  engineerName: null,
  engineerRegistrationNo: null,
  title: 'ADANA MÜHENDİSLİK LTD. ŞTİ.',
  address: 'Ziyapaşa Mah. 1. Sk. No:5 Seyhan/Adana',
  phone: '03221234567',
  competencyNo: null,
  taxOffice: null,
  taxNumber: '2222222222',
}
const canApprove = vi.hoisted(() => vi.fn())

vi.mock('../../api/projectDetail', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectDetail')>()),
  ...detailApi,
}))

vi.mock('../../ui/admin/useCanApproveProject', () => ({ useCanApproveProject: canApprove }))

beforeEach(() => {
  detailApi.getProjectDetail.mockResolvedValue(buildDetail())
  detailApi.getProjectUnits.mockResolvedValue(asMock(buildUnits()))
  detailApi.getProjectHistory.mockResolvedValue(asMock(buildHistory()))
  detailApi.getProjectDocuments.mockResolvedValue(asMock([]))
  detailApi.getProjectPolicies.mockResolvedValue(asMock([]))
  detailApi.getProjectFirmInfo.mockResolvedValue(FIRM_INFO)
  detailApi.requestProjectFile.mockResolvedValue({ ok: false, reason: 'unimplemented' })
  canApprove.mockReturnValue(true)
})

afterEach(() => {
  setAuthSession(undefined)
  localStorage.clear()
  vi.clearAllMocks()
})

// KK-4: dört kart alanlarıyla, onay kartı amber sol kenarlıkla, .zpd tıklanabilir.
describe('Proje Bilgileri kartları (KK-4)', () => {
  it('dört kart da alanlarıyla görünür', async () => {
    renderDetail()

    const general = await screen.findByRole('region', { name: 'Proje Genel Bilgileri' })
    expect(within(general).getByText('Zetacad Proje Dosyası')).toBeInTheDocument()
    expect(within(general).getByText('İLAVE')).toBeInTheDocument()
    expect(within(general).getByText('Kütahya / Merkez')).toBeInTheDocument()

    // Firma künyesi GERÇEK uçtan (`GET /api/projectfirms/{id}`); kart bir süre
    // tümüyle boştu. Dolan dört alandan üçü burada.
    const firm = await screen.findByRole('region', { name: 'Proje Firma Bilgileri' })
    expect(within(firm).getByText(FIRM_INFO.title)).toBeInTheDocument()
    expect(within(firm).getByText(FIRM_INFO.address)).toBeInTheDocument()
    expect(within(firm).getByText(FIRM_INFO.taxNumber)).toBeInTheDocument()

    expect(screen.getByRole('region', { name: 'Proje Onay Bilgileri' })).toBeInTheDocument()

    const specs = screen.getByRole('region', { name: 'Detay Bilgileri' })
    expect(within(specs).getByText('1+1+5')).toBeInTheDocument()
    expect(within(specs).getByText('G4')).toBeInTheDocument()
  })

  it('onay kartı amber sol kenarlıkla ayrılır', async () => {
    renderDetail()

    const approval = await screen.findByRole('region', { name: 'Proje Onay Bilgileri' })
    expect(approval).toHaveClass('border-l-4', 'border-l-warning')
  })

  it('Zetacad Proje Dosyası tıklanabilir ve dosyayı ister', async () => {
    const user = userEvent.setup()
    renderDetail()

    const zpdButton = await screen.findByRole('button', { name: '30006185.zpd' })
    await user.click(zpdButton)

    expect(detailApi.requestProjectFile).toHaveBeenCalledWith('zpd')
    // Uç yok: eksiklik SÖYLENİYOR, sahte dosya indirilmiyor.
    expect(await screen.findByRole('alert')).toHaveTextContent(/\.zpd.*uç sunucuda henüz yok/)
  })
})

// KK-5: boş değer "—", birimler, salt okunurluk.
describe('boş değer, birim ve salt okunurluk (KK-5)', () => {
  it('onaylanmamış projede onay alanlarının tamamı boş görünür', async () => {
    renderDetail()

    const approval = await screen.findByRole('region', { name: 'Proje Onay Bilgileri' })
    // Dört alanın dördü de değer yerine okunabilir "Değer yok" taşır.
    expect(within(approval).getAllByText('Değer yok')).toHaveLength(4)
  })

  /**
   * Onay künyesi İŞLEM GEÇMİŞİNDEN türetiliyor: sunucuda ayrı bir "onay
   * bilgileri" alanı yok, onay geçmişe düşen bir satır.
   */
  it('onaylanmış projede onay alanları geçmişten dolar', async () => {
    detailApi.getProjectHistory.mockResolvedValue(
      asMock([
        {
          id: 'onay-1',
          fileType: null,
          createdAt: '2026-07-14T09:12:00.000Z',
          userName: 'KONTROL MÜHENDİSİ',
          roleSnapshot: 'Gaz Dağıtım',
          operation: 'projeOnay',
          operationName: 'Proje Onay',
          description: 'Proje uygundur.',
        },
      ]),
    )

    renderDetail()

    const approval = await screen.findByRole('region', { name: 'Proje Onay Bilgileri' })
    expect(within(approval).getByText('KONTROL MÜHENDİSİ')).toBeInTheDocument()
    expect(within(approval).getByText('Proje uygundur.')).toBeInTheDocument()
    // Onay KODU sunucuda saklanmıyor; uydurulmuyor, boş kalıyor.
    expect(within(approval).getAllByText('Değer yok')).toHaveLength(1)
  })

  it('basınç mbar, alan m² birimiyle gösterilir', async () => {
    renderDetail()

    const specs = await screen.findByRole('region', { name: 'Detay Bilgileri' })
    expect(within(specs).getAllByText('21 mbar')).toHaveLength(2)
    expect(within(specs).getByText('2.015 m²')).toBeInTheDocument()
  })

  it('değeri olmayan alan boş bırakılmaz, soluk tire gösterir', async () => {
    renderDetail()

    const specs = await screen.findByRole('region', { name: 'Detay Bilgileri' })
    // Tadilat Açıklama / Sipariş Numarası / Bağlantı Nesnesi boş.
    expect(within(specs).getAllByText('Değer yok').length).toBeGreaterThanOrEqual(3)
    expect(within(specs).getAllByText('—')[0]).toHaveClass('text-ink-disabled')
  })

  it('hiçbir proje alanı düzenlenebilir değildir', async () => {
    renderDetail()

    await screen.findByRole('region', { name: 'Proje Genel Bilgileri' })

    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
    expect(screen.queryAllByRole('spinbutton')).toHaveLength(0)
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })
})

/**
 * "Bu ekrandaki bazı veriler sunucudan gelmiyor" uyarısı KALKTI: kartların
 * dördü de gerçek uçlardan besleniyor. Kaynağı olmayan ALAN uydurulmuyor, boş
 * değer işaretiyle çiziliyor; kaynağı olmayan BÖLÜM ise eksiklik kutusu
 * gösteriyor.
 */
describe('veri kaynağı', () => {
  it('artık örnek veri uyarısı çizilmez', async () => {
    renderDetail()

    await screen.findByRole('region', { name: 'Proje Genel Bilgileri' })
    expect(
      screen.queryByText(/Bu ekrandaki bazı veriler sunucudan gelmiyor/),
    ).not.toBeInTheDocument()
  })

  it('kaynağı olmayan bölümde eksiklik kutusu çıkar', async () => {
    detailApi.getProjectDetail.mockResolvedValue(buildDetail({ extras: null }))
    detailApi.getProjectUnits.mockResolvedValue(asUnavailable())

    renderDetail()

    expect(await screen.findByText('Bu bölümün veri kaynağı henüz yok.')).toBeInTheDocument()
    expect(screen.queryByText(/Bu ekrandaki bazı veriler sunucudan gelmiyor/)).not.toBeInTheDocument()
  })
})

// KK-6: 14 sütun, sayısal sütunlar sağa hizalı, çok cihazlı birimde alt satır boş.
describe('birim ve cihaz tablosu (KK-6)', () => {
  it('on dört sütun belgedeki sırayla görünür', async () => {
    renderDetail()

    const table = await screen.findByRole('table', { name: /Birim ve cihaz bilgileri/ })
    const headers = within(table)
      .getAllByRole('columnheader')
      .map((cell) => cell.textContent)

    expect(headers).toEqual([
      'Birim',
      'Abone Adı',
      'Abone No',
      'Sayaç',
      'm³/h',
      'mbar',
      'm²',
      'Boru Tipi',
      'Cihaz',
      'Kapasite',
      'Debi',
      'Marka',
      'Model',
      'Baca',
    ])
  })

  it('çok cihazlı birimde her cihaz ayrı satırda, birim bilgisi yalnız ilkinde', async () => {
    renderDetail()

    const table = await screen.findByRole('table', { name: /Birim ve cihaz bilgileri/ })
    const rows = within(table).getAllByRole('row').slice(1)

    expect(rows).toHaveLength(2)

    const firstCells = within(rows[0]).getAllByRole('cell')
    expect(firstCells[0]).toHaveTextContent('D20')
    expect(firstCells[1]).toHaveTextContent('FATMA ÇELİK')
    expect(firstCells[8]).toHaveTextContent('Ocak')

    const secondCells = within(rows[1]).getAllByRole('cell')
    // Birim sütunları BOŞ — tire bile yok.
    expect(secondCells[0]).toHaveTextContent('')
    expect(secondCells[1]).toHaveTextContent('')
    expect(secondCells[3]).toHaveTextContent('')
    expect(secondCells[8]).toHaveTextContent('Kombi')
    expect(secondCells[13]).toHaveTextContent('HERMETİK')
  })

  it('sayısal sütunlar sağa hizalıdır', async () => {
    renderDetail()

    const table = await screen.findByRole('table', { name: /Birim ve cihaz bilgileri/ })
    const cells = within(within(table).getAllByRole('row')[1]).getAllByRole('cell')

    // Kapasite artık sayısal DEĞİL: çizimden karışık birimli metin geliyor
    // ("24 kW", "14 L/dk"), sağa hizalamak sayı olmayan değeri sayı gibi
    // gösterirdi.
    for (const index of [4, 5, 6, 10]) {
      expect(cells[index]).toHaveClass('text-right')
    }
    expect(cells[1]).not.toHaveClass('text-right')
  })
})

// Detay Bilgileri kartındaki toplam alan biçimi kartlarla aynı olmalı.
describe('sayı biçimlendirmesi', () => {
  it('binlik ayraç tr-TR biçiminde', async () => {
    detailApi.getProjectDetail.mockResolvedValue(
      buildDetail({ extras: buildExtras({ specs: buildSpecs({ totalAreaSquareMeters: 12345 }) }) }),
    )

    renderDetail()

    const specs = await screen.findByRole('region', { name: 'Detay Bilgileri' })
    expect(within(specs).getByText('12.345 m²')).toBeInTheDocument()
  })
})
