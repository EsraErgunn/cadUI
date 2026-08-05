import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { DEFAULT_OPENING_WIDTH_CM } from '../../core/opening'
import { DEFAULT_TOOL_ID } from '../../core/tools'
import {
  FIXTURE_NEXT_FREE_ID,
  FIXTURE_OPENINGS,
  FIXTURE_POINTS,
  FIXTURE_WALLS,
} from '../../store/__tests__/architectureFixture'
import { selectOpeningById } from '../../store/architectureSlice'
import { useArchitectureUiStore } from '../../store/architectureUiStore'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { OpeningToolOptions } from '../OpeningToolOptions'

const WINDOW_ID = 12
const WIDTH_LABEL = 'Genişlik (cm)'

beforeEach(() => {
  useUiStore.setState({ activeToolId: DEFAULT_TOOL_ID })
  useArchitectureUiStore.setState({
    selection: [],
    openingWidthCm: { ...DEFAULT_OPENING_WIDTH_CM },
  })
  useCadStore.setState({
    points: FIXTURE_POINTS,
    walls: FIXTURE_WALLS,
    openings: FIXTURE_OPENINGS,
    nextUniqueId: FIXTURE_NEXT_FREE_ID,
    revision: 0,
    savedRevision: 0,
  })
})

describe('OpeningToolOptions', () => {
  it('açıklık üretmeyen araçta görünmez', () => {
    render(<OpeningToolOptions />)
    expect(screen.queryByLabelText(WIDTH_LABEL)).not.toBeInTheDocument()
  })

  it('kapı aracında varsayılan 90 cm gösterir', () => {
    useUiStore.setState({ activeToolId: 'door' })
    render(<OpeningToolOptions />)

    expect(screen.getByLabelText(WIDTH_LABEL)).toHaveValue(90)
  })

  it('pencere aracında varsayılan 120 cm gösterir', () => {
    useUiStore.setState({ activeToolId: 'window' })
    render(<OpeningToolOptions />)

    expect(screen.getByLabelText(WIDTH_LABEL)).toHaveValue(120)
  })

  it('yazarken store yazılmaz, rakamlar eski değerin üstüne eklenmez', async () => {
    const user = userEvent.setup()
    useUiStore.setState({ activeToolId: 'door' })
    render(<OpeningToolOptions />)

    await user.clear(screen.getByLabelText(WIDTH_LABEL))
    await user.type(screen.getByLabelText(WIDTH_LABEL), '100')

    // Girdi doğrudan store'dan beslenseydi burada 90100 görünürdü.
    expect(screen.getByLabelText(WIDTH_LABEL)).toHaveValue(100)
    expect(useArchitectureUiStore.getState().openingWidthCm.door).toBe(
      DEFAULT_OPENING_WIDTH_CM.door,
    )
  })

  it('seçim yokken yalnız sıradaki yerleştirmenin genişliğini değiştirir', async () => {
    const user = userEvent.setup()
    useUiStore.setState({ activeToolId: 'door' })
    render(<OpeningToolOptions />)

    await user.clear(screen.getByLabelText(WIDTH_LABEL))
    await user.type(screen.getByLabelText(WIDTH_LABEL), '100')
    await user.tab()

    expect(useArchitectureUiStore.getState().openingWidthCm.door).toBe(100)
    // Çizim verisi kirlenmedi: bu bir UI tercihi, kaydedilecek bir değişiklik değil.
    expect(useCadStore.getState().openings).toEqual(FIXTURE_OPENINGS)
    expect(useCadStore.getState().revision).toBe(0)
  })

  it('seçili açıklığın genişliğini gösterir ve Enter ile günceller', async () => {
    const user = userEvent.setup()
    useUiStore.setState({ activeToolId: 'window' })
    useArchitectureUiStore.setState({ selection: [{ kind: 'opening', id: WINDOW_ID }] })
    render(<OpeningToolOptions />)

    expect(screen.getByLabelText(WIDTH_LABEL)).toHaveValue(120)

    await user.clear(screen.getByLabelText(WIDTH_LABEL))
    await user.type(screen.getByLabelText(WIDTH_LABEL), '200{Enter}')

    expect(selectOpeningById(useCadStore.getState(), WINDOW_ID)?.widthCm).toBe(200)
    expect(useCadStore.getState().revision).toBe(1)
  })

  it('sığmayan genişlikte uyarır, açıklığı değiştirmez ve girdiyi geri alır', async () => {
    const user = userEvent.setup()
    useUiStore.setState({ activeToolId: 'window' })
    useArchitectureUiStore.setState({ selection: [{ kind: 'opening', id: WINDOW_ID }] })
    render(<OpeningToolOptions />)

    // 250 ortalı 600 cm [-50, 550] olur; duvarın aralığı [25, 470].
    await user.clear(screen.getByLabelText(WIDTH_LABEL))
    await user.type(screen.getByLabelText(WIDTH_LABEL), '600{Enter}')

    expect(screen.getByText('Bu genişlik duvara sığmıyor.')).toBeInTheDocument()
    expect(screen.getByLabelText(WIDTH_LABEL)).toHaveAttribute('aria-invalid', 'true')
    expect(selectOpeningById(useCadStore.getState(), WINDOW_ID)?.widthCm).toBe(120)
    // Ekranda yalan bir sayı kalmaz.
    expect(screen.getByLabelText(WIDTH_LABEL)).toHaveValue(120)
  })

  it('araç değişince o tipin genişliğini gösterir', async () => {
    const user = userEvent.setup()
    useUiStore.setState({ activeToolId: 'door' })
    const { rerender } = render(<OpeningToolOptions />)

    await user.clear(screen.getByLabelText(WIDTH_LABEL))
    await user.type(screen.getByLabelText(WIDTH_LABEL), '100')
    await user.tab()

    useUiStore.setState({ activeToolId: 'window' })
    rerender(<OpeningToolOptions />)

    // Kapıyı 100'e çeken kullanıcı pencerede 120'yi geri bulur.
    expect(screen.getByLabelText(WIDTH_LABEL)).toHaveValue(120)
  })
})
