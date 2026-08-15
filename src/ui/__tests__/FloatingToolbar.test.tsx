import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_HEIGHT_CM, DEFAULT_FLOOR_ID } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { FloatingToolbar } from '../canvas/FloatingToolbar'

const UPPER_FLOOR_ID = 14

beforeEach(() => {
  useCadStore.setState({
    floors: [
      createGroundFloor(),
      { id: UPPER_FLOOR_ID, name: '1. Kat', heightCm: DEFAULT_FLOOR_HEIGHT_CM, isBasement: false },
    ],
    activeFloorId: DEFAULT_FLOOR_ID,
    points: [],
    walls: [],
    openings: [],
    rooms: [],
    symbols: [],
    areaObjects: [],
    beams: [],
  })
  useUiStore.setState({ activeViewId: 'architecture', isPanModeActive: false })
})

describe('FloatingToolbar — ortak kontroller', () => {
  it('el düğmesi pan modunu açar, seçim düğmesi kapatır', async () => {
    render(<FloatingToolbar onGoToFloor={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: 'El aracı' }))
    expect(useUiStore.getState().isPanModeActive).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Seçim aracı' }))
    expect(useUiStore.getState().isPanModeActive).toBe(false)
  })

  it('en alttaki katta "alt kata geç" pasif — geçiş döngüsel değil', () => {
    render(<FloatingToolbar onGoToFloor={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Alt kata geç' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Üst kata geç' })).toBeEnabled()
  })

  it('geçmiş boşken geri al/yinele pasif', () => {
    useCadStore.temporal.getState().clear()
    render(<FloatingToolbar onGoToFloor={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Geri al' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Yinele' })).toBeDisabled()
  })
})

/**
 * K57: çubuk iki çizim görünümünde de var; görünüme ÖZEL parçalar dallanıyor.
 */
describe('FloatingToolbar — görünüme göre değişenler', () => {
  it('snap düğmesi YALNIZ mimaride var', () => {
    const { unmount } = render(<FloatingToolbar onGoToFloor={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Izgaraya yakala' })).toBeInTheDocument()
    unmount()

    useUiStore.setState({ activeViewId: 'installation' })
    render(<FloatingToolbar onGoToFloor={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Izgaraya yakala' })).not.toBeInTheDocument()
  })

  it('Görünüm menüsü mimaride nesne/oda adlarını gösterir', async () => {
    render(<FloatingToolbar onGoToFloor={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /Görünüm/ }))

    expect(screen.getByRole('menuitemcheckbox', { name: 'Nesne adları' })).toBeInTheDocument()
    expect(screen.getByRole('menuitemcheckbox', { name: 'Oda adları' })).toBeInTheDocument()
    expect(screen.getByRole('menuitemcheckbox', { name: 'Izgara' })).toBeInTheDocument()
  })

  it('Görünüm menüsü tesisatta ölçü/eleman adlarını gösterir', async () => {
    useUiStore.setState({ activeViewId: 'installation' })
    render(<FloatingToolbar onGoToFloor={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /Görünüm/ }))

    expect(screen.getByRole('menuitemcheckbox', { name: 'Ölçüler' })).toBeInTheDocument()
    expect(screen.getByRole('menuitemcheckbox', { name: 'Eleman adları' })).toBeInTheDocument()
    // Izgara İKİ görünümde de var.
    expect(screen.getByRole('menuitemcheckbox', { name: 'Izgara' })).toBeInTheDocument()
    // Mimariye özel maddeler tesisatta YOK.
    expect(screen.queryByRole('menuitemcheckbox', { name: 'Oda adları' })).not.toBeInTheDocument()
  })

  it('menüdeki madde tıklanınca ilgili bayrak değişir', async () => {
    render(<FloatingToolbar onGoToFloor={vi.fn()} />)
    const before = useUiStore.getState().isRoomNamesVisible

    await userEvent.click(screen.getByRole('button', { name: /Görünüm/ }))
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Oda adları' }))

    expect(useUiStore.getState().isRoomNamesVisible).toBe(!before)
  })

  it('kapı/pencere ölçüleri maddesi bayrağı çevirir', async () => {
    useUiStore.setState({ isDimensionsVisible: true, isOpeningDimensionsVisible: true })
    render(<FloatingToolbar onGoToFloor={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /Görünüm/ }))
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Kapı/pencere ölçüleri' }))

    expect(useUiStore.getState().isOpeningDimensionsVisible).toBe(false)
  })

  it('ölçüler KAPALIYKEN de kapı/pencere maddesi çalışır (K76)', async () => {
    // İki anahtar bağımsız: kullanıcı yalnız açıklık genişliklerini görmek
    // isteyebilir, bunun için duvar ölçülerini açmak zorunda kalmamalı.
    useUiStore.setState({ isDimensionsVisible: false, isOpeningDimensionsVisible: false })
    render(<FloatingToolbar onGoToFloor={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /Görünüm/ }))
    const item = screen.getByRole('menuitemcheckbox', { name: 'Kapı/pencere ölçüleri' })
    expect(item).toBeEnabled()

    await userEvent.click(item)

    expect(useUiStore.getState().isOpeningDimensionsVisible).toBe(true)
    // Duvar ölçüleri anahtarı bundan ETKİLENMEZ.
    expect(useUiStore.getState().isDimensionsVisible).toBe(false)
  })

  it('açılar maddesi bayrağı çevirir ve diğer katmanlara dokunmaz', async () => {
    useUiStore.setState({ isCornerAnglesVisible: false, isDimensionsVisible: false })
    render(<FloatingToolbar onGoToFloor={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /Görünüm/ }))
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Açılar' }))

    expect(useUiStore.getState().isCornerAnglesVisible).toBe(true)
    expect(useUiStore.getState().isDimensionsVisible).toBe(false)
  })

  it('kapı/pencere ölçüleri maddesi tesisatta YOK', async () => {
    useUiStore.setState({ activeViewId: 'installation' })
    render(<FloatingToolbar onGoToFloor={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /Görünüm/ }))

    expect(
      screen.queryByRole('menuitemcheckbox', { name: 'Kapı/pencere ölçüleri' }),
    ).not.toBeInTheDocument()
  })
})

describe('FloatingToolbar — kat seçici', () => {
  it('açılır tüm katları listeler ve seçim aktif katı değiştirir', async () => {
    render(<FloatingToolbar onGoToFloor={vi.fn()} />)

    // Düğmenin erişilebilir adı GÖRÜNEN metin (aktif kat adı); `title` yalnız
    // ipucu. Ekran okuyucu "Zemin Kat, menü" duyar, ki doğrusu bu.
    await userEvent.click(screen.getByRole('button', { name: 'Zemin Kat' }))
    await userEvent.click(screen.getByRole('menuitemradio', { name: /1\. Kat/ }))

    expect(useCadStore.getState().activeFloorId).toBe(UPPER_FLOOR_ID)
  })
})
