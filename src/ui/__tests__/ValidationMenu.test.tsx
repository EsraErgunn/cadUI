import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  FLOOR_ID,
  GROUND_FLOOR,
  makeDoor,
  makeSource,
  makeValidProject,
  WALL_IDS,
} from '../../core/__tests__/validationFixture'
import type { ValidationSource } from '../../core/validate'
import { useArchitectureUiStore } from '../../store/architectureUiStore'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { ValidationMenu } from '../validation/ValidationMenu'

const UPPER_FLOOR = { id: 2, name: '1. Kat', heightCm: 300, isBasement: false }

function seed(source: ValidationSource) {
  useCadStore.setState({ ...source, activeFloorId: FLOOR_ID })
}

async function openMenu() {
  const user = userEvent.setup()
  render(<ValidationMenu />)
  await user.click(screen.getByRole('button', { name: /Hata Kontrolleri/ }))
  return user
}

beforeEach(() => {
  useUiStore.setState({ pendingFocusBounds: null, activeViewId: 'architecture' })
  useArchitectureUiStore.getState().clearSelection()
})

describe('ValidationMenu', () => {
  it('açılana kadar denetim çalışmaz, düğme sayı göstermez', () => {
    seed(makeSource())
    render(<ValidationMenu />)

    expect(screen.getByRole('button', { name: /Hata Kontrolleri/ })).toHaveTextContent(
      /^Hata Kontrolleri$/,
    )
  })

  it('açılınca hataları listeler ve sayısını yazar', async () => {
    seed(makeSource())
    await openMenu()

    const panel = screen.getByLabelText('Hata kontrolleri')
    expect(within(panel).getByText('Tesisat kat planı çizilmelidir.')).toBeInTheDocument()
    expect(within(panel).getByText(/hata giderilmeli/)).toBeInTheDocument()
  })

  it('hatasız projede yeşil kutu gösterir', async () => {
    seed(makeValidProject())
    await openMenu()

    expect(screen.getByText('Hata bulunamadı')).toBeInTheDocument()
    expect(screen.getByText('Proje gönderilmeye hazır.')).toBeInTheDocument()
  })

  it('kat süzgeci satırları o kata daraltır', async () => {
    seed(makeValidProject({ floors: [GROUND_FLOOR, UPPER_FLOOR] }))
    const user = await openMenu()

    // Üst kat bomboş: iki kat planı hatası da ona ait.
    expect(screen.getByText(/2 hata giderilmeli/)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Kata göre süz'), String(FLOOR_ID))
    expect(screen.getByText('Hata bulunamadı')).toBeInTheDocument()
  })

  it('çizim değişince liste açıkken kendiliğinden tazelenir', async () => {
    seed(makeValidProject())
    await openMenu()
    expect(screen.getByText('Hata bulunamadı')).toBeInTheDocument()

    useCadStore.setState((state) => ({
      openings: [makeDoor(30, WALL_IDS.leftLower)],
      revision: state.revision + 1,
    }))

    expect(await screen.findByText('Tüm mahallere kapı açılmalıdır.')).toBeInTheDocument()
  })

  it('göster: kata geçer, nesneyi seçer ve kamera isteği bırakır', async () => {
    seed(
      makeValidProject({
        floors: [GROUND_FLOOR, UPPER_FLOOR],
        openings: [makeDoor(30, WALL_IDS.leftLower)],
      }),
    )
    useCadStore.setState({ activeFloorId: UPPER_FLOOR.id })
    const user = await openMenu()

    const row = screen.getByText('Tüm mahallere kapı açılmalıdır.').closest('li') as HTMLElement
    await user.click(within(row).getByRole('button', { name: /göster/ }))

    expect(useCadStore.getState().activeFloorId).toBe(FLOOR_ID)
    expect(useUiStore.getState().activeViewId).toBe('architecture')
    expect(useArchitectureUiStore.getState().selection.length).toBeGreaterThan(0)
    expect(useUiStore.getState().pendingFocusBounds).not.toBeNull()
  })
})
