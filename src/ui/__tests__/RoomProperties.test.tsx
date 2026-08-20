import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_FLOOR_ID, type Point, type Wall } from '../../core/model'
import { useArchitectureUiStore } from '../../store/architectureUiStore'
import { useCadStore } from '../../store/cadStore'
import { PropertyPanel } from '../PropertyPanel'

const ROOM_ID = 400
const OTHER_ROOM_ID = 401

/** 500 x 400 kapalı dikdörtgen = 20 m². Alan iddiası bunun üstünde duruyor. */
const POINTS: Point[] = [
  { id: 1, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
  { id: 2, floorId: DEFAULT_FLOOR_ID, x: 500, y: 0 },
  { id: 3, floorId: DEFAULT_FLOOR_ID, x: 500, y: 400 },
  { id: 4, floorId: DEFAULT_FLOOR_ID, x: 0, y: 400 },
]

const WALLS: Wall[] = [
  { id: 10, floorId: DEFAULT_FLOOR_ID, p1Id: 1, p2Id: 2, thickness: 20, height: 280 },
  { id: 11, floorId: DEFAULT_FLOOR_ID, p1Id: 2, p2Id: 3, thickness: 20, height: 280 },
  { id: 12, floorId: DEFAULT_FLOOR_ID, p1Id: 3, p2Id: 4, thickness: 20, height: 280 },
  { id: 13, floorId: DEFAULT_FLOOR_ID, p1Id: 4, p2Id: 1, thickness: 20, height: 280 },
]

function seedRoom(usageType?: 'kitchen' | 'livingRoom') {
  const wallIds = WALLS.map((wall) => wall.id)
  useCadStore.setState({
    points: POINTS,
    walls: WALLS,
    openings: [],
    activeFloorId: DEFAULT_FLOOR_ID,
    rooms: [
      usageType === undefined
        ? { id: ROOM_ID, wallIds }
        : { id: ROOM_ID, wallIds, usageType },
    ],
    revision: 0,
  })
  useArchitectureUiStore.setState({ selection: [{ kind: 'room', id: ROOM_ID }] })
}

beforeEach(() => {
  useArchitectureUiStore.setState({ selection: [] })
})

describe('mahal özellik paneli', () => {
  it('mahal seçiliyken açılır ve başlığı "Mahal Özellikleri"', () => {
    seedRoom()
    render(<PropertyPanel />)

    expect(screen.getByRole('heading', { name: /Mahal Özellikleri/ })).toBeInTheDocument()
  })

  it('kullanıcı serbest metin YAZAMAZ, yalnız listeden seçer', () => {
    seedRoom()
    render(<PropertyPanel />)

    expect(screen.getByLabelText('Kullanım Tipi').tagName).toBe('SELECT')
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('seçilen tip store\'a yazılır', async () => {
    const user = userEvent.setup()
    seedRoom()
    render(<PropertyPanel />)

    await user.selectOptions(screen.getByLabelText('Kullanım Tipi'), 'kitchen')

    expect(useCadStore.getState().rooms[0].usageType).toBe('kitchen')
  })

  it('"Tanımsız" seçmek alanı SİLER', async () => {
    const user = userEvent.setup()
    seedRoom('kitchen')
    render(<PropertyPanel />)

    await user.selectOptions(screen.getByLabelText('Kullanım Tipi'), 'Tanımsız')

    expect('usageType' in useCadStore.getState().rooms[0]).toBe(false)
  })

  it('mahalde SİL düğmesi YOK — mahal duvarların türevi', () => {
    seedRoom()
    render(<PropertyPanel />)

    expect(screen.queryByRole('button', { name: 'Sil' })).not.toBeInTheDocument()
  })

  it('alanı m² olarak salt okunur gösterir', () => {
    seedRoom()
    render(<PropertyPanel />)

    expect(screen.getByText('Alan: 20 m²')).toBeInTheDocument()
  })

  it('çoklu seçimde tipler ayrışıyorsa ortak değer gösterilmez', () => {
    seedRoom('kitchen')
    useCadStore.setState((state) => ({
      rooms: [
        ...state.rooms,
        { id: OTHER_ROOM_ID, wallIds: [999], usageType: 'livingRoom' as const },
      ],
    }))
    useArchitectureUiStore.setState({
      selection: [
        { kind: 'room', id: ROOM_ID },
        { kind: 'room', id: OTHER_ROOM_ID },
      ],
    })
    render(<PropertyPanel />)

    expect(screen.getByRole('heading', { name: /2 Mahal/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Kullanım Tipi')).toHaveValue('')
  })
})
