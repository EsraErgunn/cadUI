import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_ID } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { FloorStrip } from '../FloorStrip'

const BASEMENT_ID = 20
const UPPER_ID = 21

/** Bodrum (boş) · Zemin (çizimli) · 1. Kat (boş). */
beforeEach(() => {
  useCadStore.setState({
    floors: [
      { id: BASEMENT_ID, name: 'Bodrum Kat', heightCm: 280, isBasement: true },
      createGroundFloor(),
      { id: UPPER_ID, name: '1. Kat', heightCm: 300, isBasement: false },
    ],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: [{ id: 30, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 }],
    walls: [],
    openings: [],
    rooms: [],
    symbols: [],
    installationElements: [],
    installationLines: [],
  })
})

function chipNames(): string[] {
  const strip = screen.getByRole('navigation', { name: 'Katlar' })
  return within(strip)
    .getAllByRole('button')
    .map((button) => button.textContent ?? '')
}

describe('FloorStrip (KK-21)', () => {
  it('katları soldan sağa AŞAĞIDAN YUKARIYA sıralar', () => {
    render(<FloorStrip />)

    expect(chipNames()).toEqual(['Bodrum Kat', 'Zemin Kat', '1. Kat'])
  })

  it('aktif katı işaretler', () => {
    render(<FloorStrip />)

    expect(screen.getByRole('button', { name: 'Zemin Kat' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(screen.getByRole('button', { name: '1. Kat' })).not.toHaveAttribute('aria-current')
  })

  it('kat eklenince şerit ANINDA güncellenir', () => {
    render(<FloorStrip />)

    // Store React dışından güncelleniyor; act olmadan render sırası kesinleşmez.
    act(() => {
      useCadStore.getState().addFloor({ name: 'Çatı' })
    })

    expect(chipNames()).toContain('Çatı')
  })

  it('kat adı değişince şerit ANINDA güncellenir', () => {
    render(<FloorStrip />)

    act(() => {
      useCadStore.getState().renameFloor(UPPER_ID, 'Çatı Katı')
    })

    expect(chipNames()).toContain('Çatı Katı')
  })
})

describe('FloorStrip — katlar arası geçiş (KK-22)', () => {
  it('tıklanan kat aktif olur', async () => {
    render(<FloorStrip />)

    await userEvent.click(screen.getByRole('button', { name: '1. Kat' }))

    expect(useCadStore.getState().activeFloorId).toBe(UPPER_ID)
  })

  it('geçiş çizim verisine dokunmaz', async () => {
    render(<FloorStrip />)
    const pointsBefore = useCadStore.getState().points

    await userEvent.click(screen.getByRole('button', { name: 'Bodrum Kat' }))

    expect(useCadStore.getState().points).toBe(pointsBefore)
  })
})
