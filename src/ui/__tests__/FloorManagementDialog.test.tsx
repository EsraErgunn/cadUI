import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_FLOOR_ID, DEFAULT_FLOOR_NAME } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { FloorManagementDialog } from '../FloorManagementDialog'

const UPPER_FLOOR_ID = 100

beforeEach(() => {
  useCadStore.setState({
    floors: [
      { id: DEFAULT_FLOOR_ID, name: DEFAULT_FLOOR_NAME },
      { id: UPPER_FLOOR_ID, name: '1. Kat' },
    ],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: [],
    walls: [],
    openings: [],
    installationElements: [],
    revision: 0,
    savedRevision: 0,
  })
})

function renderDialog(onClose = vi.fn()) {
  render(<FloorManagementDialog onClose={onClose} />)
  return { onClose }
}

describe('FloorManagementDialog', () => {
  it('katları EN ÜST kat başta listeler', () => {
    renderDialog()

    const names = screen.getAllByRole('textbox').map((input) => (input as HTMLInputElement).value)
    expect(names).toEqual(['1. Kat', DEFAULT_FLOOR_NAME])
  })

  it('boş kat ekler', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: 'Boş Kat Ekle' }))

    expect(useCadStore.getState().floors.at(-1)?.name).toBe('2. Kat')
  })

  it('kat adını değiştirir', async () => {
    renderDialog()

    const input = screen.getByRole('textbox', { name: '1. Kat adı' })
    await userEvent.clear(input)
    await userEvent.type(input, 'Çatı Katı')
    await userEvent.tab()

    expect(useCadStore.getState().floors.at(-1)?.name).toBe('Çatı Katı')
  })

  it('çakışan adı hata olarak gösterir ve yazmaz', async () => {
    renderDialog()

    const input = screen.getByRole('textbox', { name: '1. Kat adı' })
    await userEvent.clear(input)
    await userEvent.type(input, DEFAULT_FLOOR_NAME)

    expect(screen.getByRole('alert')).toHaveTextContent('başka bir katta kullanılıyor')
    expect(useCadStore.getState().floors.at(-1)?.name).toBe('1. Kat')
  })

  it('silmeden önce onay ister', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: '1. Kat sil' }))

    expect(useCadStore.getState().floors).toHaveLength(2)
    const confirmation = screen.getByRole('alert')
    expect(confirmation).toHaveTextContent('silinecek')

    await userEvent.click(within(confirmation).getByRole('button', { name: 'Sil' }))

    expect(useCadStore.getState().floors.map((floor) => floor.id)).toEqual([DEFAULT_FLOOR_ID])
  })

  it('onaydan vazgeçilince kat silinmez', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: '1. Kat sil' }))
    await userEvent.click(screen.getByRole('button', { name: 'Vazgeç' }))

    expect(useCadStore.getState().floors).toHaveLength(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('tek kat kalınca silme düğmesi pasiftir', () => {
    useCadStore.setState({ floors: [{ id: DEFAULT_FLOOR_ID, name: DEFAULT_FLOOR_NAME }] })
    renderDialog()

    expect(screen.getByRole('button', { name: `${DEFAULT_FLOOR_NAME} sil` })).toBeDisabled()
  })

  it('aktif kata geçiş düğmesi yerine "Aktif" rozeti gösterilir', () => {
    renderDialog()

    // İki kat var, yalnız biri aktif → tek "Geç" düğmesi.
    expect(screen.getAllByRole('button', { name: 'Geç' })).toHaveLength(1)
    expect(screen.getByText('Aktif')).toBeInTheDocument()
  })

  it('katı bir sıra aşağı taşır', async () => {
    renderDialog()

    await userEvent.click(screen.getByRole('button', { name: '1. Kat bir sıra aşağı' }))

    expect(useCadStore.getState().floors.map((floor) => floor.id)).toEqual([
      UPPER_FLOOR_ID,
      DEFAULT_FLOOR_ID,
    ])
  })

  it('Esc diyaloğu kapatır', async () => {
    const { onClose } = renderDialog()

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })
})
