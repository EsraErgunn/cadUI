import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useCadStore } from '../../../store/cadStore'
import { ISOMETRIC_ANGLES_DEFAULT } from '../../core/isometricProjection'
import { useIsometricUiStore } from '../../store/isometricUiStore'
import { IsometricHud } from '../IsometricHud'
import { IsometricLegend } from '../IsometricLegend'
import { IsometricModeSwitch } from '../IsometricModeSwitch'

beforeEach(() => {
  useCadStore.getState().resetProject()
  useIsometricUiStore.setState({ isCameraLocked: true, explodedGapCm: 0 })
})

describe('IsometricHud — bakış açısı', () => {
  it('kaydırıcılar mevcut açıyı gösterir', () => {
    render(<IsometricHud />)

    expect(screen.getByRole('slider', { name: 'Bakış eğimi (alfa)' })).toHaveValue(
      String(ISOMETRIC_ANGLES_DEFAULT.alphaDeg),
    )
    expect(screen.getByRole('slider', { name: 'Bakış dönüşü (beta)' })).toHaveValue(
      String(ISOMETRIC_ANGLES_DEFAULT.betaDeg),
    )
  })

  it('değer birimiyle okunur (aria-valuetext)', () => {
    // Ham "40" birimsiz okunurdu; kullanıcı neyin 40 olduğunu duymaz.
    render(<IsometricHud />)
    expect(screen.getByRole('slider', { name: 'Bakış eğimi (alfa)' })).toHaveAttribute(
      'aria-valuetext',
      '40°',
    )
  })

  it('hazır açı düğmesi açıyı yazar ve seçili işaretlenir', async () => {
    const user = userEvent.setup()
    render(<IsometricHud />)

    await user.click(screen.getByRole('button', { name: 'Önden' }))

    expect(useCadStore.getState().isometricAngles).toEqual({ alphaDeg: 0, betaDeg: 0 })
    expect(screen.getByRole('button', { name: 'Önden' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('IsometricHud — katları aralıklandırma', () => {
  it('varsayılanda "Bitişik" yazar', () => {
    render(<IsometricHud />)
    expect(screen.getByRole('slider', { name: 'Katları aralıklandırma' })).toHaveAttribute(
      'aria-valuetext',
      'Bitişik',
    )
  })

  it('aralık açılınca metre olarak okunur', () => {
    useIsometricUiStore.setState({ explodedGapCm: 250 })
    render(<IsometricHud />)

    expect(screen.getByRole('slider', { name: 'Katları aralıklandırma' })).toHaveAttribute(
      'aria-valuetext',
      '2,50 m',
    )
  })
})

describe('IsometricHud — sıfırlama', () => {
  it('izometrik etiket konumlarını temizler, plandakine dokunmaz', async () => {
    const user = userEvent.setup()
    const elementId = useCadStore.getState().addElement({
      type: 'valve',
      position: { x: 0, y: 0 },
    })
    useCadStore.getState().setElementLabelOffset(elementId, { x: 10, y: 10 })
    useCadStore.getState().setElementIsometricLabelOffset(elementId, { x: 99, y: 99 })

    render(<IsometricHud />)
    await user.click(screen.getByRole('button', { name: /İzometrik konumları sıfırla/ }))

    const element = useCadStore
      .getState()
      .installationElements.find((candidate) => candidate.id === elementId)
    expect(element?.isometricLabelOffsetCm).toBeUndefined()
    // Plan görünümündeki yerleşim BOZULMAZ — ayrı alan tutmamızın sebebi bu.
    expect(element?.labelOffsetCm).toEqual({ x: 10, y: 10 })
  })
})

describe('IsometricModeSwitch', () => {
  it('iki kip birbirini dışlar (radiogroup)', () => {
    render(<IsometricModeSwitch />)
    const group = screen.getByRole('radiogroup', { name: 'İzometrik kamera kipi' })

    expect(within(group).getByRole('radio', { name: 'İzometrik' })).toBeChecked()
    expect(within(group).getByRole('radio', { name: 'Serbest' })).not.toBeChecked()
  })

  it('serbest kipe geçince kamera kilidi açılır', async () => {
    const user = userEvent.setup()
    render(<IsometricModeSwitch />)

    await user.click(screen.getByRole('radio', { name: 'Serbest' }))

    expect(useIsometricUiStore.getState().isCameraLocked).toBe(false)
    expect(screen.getByRole('radio', { name: 'Serbest' })).toBeChecked()
  })
})

describe('IsometricLegend', () => {
  it('çizimde çap yoksa hiç çizilmez', () => {
    const { container } = render(<IsometricLegend />)
    expect(container).toBeEmptyDOMElement()
  })

  it('yalnız kullanılan çapları listeler', () => {
    const start = useCadStore.getState().addElement({ type: 'valve', position: { x: 0, y: 0 } })
    expect(start).toBeGreaterThan(0)
    useCadStore.getState().addLine({
      kind: 'pipe',
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      pipeTypeName: 'DN32',
    })

    render(<IsometricLegend />)
    const group = screen.getByRole('group', { name: 'Boru çapı renkleri' })

    expect(within(group).getByText('DN32')).toBeInTheDocument()
    expect(within(group).queryByText('DN25')).toBeNull()
  })
})
