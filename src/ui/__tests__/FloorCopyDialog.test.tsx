import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_FLOOR_ID, DEFAULT_FLOOR_NAME } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { FloorCopyDialog } from '../FloorCopyDialog'

const UPPER_FLOOR_ID = 14

beforeEach(() => {
  useCadStore.setState({
    floors: [
      { id: DEFAULT_FLOOR_ID, name: DEFAULT_FLOOR_NAME },
      { id: UPPER_FLOOR_ID, name: '1. Kat' },
    ],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: [
      { id: 2, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
      { id: 3, floorId: DEFAULT_FLOOR_ID, x: 500, y: 0 },
    ],
    walls: [
      { id: 6, floorId: DEFAULT_FLOOR_ID, p1Id: 2, p2Id: 3, thickness: 20, height: 280 },
    ],
    openings: [],
    rooms: [],
    symbols: [],
    installationElements: [],
    nextUniqueId: 100,
    revision: 0,
    savedRevision: 0,
  })
})

function renderDialog(onClose = vi.fn()) {
  render(<FloorCopyDialog onClose={onClose} />)
  return { onClose }
}

describe('FloorCopyDialog', () => {
  it('hedef listesinde yalnız BOŞ katlar görünür', () => {
    renderDialog()

    const target = screen.getByLabelText('Hedef kat')
    const options = [...target.querySelectorAll('option')].map((option) => option.textContent)
    // Zemin Kat kaynak ve dolu; yalnız 1. Kat seçilebilir.
    expect(options).toEqual(['Seçiniz…', '1. Kat'])
  })

  it('kopyalar, hedef kata geçer ve kapanır', async () => {
    const { onClose } = renderDialog()

    await userEvent.selectOptions(screen.getByLabelText('Hedef kat'), String(UPPER_FLOOR_ID))
    await userEvent.click(screen.getByRole('button', { name: 'Kopyala' }))

    const state = useCadStore.getState()
    expect(state.walls.filter((wall) => wall.floorId === UPPER_FLOOR_ID)).toHaveLength(1)
    expect(state.activeFloorId).toBe(UPPER_FLOOR_ID)
    expect(onClose).toHaveBeenCalled()
  })

  it('hedef seçilmeden Kopyala pasiftir', () => {
    renderDialog()

    expect(screen.getByRole('button', { name: 'Kopyala' })).toBeDisabled()
  })

  it('iki kutu da işaretsizken Kopyala pasiftir', async () => {
    renderDialog()

    await userEvent.selectOptions(screen.getByLabelText('Hedef kat'), String(UPPER_FLOOR_ID))
    await userEvent.click(screen.getByLabelText('Mimari'))
    await userEvent.click(screen.getByLabelText('Tesisat'))

    expect(screen.getByRole('button', { name: 'Kopyala' })).toBeDisabled()
  })

  it('yalnız mimari seçilince tesisat kopyalanmaz', async () => {
    useCadStore.setState({
      installationElements: [
        {
          id: 50,
          floorId: DEFAULT_FLOOR_ID,
          type: 'boiler',
          position: { x: 0, y: 0 },
          angleDeg: 0,
          scale: 1,
        },
      ],
    })
    renderDialog()

    await userEvent.selectOptions(screen.getByLabelText('Hedef kat'), String(UPPER_FLOOR_ID))
    await userEvent.click(screen.getByLabelText('Tesisat'))
    await userEvent.click(screen.getByRole('button', { name: 'Kopyala' }))

    const elements = useCadStore.getState().installationElements
    expect(elements.filter((element) => element.floorId === UPPER_FLOOR_ID)).toHaveLength(0)
    expect(useCadStore.getState().walls.filter((w) => w.floorId === UPPER_FLOOR_ID)).toHaveLength(1)
  })

  it('boş kat yoksa açıklama gösterilir ve hedef seçilemez', () => {
    // İki kat da dolu: üst kata da duvar koy.
    useCadStore.setState({
      points: [
        { id: 2, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
        { id: 3, floorId: DEFAULT_FLOOR_ID, x: 500, y: 0 },
        { id: 20, floorId: UPPER_FLOOR_ID, x: 0, y: 0 },
        { id: 21, floorId: UPPER_FLOOR_ID, x: 100, y: 0 },
      ],
      walls: [
        { id: 6, floorId: DEFAULT_FLOOR_ID, p1Id: 2, p2Id: 3, thickness: 20, height: 280 },
        { id: 22, floorId: UPPER_FLOOR_ID, p1Id: 20, p2Id: 21, thickness: 20, height: 280 },
      ],
    })
    renderDialog()

    expect(screen.getByText(/Kopyalanacak boş kat yok/)).toBeInTheDocument()
    expect(screen.getByLabelText('Hedef kat')).toBeDisabled()
  })

  it('Esc kapatır', async () => {
    const { onClose } = renderDialog()

    await userEvent.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalled()
  })
})
