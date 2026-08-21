import { screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildPage,
  buildRow,
  renderWithProviders,
} from './projectFirmUserFixture'
import { ProjectFirmUsersPage } from '../ProjectFirmUsersPage'

const listApi = vi.hoisted(() => ({ getProjectFirmUserList: vi.fn() }))
const useIsAdmin = vi.hoisted(() => vi.fn())

vi.mock('../../api/projectFirmUsers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/projectFirmUsers')>()),
  ...listApi,
}))

vi.mock('../../ui/admin/useIsAdmin', () => ({ useIsAdmin }))

function renderPage({ rows = [buildRow()], total = 1, isAdmin = true, route = undefined } = {}) {
  listApi.getProjectFirmUserList.mockResolvedValue(buildPage(rows, { totalCount: total }))
  useIsAdmin.mockReturnValue(isAdmin)

  return renderWithProviders({ route, children: <ProjectFirmUsersPage /> })
}

afterEach(() => {
  vi.clearAllMocks()
})

// KK-1: kırılım, başlık + parantez içinde adet, altında açıklama.
describe('ekran açılışı (KK-1)', () => {
  it('başlık, kırılım, adet ve açıklamayı gösterir', async () => {
    renderPage({ total: 25566 })

    // Adet yanıt gelince dolar; o ana kadar başlıkta "…" durur. Binlik ayraç
    // tr-TR biçiminde (adminFormat).
    const heading = await screen.findByRole('heading', { name: /Proje Firması Kullanıcıları/ })
    await waitFor(() => expect(heading).toHaveTextContent('(25.566)'))
    expect(screen.getByLabelText('Konum')).toHaveTextContent('Anasayfa')
    expect(screen.getByLabelText('Konum')).toHaveTextContent('Firmalar')
  })

  // KK-2: yetki "Tümü", "Aktif" işaretsiz, sağ üstteki sıra korunuyor.
  it('filtre alanları varsayılan hâlleriyle açılır', async () => {
    renderPage()

    expect(await screen.findByLabelText('Yetki')).toHaveValue('')
    expect(screen.getByLabelText('Aktif')).not.toBeChecked()
    expect(screen.getByLabelText(/Kullanıcı adı, ad soyad veya e-postada ara/)).toHaveValue('')
    // "Filtrele" düğmesi KALKTI: kriter seçilir seçilmez uygulanıyor.
    expect(screen.queryByRole('button', { name: 'Filtrele' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Yeni Kullanıcı/ })).toHaveAttribute(
      'href',
      '/admin/project-firm-users/new',
    )
  })
})

// KK-8: sütun sırası ve renkli kullanıcı tipi etiketi.
describe('liste sütunları (KK-8)', () => {
  it('sütunları belgedeki sırayla listeler', async () => {
    renderPage()
    const table = await screen.findByRole('table')

    const headers = within(table)
      .getAllByRole('columnheader')
      .map((header) => header.textContent)

    expect(headers).toEqual([
      'Kullanıcı Adı',
      'Adı Soyadı',
      'E-mail',
      'Telefon',
      'Kullanıcı Tipi',
      'G.D. Firması',
      'Proje Firması',
      'Gdf Kayıt No',
    ])
  })

  it('kullanıcı tipini etiketle gösterir', async () => {
    renderPage({
      rows: [
        buildRow({ authorityType: 'firmEngineer' }),
        buildRow({ competencyId: 5002, authorityType: 'firmAuthorizedPerson' }),
      ],
      total: 2,
    })

    expect(await screen.findByText('Firma Mühendisi')).toBeInTheDocument()
    expect(screen.getByText('Firma Yetkilisi')).toBeInTheDocument()
  })
})

// KK-9: telefon biçimi ve boş Gdf kayıt no.
describe('telefon ve boş değer gösterimi (KK-9)', () => {
  it('farklı biçimdeki numaraları maskeye indirir', async () => {
    renderPage({
      rows: [
        buildRow({ phone: '5555555555' }),
        buildRow({ competencyId: 5002, phone: '+90 532 118 08 80' }),
        buildRow({ competencyId: 5003, phone: '02164021000' }),
      ],
      total: 3,
    })

    expect(await screen.findByText('0555 555 55 55')).toBeInTheDocument()
    expect(screen.getByText('0532 118 08 80')).toBeInTheDocument()
    expect(screen.getByText('0216 402 10 00')).toBeInTheDocument()
  })

  // Uydurma biçim dayatmak yerine ham metin kalır.
  it('maskeye uymayan numarayı olduğu gibi gösterir', async () => {
    renderPage({ rows: [buildRow({ phone: '1180' })] })

    expect(await screen.findByText('1180')).toBeInTheDocument()
  })

  it('Gdf kayıt no boşsa tire gösterir', async () => {
    renderPage({
      rows: [
        buildRow({ gdfRegistrationNumber: null }),
        buildRow({ competencyId: 5002, gdfRegistrationNumber: '512' }),
      ],
      total: 2,
    })

    expect(await screen.findByText('—')).toBeInTheDocument()
    expect(screen.getByText('512')).toBeInTheDocument()
  })
})

// KK-10: kullanıcı adı/ad soyad güncelleme ekranına, firmalar firma detayına gider.
describe('tıklanabilir sütunlar (KK-10)', () => {
  it('kullanıcı ve firma bağlantıları doğru hedefe gider', async () => {
    renderPage()
    const table = await screen.findByRole('table')

    expect(within(table).getByRole('link', { name: 'tolga.ertek' })).toHaveAttribute(
      'href',
      '/admin/project-firm-users/1001',
    )
    expect(within(table).getByRole('link', { name: 'Tolga Ertek' })).toHaveAttribute(
      'href',
      '/admin/project-firm-users/1001',
    )
    expect(within(table).getByRole('link', { name: 'AKSA-GEMLİK' })).toHaveAttribute(
      'href',
      '/admin/gas-distribution-firms/103',
    )
    expect(within(table).getByRole('link', { name: 'AA Mühendislik' })).toHaveAttribute(
      'href',
      '/admin/project-firms/201',
    )
  })
})

// KK-11: aynı kullanıcının her yetkisi ayrı satır, bilgileri yineleniyor.
describe('çoklu yetkili kullanıcı (KK-11)', () => {
  it('aynı kullanıcı için iki satır çizer', async () => {
    renderPage({
      rows: [
        buildRow({ competencyId: 5001, projectFirm: { id: 201, name: 'AA Mühendislik' } }),
        buildRow({ competencyId: 5002, projectFirm: { id: 202, name: 'Aksa Test Firması' } }),
      ],
      total: 2,
    })

    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(within(table).getAllByRole('link', { name: 'tolga.ertek' })).toHaveLength(2)
  })
})

// KK-7: sonuç yoksa tablo yerine açıklama, sayfalama gizli.
describe('sonuç bulunmaması (KK-7)', () => {
  it('tabloyu gizler, açıklamayı gösterir ve sayfalamayı çizmez', async () => {
    renderPage({ rows: [], total: 0 })

    expect(
      await screen.findByText('Arama kriterlerine uygun kayıt bulunamadı.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Sayfalama' })).not.toBeInTheDocument()
  })
})
