import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_HEIGHT_CM, DEFAULT_FLOOR_ID, type Floor } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { FloorRail } from '../canvas/FloorRail'

function floor(id: number, name: string, isBasement = false): Floor {
  return { id, name, heightCm: DEFAULT_FLOOR_HEIGHT_CM, isBasement }
}

beforeEach(() => {
  useCadStore.setState({
    floors: [createGroundFloor(), floor(20, '1. Kat'), floor(30, '2. Kat')],
    activeFloorId: DEFAULT_FLOOR_ID,
  })
})

/** Şeritteki düğmeler, ekranda göründükleri sırayla (yukarıdan aşağı). */
function railLabels(): string[] {
  return screen.getAllByRole('radio').map((button) => button.textContent ?? '')
}

describe('FloorRail', () => {
  it('en ÜST kat başta, aşağı doğru iner', () => {
    render(<FloorRail />)

    expect(railLabels()).toEqual(['2', '1', 'Z'])
  })

  it('bodrum B, zemin Z, üstü sayıyla etiketlenir', () => {
    useCadStore.setState({
      floors: [floor(5, 'Bodrum Kat', true), createGroundFloor(), floor(20, '1. Kat')],
    })
    render(<FloorRail />)

    expect(railLabels()).toEqual(['1', 'Z', 'B'])
  })

  it('birden çok bodrum numaralanır — B1 zeminin hemen altı', () => {
    useCadStore.setState({
      floors: [
        floor(4, '2. Bodrum Kat', true),
        floor(5, 'Bodrum Kat', true),
        createGroundFloor(),
      ],
    })
    render(<FloorRail />)

    expect(railLabels()).toEqual(['Z', 'B1', 'B2'])
  })

  it('etiket kat ADINDAN değil SIRADAN gelir', () => {
    useCadStore.setState({
      floors: [createGroundFloor(), floor(20, 'Teras')],
    })
    render(<FloorRail />)

    expect(railLabels()).toEqual(['1', 'Z'])
    // Ad erişilebilir adda ve ipucunda duruyor.
    expect(screen.getByRole('radio', { name: 'Teras' })).toBeInTheDocument()
  })

  it('tıklayınca aktif kat değişir', async () => {
    const user = userEvent.setup()
    render(<FloorRail />)

    await user.click(screen.getByRole('radio', { name: '2. Kat' }))

    expect(useCadStore.getState().activeFloorId).toBe(30)
  })

  it('aktif kat işaretli — geçiş yüzen çubuğa gerek kalmadan okunur', () => {
    render(<FloorRail />)

    expect(screen.getByRole('radio', { name: 'Zemin Kat' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '1. Kat' })).not.toBeChecked()
  })
})

describe('FloorRail — açılır kapanır (K166)', () => {
  it('varsayılan AÇIK: kat geçişi tek tıklama', () => {
    render(<FloorRail />)

    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })

  it('kat ikonlu düğme listeyi kapatır ve yeniden açar', async () => {
    const user = userEvent.setup()
    render(<FloorRail />)

    const toggle = screen.getByRole('button', { name: /^Kat şeridi/ })
    await user.click(toggle)

    // Daireler gitti ama düğmenin kendisi sol üstte kaldı.
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
    expect(toggle).toBeInTheDocument()
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)
    expect(screen.getAllByRole('radio')).toHaveLength(3)
  })
})
