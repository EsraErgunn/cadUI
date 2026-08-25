import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'

import { useCadStore } from '../../../store/cadStore'
import {
  ISOMETRIC_ALPHA_MAX_DEG,
  ISOMETRIC_ANGLES_DEFAULT,
} from '../../core/isometricProjection'
import { useIsometricUiStore } from '../../store/isometricUiStore'
import { IsometricHud } from '../IsometricHud'
import { IsometricLegend } from '../IsometricLegend'
import { IsometricModeSwitch } from '../IsometricModeSwitch'

beforeEach(() => {
  useCadStore.getState().resetProject()
  useIsometricUiStore.setState({ isCameraLocked: true })
})

describe('IsometricHud — bakış açısı', () => {
  it('kaydırıcılar mevcut açıyı gösterir', () => {
    render(<IsometricHud />)

    // Varsayılan gerçek izometri (35,264°/45°); kaydırıcı adımı 1° olduğu için
    // gösterilen değer yuvarlanır, store'daki tam değer korunur.
    expect(screen.getByRole('slider', { name: 'Bakış eğimi (alfa)' })).toHaveAttribute(
      'aria-valuetext',
      '35°',
    )
    expect(screen.getByRole('slider', { name: 'Bakış dönüşü (beta)' })).toHaveValue(
      String(ISOMETRIC_ANGLES_DEFAULT.betaDeg),
    )
  })

  it('değer birimiyle okunur (aria-valuetext)', () => {
    // Ham "45" birimsiz okunurdu; kullanıcı neyin 45 olduğunu duymaz.
    render(<IsometricHud />)
    expect(screen.getByRole('slider', { name: 'Bakış dönüşü (beta)' })).toHaveAttribute(
      'aria-valuetext',
      '45°',
    )
  })

  it('Üstten hazır açısı alfayı sınıra dayar ve seçili işaretlenir', async () => {
    const user = userEvent.setup()
    render(<IsometricHud />)

    await user.click(screen.getByRole('button', { name: 'Üstten' }))

    expect(useCadStore.getState().isometricAngles.alphaDeg).toBe(ISOMETRIC_ALPHA_MAX_DEG)
    expect(screen.getByRole('button', { name: 'Üstten' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('yan görünüm hazır açıları YOK — plan görünümü zaten var', () => {
    render(<IsometricHud />)
    for (const label of ['Önden', 'Sağdan', 'Soldan']) {
      expect(screen.queryByRole('button', { name: label })).toBeNull()
    }
  })
})

describe('IsometricHud — varsayılana döndür', () => {
  it('izometrik etiket konumlarını temizler, plandakine dokunmaz', async () => {
    const user = userEvent.setup()
    const elementId = useCadStore.getState().addElement({
      type: 'valve',
      position: { x: 0, y: 0 },
    })
    useCadStore.getState().setElementLabelOffset(elementId, { x: 10, y: 10 })
    useCadStore.getState().setElementIsometricLabelOffset(elementId, { x: 99, y: 99 })

    render(<IsometricHud />)
    await user.click(screen.getByRole('button', { name: /Varsayılana döndür/ }))

    const element = useCadStore
      .getState()
      .installationElements.find((candidate) => candidate.id === elementId)
    expect(element?.isometricLabelOffsetCm).toBeUndefined()
    // Plan görünümündeki yerleşim BOZULMAZ — ayrı alan tutmamızın sebebi bu.
    expect(element?.labelOffsetCm).toEqual({ x: 10, y: 10 })
  })

  it('bakış açısını ve kamera kilidini de varsayılana çeker', async () => {
    const user = userEvent.setup()
    useCadStore.getState().setIsometricAngles({ alphaDeg: 12, betaDeg: 200 })
    useIsometricUiStore.setState({ isCameraLocked: false })

    render(<IsometricHud />)
    await user.click(screen.getByRole('button', { name: /Varsayılana döndür/ }))

    expect(useCadStore.getState().isometricAngles).toEqual(ISOMETRIC_ANGLES_DEFAULT)
    expect(useIsometricUiStore.getState().isCameraLocked).toBe(true)
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
  it('çizimde hat yoksa hiç çizilmez', () => {
    const { container } = render(<IsometricLegend />)
    expect(container).toBeEmptyDOMElement()
  })

  it('yalnız kullanılan çapları listeler, ölçü yazmaz', () => {
    const start = useCadStore.getState().addElement({ type: 'valve', position: { x: 0, y: 0 } })
    expect(start).toBeGreaterThan(0)
    useCadStore.getState().addLine({
      kind: 'pipe',
      points: [
        { x: 0, y: 0 },
        { x: 300, y: 0 },
      ],
      pipeTypeName: 'DN32',
    })

    render(<IsometricLegend />)
    const group = screen.getByRole('group', { name: 'Boru renkleri' })

    expect(within(group).getByText('DN32')).toBeInTheDocument()
    expect(within(group).queryByText('DN25')).toBeNull()
    // Dış çap ve toplam boy K166'da kaldırıldı.
    expect(within(group).queryByText(/mm/)).toBeNull()
    expect(within(group).queryByText(/m$/)).toBeNull()
  })
})
