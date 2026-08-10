import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_ID } from '../../core/model'
import { useArchitectureUiStore } from '../../store/architectureUiStore'
import { useCadStore } from '../../store/cadStore'
import { PropertyPanel } from '../PropertyPanel'

function addAreaObject(type: 'structuralColumn' | 'stairs', x: number, y: number) {
  return useCadStore.getState().addAreaObject({ type, x, y })!
}

beforeEach(() => {
  useCadStore.setState({
    floors: [createGroundFloor()],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: [],
    walls: [],
    openings: [],
    rooms: [],
    symbols: [],
    areaObjects: [],
    nextUniqueId: 100,
    revision: 0,
    savedRevision: 0,
  })
  useArchitectureUiStore.setState({ selection: [] })
})

describe('PropertyPanel — alan nesnesi', () => {
  it('başlıkta nesnenin Türkçe türü görünür', () => {
    const id = addAreaObject('structuralColumn', 100, 100)
    useArchitectureUiStore.setState({ selection: [{ kind: 'area', id }] })
    render(<PropertyPanel />)

    expect(screen.getByRole('button', { name: /Kolon Özellikleri/ })).toBeInTheDocument()
  })

  it('tür, etiket, genişlik, uzunluk ve açı gösterilir', () => {
    const id = addAreaObject('structuralColumn', 100, 100)
    useArchitectureUiStore.setState({ selection: [{ kind: 'area', id }] })
    render(<PropertyPanel />)

    expect(screen.getByText('Kolon')).toBeInTheDocument()
    expect(screen.getByLabelText('Etiket')).toHaveValue('K-01')
    expect(screen.getByLabelText('Genişlik (cm)')).toHaveValue(100)
    expect(screen.getByLabelText('Uzunluk (cm)')).toHaveValue(100)
    expect(screen.getByLabelText('Açı (°)')).toHaveValue(0)
  })

  it('etiket düzenlenir', async () => {
    const id = addAreaObject('structuralColumn', 100, 100)
    useArchitectureUiStore.setState({ selection: [{ kind: 'area', id }] })
    render(<PropertyPanel />)

    const input = screen.getByLabelText('Etiket')
    await userEvent.clear(input)
    await userEvent.type(input, 'Asansör Boşluğu')
    await userEvent.tab()

    expect(useCadStore.getState().areaObjects[0].label).toBe('Asansör Boşluğu')
  })

  it('çakışan etiket uyarı gösterir ve yazılmaz (KK-10)', async () => {
    const first = addAreaObject('structuralColumn', 0, 0)
    const second = addAreaObject('structuralColumn', 200, 0)
    useArchitectureUiStore.setState({ selection: [{ kind: 'area', id: second }] })
    render(<PropertyPanel />)

    const input = screen.getByLabelText('Etiket')
    await userEvent.clear(input)
    await userEvent.type(input, 'K-01')

    expect(screen.getByRole('alert')).toHaveTextContent('bu katta kullanılıyor')

    await userEvent.tab()
    expect(useCadStore.getState().areaObjects.find((a) => a.id === second)?.label).toBe('K-02')
    expect(useCadStore.getState().areaObjects.find((a) => a.id === first)?.label).toBe('K-01')
  })

  it('genişlik/uzunluk yazımı çizime yansır', async () => {
    const id = addAreaObject('stairs', 100, 100)
    useArchitectureUiStore.setState({ selection: [{ kind: 'area', id }] })
    render(<PropertyPanel />)

    const widthInput = screen.getByLabelText('Genişlik (cm)')
    await userEvent.clear(widthInput)
    await userEvent.type(widthInput, '150')
    await userEvent.tab()

    expect(useCadStore.getState().areaObjects[0].widthCm).toBe(150)
  })

  it('açı 15 derece adımına yakalanır', async () => {
    const id = addAreaObject('structuralColumn', 100, 100)
    useArchitectureUiStore.setState({ selection: [{ kind: 'area', id }] })
    render(<PropertyPanel />)

    const input = screen.getByLabelText('Açı (°)')
    await userEvent.clear(input)
    await userEvent.type(input, '47')
    await userEvent.tab()

    expect(useCadStore.getState().areaObjects[0].angleDeg).toBe(45)
  })

  it('çoklu nesnede başlık sayıyı gösterir, etiket salt okunur', () => {
    const first = addAreaObject('structuralColumn', 0, 0)
    const second = addAreaObject('structuralColumn', 200, 0)
    useArchitectureUiStore.setState({
      selection: [
        { kind: 'area', id: first },
        { kind: 'area', id: second },
      ],
    })
    render(<PropertyPanel />)

    expect(screen.getByRole('button', { name: /2 Alan Nesnesi/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Etiket')).toHaveAttribute('readonly')
  })

  it('alan nesnesi ile duvar birlikte seçiliyken ortak alan yok', () => {
    const id = addAreaObject('structuralColumn', 0, 0)
    useCadStore.setState({
      points: [
        { id: 300, floorId: DEFAULT_FLOOR_ID, x: 0, y: 0 },
        { id: 301, floorId: DEFAULT_FLOOR_ID, x: 400, y: 0 },
      ],
      walls: [
        { id: 302, floorId: DEFAULT_FLOOR_ID, p1Id: 300, p2Id: 301, thickness: 20, height: 280 },
      ],
    })
    useArchitectureUiStore.setState({
      selection: [
        { kind: 'area', id },
        { kind: 'wall', id: 302 },
      ],
    })
    render(<PropertyPanel />)

    expect(screen.getByText(/ortak düzenlenebilir alan yok/)).toBeInTheDocument()
  })
})
