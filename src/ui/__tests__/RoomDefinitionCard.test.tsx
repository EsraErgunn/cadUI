import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_FLOOR_ID, type Point, type Room, type Wall } from '../../core/model'
import { useArchitectureUiStore } from '../../store/architectureUiStore'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { RoomDefinitionCard } from '../canvas/RoomDefinitionCard'

const LOWER_ROOM_ID = 400
const UPPER_ROOM_ID = 401

/**
 * 500 geniş, iki katlı dikdörtgen: alt mahal y 0..400, üst mahal y 400..800.
 * Aradaki duvar ikisine de ait.
 */
const POINTS: Point[] = [
  { id: 1, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
  { id: 2, floorId: DEFAULT_FLOOR_ID, x: 500, y: 0 },
  { id: 3, floorId: DEFAULT_FLOOR_ID, x: 500, y: 400 },
  { id: 4, floorId: DEFAULT_FLOOR_ID, x: 0, y: 400 },
  { id: 5, floorId: DEFAULT_FLOOR_ID, x: 500, y: 800 },
  { id: 6, floorId: DEFAULT_FLOOR_ID, x: 0, y: 800 },
]

function makeWall(id: number, p1Id: number, p2Id: number): Wall {
  return { id, floorId: DEFAULT_FLOOR_ID, p1Id, p2Id, thickness: 20, height: 280 }
}

const WALLS: Wall[] = [
  makeWall(10, 1, 2),
  makeWall(11, 2, 3),
  makeWall(12, 3, 4),
  makeWall(13, 4, 1),
  makeWall(14, 3, 5),
  makeWall(15, 5, 6),
  makeWall(16, 6, 4),
]

const LOWER_ROOM: Room = { id: LOWER_ROOM_ID, wallIds: [10, 11, 12, 13] }
const UPPER_ROOM: Room = { id: UPPER_ROOM_ID, wallIds: [12, 14, 15, 16] }

function seed(rooms: Room[]) {
  useCadStore.setState({
    points: POINTS,
    walls: WALLS,
    openings: [],
    rooms,
    activeFloorId: DEFAULT_FLOOR_ID,
    revision: 0,
  })
}

/** Kipi menüdeki yolla aynı biçimde başlatır: kuyruk okuma sırasında verilir. */
function startMode(roomIds: number[]) {
  useArchitectureUiStore.getState().startRoomDefinition(roomIds)
}

beforeEach(() => {
  useArchitectureUiStore.getState().stopRoomDefinition()
  useUiStore.getState().clearFocusRequest()
  seed([LOWER_ROOM, UPPER_ROOM])
})

describe('RoomDefinitionCard', () => {
  it('kip kapalıyken hiçbir şey çizmez', () => {
    render(<RoomDefinitionCard />)

    expect(screen.queryByRole('region', { name: 'Mahal tanımlama' })).not.toBeInTheDocument()
  })

  it('sıradaki mahalin alanını ve ilerlemeyi yazar', () => {
    startMode([UPPER_ROOM_ID, LOWER_ROOM_ID])
    render(<RoomDefinitionCard />)

    expect(screen.getByRole('region', { name: 'Mahal tanımlama' })).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByText('20,0 m²')).toBeInTheDocument()
  })

  it('rozete tıklamak tipi yazar ve sıradaki mahale geçer', async () => {
    const user = userEvent.setup()
    startMode([UPPER_ROOM_ID, LOWER_ROOM_ID])
    render(<RoomDefinitionCard />)

    // Sondan bağlanan kalıp: "Salon (Açık Mutfak)" ile karışmasın.
    await user.click(screen.getByRole('button', { name: /Mutfak$/ }))

    expect(useCadStore.getState().rooms.find((room) => room.id === UPPER_ROOM_ID)?.usageType).toBe(
      'kitchen',
    )
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  it('son mahal de tanımlanınca kip kendini kapatır', async () => {
    const user = userEvent.setup()
    startMode([UPPER_ROOM_ID])
    render(<RoomDefinitionCard />)

    await user.click(screen.getByRole('button', { name: /Salon$/ }))

    expect(useArchitectureUiStore.getState().roomDefinitionQueue).toBeNull()
    expect(screen.queryByRole('region', { name: 'Mahal tanımlama' })).not.toBeInTheDocument()
  })

  it('kamera sıradaki mahale odaklanır', () => {
    startMode([LOWER_ROOM_ID])
    render(<RoomDefinitionCard />)

    const bounds = useUiStore.getState().pendingFocusBounds
    // Mahalin çevresinde pay var: sınırlar poligonu AŞAR.
    expect(bounds?.minXCm).toBeLessThan(0)
    expect(bounds?.maxYCm).toBeGreaterThan(400)
  })

  it('rakam tuşu HİÇBİR ŞEY yapmaz — kısayol kaldırıldı', async () => {
    const user = userEvent.setup()
    startMode([LOWER_ROOM_ID])
    render(<RoomDefinitionCard />)

    await user.keyboard('1')

    expect(
      useCadStore.getState().rooms.find((room) => room.id === LOWER_ROOM_ID)?.usageType,
    ).toBeUndefined()
  })

  it('Esc kipten çıkarır', async () => {
    const user = userEvent.setup()
    startMode([LOWER_ROOM_ID, UPPER_ROOM_ID])
    render(<RoomDefinitionCard />)

    await user.keyboard('{Escape}')

    expect(useArchitectureUiStore.getState().roomDefinitionQueue).toBeNull()
  })

  it('tanımsız mahal yoksa kip hiç açılmaz', () => {
    startMode([])
    render(<RoomDefinitionCard />)

    expect(screen.queryByRole('region', { name: 'Mahal tanımlama' })).not.toBeInTheDocument()
  })
})

describe('RoomDefinitionCard — arama', () => {
  it('yazarak süzer ve Türkçe karakteri yok sayar', async () => {
    const user = userEvent.setup()
    startMode([LOWER_ROOM_ID])
    render(<RoomDefinitionCard />)

    await user.type(screen.getByRole('searchbox', { name: 'Mahal tipi ara' }), 'camasir')

    expect(screen.getByRole('button', { name: /Çamaşırlık/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Mutfak$/ })).not.toBeInTheDocument()
  })

  it('Enter görünen ilk rozeti yazar', async () => {
    const user = userEvent.setup()
    startMode([LOWER_ROOM_ID])
    render(<RoomDefinitionCard />)

    await user.type(screen.getByRole('searchbox', { name: 'Mahal tipi ara' }), 'camasir{Enter}')

    expect(useCadStore.getState().rooms.find((room) => room.id === LOWER_ROOM_ID)?.usageType).toBe(
      'laundry',
    )
  })

  it('kutu doluyken Esc yalnız aramayı temizler, kipten çıkarmaz', async () => {
    const user = userEvent.setup()
    startMode([LOWER_ROOM_ID, UPPER_ROOM_ID])
    render(<RoomDefinitionCard />)
    const search = screen.getByRole('searchbox', { name: 'Mahal tipi ara' })

    await user.type(search, 'mut{Escape}')

    expect(search).toHaveValue('')
    expect(useArchitectureUiStore.getState().roomDefinitionQueue).not.toBeNull()

    // Kutu boşken ikinci Esc kipi kapatır — pencere dinleyicisi yazı alanını
    // atladığı için bunu kutunun kendisi yapıyor.
    await user.keyboard('{Escape}')
    expect(useArchitectureUiStore.getState().roomDefinitionQueue).toBeNull()
  })
})

describe('RoomDefinitionCard — gözden geçirme turu', () => {
  it('hepsi tanımlıyken tip yazmak kipi KAPATMAZ, sıradaki durağa geçer', async () => {
    const user = userEvent.setup()
    seed([
      { ...LOWER_ROOM, usageType: 'kitchen' },
      { ...UPPER_ROOM, usageType: 'livingRoom' },
    ])
    startMode([UPPER_ROOM_ID, LOWER_ROOM_ID])
    render(<RoomDefinitionCard />)

    await user.click(screen.getByRole('button', { name: /Banyo$/ }))

    expect(useArchitectureUiStore.getState().roomDefinitionQueue).not.toBeNull()
    expect(useArchitectureUiStore.getState().roomDefinitionIndex).toBe(1)
    expect(useCadStore.getState().rooms.find((room) => room.id === UPPER_ROOM_ID)?.usageType).toBe(
      'bathroom',
    )
  })

  it('son durakta tip yazılınca kip kapanır', async () => {
    const user = userEvent.setup()
    seed([{ ...LOWER_ROOM, usageType: 'kitchen' }])
    startMode([LOWER_ROOM_ID])
    render(<RoomDefinitionCard />)

    await user.click(screen.getByRole('button', { name: /Banyo$/ }))

    expect(useArchitectureUiStore.getState().roomDefinitionQueue).toBeNull()
  })
})
