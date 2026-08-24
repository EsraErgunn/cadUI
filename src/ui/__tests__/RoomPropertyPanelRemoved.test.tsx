import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_FLOOR_ID, type Point, type Wall } from '../../core/model'
import { useArchitectureUiStore } from '../../store/architectureUiStore'
import { useCadStore } from '../../store/cadStore'
import { PropertyPanel } from '../PropertyPanel'

const ROOM_ID = 400
const WALL_ID = 10

/** 500 x 400 kapalı dikdörtgen. */
const POINTS: Point[] = [
  { id: 1, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
  { id: 2, floorId: DEFAULT_FLOOR_ID, x: 500, y: 0 },
  { id: 3, floorId: DEFAULT_FLOOR_ID, x: 500, y: 400 },
  { id: 4, floorId: DEFAULT_FLOOR_ID, x: 0, y: 400 },
]

const WALLS: Wall[] = [
  { id: WALL_ID, floorId: DEFAULT_FLOOR_ID, p1Id: 1, p2Id: 2, thickness: 20, height: 280 },
  { id: 11, floorId: DEFAULT_FLOOR_ID, p1Id: 2, p2Id: 3, thickness: 20, height: 280 },
  { id: 12, floorId: DEFAULT_FLOOR_ID, p1Id: 3, p2Id: 4, thickness: 20, height: 280 },
  { id: 13, floorId: DEFAULT_FLOOR_ID, p1Id: 4, p2Id: 1, thickness: 20, height: 280 },
]

function seedDrawing() {
  useCadStore.setState({
    points: POINTS,
    walls: WALLS,
    openings: [],
    activeFloorId: DEFAULT_FLOOR_ID,
    rooms: [{ id: ROOM_ID, wallIds: WALLS.map((wall) => wall.id), usageType: 'kitchen' }],
    revision: 0,
  })
}

beforeEach(() => {
  useArchitectureUiStore.setState({ selection: [] })
  seedDrawing()
})

/**
 * Mahalin özellik PANELİ kaldırıldı (K160, kullanıcı kararı): kullanım tipi
 * artık yalnız mahale sağ tıkla açılan menüden seçiliyor.
 *
 * Bu dosya eskiden paneli test ediyordu; şimdi panelin mahalde AÇILMADIĞINI
 * kilitliyor. Menünün kendi davranışı `<Canvas>` içinde yaşadığı için (drei
 * `<Html>`) burada test edilemiyor; mahal bulma tarafı `core/roomPick` testinde.
 */
describe('mahal özellik paneli KALDIRILDI', () => {
  it('mahal seçiliyken panel AÇILMAZ', () => {
    useArchitectureUiStore.setState({ selection: [{ kind: 'room', id: ROOM_ID }] })
    render(<PropertyPanel />)

    // Kabuk DOM'da kalır ama kapalıyken ekran dışına kayar ve `inert` olur.
    const panel = screen.getByLabelText('Nesne özellikleri')
    expect(panel).toHaveAttribute('aria-hidden', 'true')
  })

  it('mahalde kullanım tipi alanı HİÇ çizilmez', () => {
    useArchitectureUiStore.setState({ selection: [{ kind: 'room', id: ROOM_ID }] })
    render(<PropertyPanel />)

    expect(screen.queryByRole('combobox', { name: 'Kullanım Tipi' })).not.toBeInTheDocument()
  })

  it('DUVAR seçiliyken panel açılmaya devam eder', () => {
    // Kaldırma yalnız mahali kapsıyor; öteki türler etkilenmemeli.
    useArchitectureUiStore.setState({ selection: [{ kind: 'wall', id: WALL_ID }] })
    render(<PropertyPanel />)

    const panel = screen.getByLabelText('Nesne özellikleri')
    expect(panel).not.toHaveAttribute('aria-hidden', 'true')
  })

  it('duvarda SİL düğmesi görünür — mahal için gizlenen dal da kalktı', () => {
    useArchitectureUiStore.setState({ selection: [{ kind: 'wall', id: WALL_ID }] })
    render(<PropertyPanel />)

    expect(screen.getByRole('button', { name: /Sil/ })).toBeInTheDocument()
  })
})
