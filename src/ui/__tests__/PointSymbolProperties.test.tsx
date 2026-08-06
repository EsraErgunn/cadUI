import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_FLOOR_ID, DEFAULT_FLOOR_NAME } from '../../core/model'
import { useArchitectureUiStore } from '../../store/architectureUiStore'
import { useCadStore } from '../../store/cadStore'
import { PropertyPanel } from '../PropertyPanel'

function addSymbol(type: 'panel' | 'vent', x: number, y: number) {
  return useCadStore.getState().addPointSymbol({ type, position: { x, y } })!
}

beforeEach(() => {
  useCadStore.setState({
    floors: [{ id: DEFAULT_FLOOR_ID, name: DEFAULT_FLOOR_NAME }],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: [],
    walls: [],
    openings: [],
    rooms: [],
    symbols: [],
    nextUniqueId: 100,
    revision: 0,
    savedRevision: 0,
  })
  useArchitectureUiStore.setState({ selection: [] })
})

describe('PropertyPanel — nokta sembolü', () => {
  it('başlıkta sembolün Türkçe türü görünür', () => {
    const id = addSymbol('panel', 100, 100)
    useArchitectureUiStore.setState({ selection: [{ kind: 'symbol', id }] })
    render(<PropertyPanel />)

    expect(screen.getByRole('button', { name: /Pano Özellikleri/ })).toBeInTheDocument()
  })

  it('tür, etiket ve açı gösterilir', () => {
    const id = addSymbol('vent', 100, 100)
    useCadStore.getState().rotatePointSymbol(id, 90)
    useArchitectureUiStore.setState({ selection: [{ kind: 'symbol', id }] })
    render(<PropertyPanel />)

    expect(screen.getByText('Menfez')).toBeInTheDocument()
    expect(screen.getByLabelText('Etiket')).toHaveValue('MN-01')
    expect(screen.getByLabelText('Açı (°)')).toHaveValue(90)
  })

  it('etiket düzenlenir', async () => {
    const id = addSymbol('panel', 100, 100)
    useArchitectureUiStore.setState({ selection: [{ kind: 'symbol', id }] })
    render(<PropertyPanel />)

    const input = screen.getByLabelText('Etiket')
    await userEvent.clear(input)
    await userEvent.type(input, 'Mutfak panosu')
    await userEvent.tab()

    expect(useCadStore.getState().symbols[0].label).toBe('Mutfak panosu')
  })

  it('çakışan etiket uyarı gösterir ve yazılmaz (KK-10)', async () => {
    const first = addSymbol('panel', 0, 0)
    const second = addSymbol('vent', 200, 0)
    useArchitectureUiStore.setState({ selection: [{ kind: 'symbol', id: second }] })
    render(<PropertyPanel />)

    const input = screen.getByLabelText('Etiket')
    await userEvent.clear(input)
    await userEvent.type(input, 'P-01')

    expect(screen.getByRole('alert')).toHaveTextContent('bu katta kullanılıyor')

    await userEvent.tab()
    expect(useCadStore.getState().symbols.find((s) => s.id === second)?.label).toBe('MN-01')
    expect(useCadStore.getState().symbols.find((s) => s.id === first)?.label).toBe('P-01')
  })

  it('açı 15 derece adımına yakalanır', async () => {
    const id = addSymbol('panel', 100, 100)
    useArchitectureUiStore.setState({ selection: [{ kind: 'symbol', id }] })
    render(<PropertyPanel />)

    const input = screen.getByLabelText('Açı (°)')
    await userEvent.clear(input)
    await userEvent.type(input, '47')
    await userEvent.tab()

    expect(useCadStore.getState().symbols[0].rotationDeg).toBe(45)
  })

  it('not yazılır', async () => {
    const id = addSymbol('vent', 100, 100)
    useArchitectureUiStore.setState({ selection: [{ kind: 'symbol', id }] })
    render(<PropertyPanel />)

    await userEvent.type(screen.getByLabelText('Not'), 'Banyo')

    expect(useCadStore.getState().symbols[0].note).toBe('Banyo')
  })

  it('çoklu sembolde başlık sayıyı gösterir, etiket salt okunur', () => {
    const first = addSymbol('panel', 0, 0)
    const second = addSymbol('panel', 200, 0)
    useArchitectureUiStore.setState({
      selection: [
        { kind: 'symbol', id: first },
        { kind: 'symbol', id: second },
      ],
    })
    render(<PropertyPanel />)

    expect(screen.getByRole('button', { name: /2 Sembol/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Etiket')).toHaveAttribute('readonly')
  })

  it('sembol ile duvar birlikte seçiliyken ortak alan yok', () => {
    const id = addSymbol('panel', 0, 0)
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
        { kind: 'symbol', id },
        { kind: 'wall', id: 302 },
      ],
    })
    render(<PropertyPanel />)

    expect(screen.getByText(/ortak düzenlenebilir alan yok/)).toBeInTheDocument()
  })
})
