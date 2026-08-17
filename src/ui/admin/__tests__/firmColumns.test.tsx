import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import type { GasDistributionFirm } from '../../../api/adminFirms'
import { gasFirmUpdatePath } from '../adminNavItems'
import { buildFirmColumns } from '../firms/firmColumns'

const FIRM: GasDistributionFirm = {
  id: 42,
  dfirmNo: 1204,
  groupName: 'Aksa Enerji Grubu',
  name: 'ADANA DOĞALGAZ',
  groupId: 1,
}

/** Hücreler satır indeksini kullanmıyor; tek satır render edildiği için 0. */
const FIRST_ROW_INDEX = 0

function buildColumns({ canManage = true } = {}) {
  return buildFirmColumns({ pendingFirmId: null, canManage, onDeactivate: () => {} })
}

function renderCell(key: string, firm: GasDistributionFirm) {
  const column = buildColumns().find((candidate) => candidate.key === key)
  if (column === undefined) throw new Error(`Sütun yok: ${key}`)

  return render(<MemoryRouter>{column.cell(firm, FIRST_ROW_INDEX)}</MemoryRouter>)
}

/**
 * KK-11'in ilk yarısı: "kullanıcı listede bir firma adına tıkladığında" aynı
 * form güncelleme modunda açılır. Bağlantının hedefi burada sabitleniyor;
 * formun dolu gelmesi GasDistributionFirmFormPage testinde.
 */
describe('firma listesi bağlantıları', () => {
  it('firma adı güncelleme rotasına gider', () => {
    renderCell('name', FIRM)

    expect(screen.getByRole('link', { name: FIRM.name })).toHaveAttribute(
      'href',
      gasFirmUpdatePath(FIRM.id),
    )
  })

  it('grup adı da aynı kaydın güncelleme rotasına gider', () => {
    renderCell('groupName', FIRM)

    expect(screen.getByRole('link', { name: 'Aksa Enerji Grubu' })).toHaveAttribute(
      'href',
      gasFirmUpdatePath(FIRM.id),
    )
  })

  // Belge: grup firması tanımlı olmayan kayıtta hücre boş bırakılmaz.
  it('grubu olmayan kayıtta bağlantı değil "-" gösterilir', () => {
    renderCell('groupName', { ...FIRM, groupName: null })

    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.getByText('-')).toBeInTheDocument()
  })
})

/** Yetki denetimi SUNUCUDA; istemci yalnız sütunun çizilip çizilmeyeceğine karar verir. */
describe('İşlemler sütunu', () => {
  it('yönetici için eklenir', () => {
    expect(buildColumns().map((column) => column.key)).toContain('actions')
  })

  it('yetkisiz kullanıcıda hiç çizilmez', () => {
    expect(buildColumns({ canManage: false }).map((column) => column.key)).not.toContain(
      'actions',
    )
  })
})
