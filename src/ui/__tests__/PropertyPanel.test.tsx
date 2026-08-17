import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import {
  FIXTURE_NEXT_FREE_ID,
  FIXTURE_OPENINGS,
  FIXTURE_POINTS,
  FIXTURE_WALLS,
  WALL_ID,
  WINDOW_ID,
} from '../../store/__tests__/architectureFixture'
import { useArchitectureUiStore } from '../../store/architectureUiStore'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { PropertyPanel } from '../PropertyPanel'

const RIGHT_CORNER_WALL_ID = 9

beforeEach(() => {
  useCadStore.setState({
    points: FIXTURE_POINTS,
    walls: FIXTURE_WALLS,
    openings: FIXTURE_OPENINGS,
    nextUniqueId: FIXTURE_NEXT_FREE_ID,
    revision: 0,
  })
  useArchitectureUiStore.setState({ selection: [] })
})

describe('PropertyPanel', () => {
  it('seçim yokken erişilebilirlik ağacından gizlenir (K37)', () => {
    render(<PropertyPanel />)

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('tek duvarda başlık ve alanlar görünür', () => {
    useArchitectureUiStore.setState({ selection: [{ kind: 'wall', id: WALL_ID }] })
    render(<PropertyPanel />)

    expect(screen.getByRole('heading', { name: /Duvar Özellikleri/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Kalınlık (cm)')).toHaveValue(20)
    // Duvar 8 = (0,0)-(500,0).
    expect(screen.getByLabelText('Uzunluk (cm)')).toHaveValue(500)
  })

  it('uzunluk salt okunur — köşe komşu duvarlarla paylaşılıyor', () => {
    useArchitectureUiStore.setState({ selection: [{ kind: 'wall', id: WALL_ID }] })
    render(<PropertyPanel />)

    expect(screen.getByLabelText('Uzunluk (cm)')).toHaveAttribute('readonly')
  })

  it('kalınlık yazımı çizime yansır', async () => {
    useArchitectureUiStore.setState({ selection: [{ kind: 'wall', id: WALL_ID }] })
    render(<PropertyPanel />)

    const input = screen.getByLabelText('Kalınlık (cm)')
    await userEvent.clear(input)
    await userEvent.type(input, '40')
    await userEvent.tab()

    expect(useCadStore.getState().walls.find((wall) => wall.id === WALL_ID)?.thickness).toBe(40)
  })

  it('ayrışan değer boş gösterilir, rastgele biri değil', () => {
    // Duvar 8 kalınlık 20, duvar 9 kalınlık 30.
    useArchitectureUiStore.setState({
      selection: [
        { kind: 'wall', id: WALL_ID },
        { kind: 'wall', id: RIGHT_CORNER_WALL_ID },
      ],
    })
    render(<PropertyPanel />)

    expect(screen.getByRole('heading', { name: /2 Duvar/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Kalınlık (cm)')).toHaveValue(null)
  })

  it('kapı ile pencereyi başlıkta ayırır', () => {
    useArchitectureUiStore.setState({ selection: [{ kind: 'opening', id: WINDOW_ID }] })
    render(<PropertyPanel />)

    expect(screen.getByRole('heading', { name: /Pencere Özellikleri/ })).toBeInTheDocument()
  })

  it('açıklık konumunu KENARDAN gösterir (K-3)', () => {
    useArchitectureUiStore.setState({ selection: [{ kind: 'opening', id: WINDOW_ID }] })
    render(<PropertyPanel />)

    // Model merkezi tutuyor: offset 250, genişlik 120 → kenar 190.
    expect(screen.getByLabelText('Duvar başından (cm)')).toHaveValue(190)
  })

  it('kenardan girilen konum merkeze çevrilerek yazılır', async () => {
    useArchitectureUiStore.setState({ selection: [{ kind: 'opening', id: WINDOW_ID }] })
    render(<PropertyPanel />)

    const input = screen.getByLabelText('Duvar başından (cm)')
    await userEvent.clear(input)
    await userEvent.type(input, '100')
    await userEvent.tab()

    const opening = useCadStore.getState().openings.find((item) => item.id === WINDOW_ID)
    expect(opening?.offsetCm).toBe(160)
  })

  it('sığmayan konum reddedilir ve alan eski değerine döner', async () => {
    useArchitectureUiStore.setState({ selection: [{ kind: 'opening', id: WINDOW_ID }] })
    render(<PropertyPanel />)

    const input = screen.getByLabelText('Duvar başından (cm)')
    await userEvent.clear(input)
    await userEvent.type(input, '5')
    await userEvent.tab()

    expect(screen.getByText('Açıklık bu konuma sığmıyor.')).toBeInTheDocument()
    expect(input).toHaveValue(190)
    expect(useCadStore.getState().openings.find((item) => item.id === WINDOW_ID)?.offsetCm).toBe(250)
  })

  it('karışık seçimde ortak alan gösterilmez ama silme çalışır', async () => {
    useArchitectureUiStore.setState({
      selection: [
        { kind: 'wall', id: WALL_ID },
        { kind: 'opening', id: WINDOW_ID },
      ],
    })
    render(<PropertyPanel />)

    expect(screen.getByText(/ortak düzenlenebilir alan yok/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Sil' }))

    expect(useCadStore.getState().walls.some((wall) => wall.id === WALL_ID)).toBe(false)
    expect(useArchitectureUiStore.getState().selection).toHaveLength(0)
  })
})

describe('PropertyPanel — görünüm değişimi (K53)', () => {
  it('mimariden tesisata geçince panel KAPANIR (seçim bırakılır)', () => {
    useUiStore.setState({ activeViewId: 'architecture' })
    useArchitectureUiStore.setState({ selection: [{ kind: 'wall', id: WALL_ID }] })
    render(<PropertyPanel />)

    expect(screen.getByRole('complementary')).toBeInTheDocument()

    act(() => {
      useUiStore.getState().setActiveView('installation')
    })

    expect(useArchitectureUiStore.getState().selection).toHaveLength(0)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
  })

  it('tesisattan mimariye dönüşte de kapalı kalır', () => {
    useUiStore.setState({ activeViewId: 'installation' })
    useArchitectureUiStore.setState({ selection: [{ kind: 'wall', id: WALL_ID }] })
    render(<PropertyPanel />)

    act(() => {
      useUiStore.getState().setActiveView('architecture')
    })

    expect(useArchitectureUiStore.getState().selection).toHaveLength(0)
  })

  it('görünüm DEĞİŞMEDİĞİ sürece seçim korunur — mount seçimi silmez', () => {
    useUiStore.setState({ activeViewId: 'architecture' })
    useArchitectureUiStore.setState({ selection: [{ kind: 'wall', id: WALL_ID }] })
    render(<PropertyPanel />)

    expect(useArchitectureUiStore.getState().selection).toHaveLength(1)
  })
})
