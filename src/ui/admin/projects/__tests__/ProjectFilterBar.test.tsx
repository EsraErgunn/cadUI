import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { Lookup } from '../../../../api/projects'
import { ProjectFilterBar } from '../ProjectFilterBar'
import type { ProjectFilters } from '../useProjectListParams'

const DISTRICTS: Lookup[] = [
  { id: 1, name: 'Çankaya' },
  { id: 2, name: 'Keçiören' },
]
const PROJECT_FIRMS: Lookup[] = [{ id: 11, name: 'Anadolu Mühendislik Ltd. Şti.' }]

const APPLIED_FILTERS: ProjectFilters = {
  dateFrom: '2026-06-01',
  dateTo: '2026-07-01',
  districtId: null,
  projectFirmId: null,
  search: '',
}

function renderBar(onApply: (filters: ProjectFilters) => void) {
  render(
    <ProjectFilterBar
      filters={APPLIED_FILTERS}
      districts={DISTRICTS}
      projectFirms={PROJECT_FIRMS}
      onApply={onApply}
    />,
  )
}

describe('ProjectFilterBar', () => {
  it('yazarken istek atmaz, yalnız Filtrele ile uygular', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    renderBar(onApply)

    await user.type(screen.getByPlaceholderText('Proje Ara...'), 'yıldız')
    await user.selectOptions(screen.getByLabelText('İlçe'), '2')
    expect(onApply).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Filtrele' }))

    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply).toHaveBeenCalledWith({
      dateFrom: '2026-06-01',
      dateTo: '2026-07-01',
      districtId: 2,
      projectFirmId: null,
      search: 'yıldız',
    })
  })

  it('arama alanında Enter da uygular', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    renderBar(onApply)

    await user.type(screen.getByPlaceholderText('Proje Ara...'), 'gül{Enter}')

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ search: 'gül' }))
  })

  it('tarih alanları birbirini sınırlar', async () => {
    const user = userEvent.setup()
    renderBar(vi.fn())

    const startInput = screen.getByLabelText('Başlangıç tarihi')
    expect(startInput).toHaveAttribute('max', '2026-07-01')

    await user.clear(startInput)
    await user.type(startInput, '2026-06-15')

    expect(screen.getByLabelText('Bitiş tarihi')).toHaveAttribute('min', '2026-06-15')
  })
})
