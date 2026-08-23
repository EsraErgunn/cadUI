import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createGroundFloor } from '../../core/floors'
import { DEFAULT_FLOOR_HEIGHT_CM, DEFAULT_FLOOR_ID } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { FloatingToolbar } from '../canvas/FloatingToolbar'

const UPPER_FLOOR_ID = 14

/** Çubuğun üç geri çağrısı da çoğu testte önemsiz; ilgilenen test kendi
 *  casusunu geçirir. */
function renderToolbar(overrides: Partial<React.ComponentProps<typeof FloatingToolbar>> = {}) {
  return render(
    <FloatingToolbar
      onGoToFloor={vi.fn()}
      onOpenFloorManagement={vi.fn()}
      onOpenFloorCopy={vi.fn()}
      {...overrides}
    />,
  )
}

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
    renderToolbar()

    await userEvent.click(screen.getByRole('button', { name: 'El aracı' }))
    expect(useUiStore.getState().isPanModeActive).toBe(true)

    await userEvent.click(screen.getByRole('button', { name: 'Seçim aracı' }))
    expect(useUiStore.getState().isPanModeActive).toBe(false)
  })

  it('geçmiş boşken geri al/yinele pasif', () => {
    useCadStore.temporal.getState().clear()
    renderToolbar()

    expect(screen.getByRole('button', { name: 'Geri al' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Yinele' })).toBeDisabled()
  })
})

/**
 * K57: çubuk iki çizim görünümünde de var; görünüme ÖZEL parçalar dallanıyor.
 */
describe('FloatingToolbar — görünüme göre değişenler', () => {
  it('snap düğmesi YALNIZ mimaride var', () => {
    const { unmount } = renderToolbar()
    expect(screen.getByRole('button', { name: 'Izgaraya yakala' })).toBeInTheDocument()
    unmount()

    useUiStore.setState({ activeViewId: 'installation' })
    renderToolbar()

    expect(screen.queryByRole('button', { name: 'Izgaraya yakala' })).not.toBeInTheDocument()
  })

  it('Görünüm menüsü mimaride nesne/oda adlarını gösterir', async () => {
    renderToolbar()

    await userEvent.click(screen.getByRole('button', { name: /Görünüm/ }))

    expect(screen.getByRole('menuitemcheckbox', { name: 'Nesne adları' })).toBeInTheDocument()
    expect(screen.getByRole('menuitemcheckbox', { name: 'Oda adları' })).toBeInTheDocument()
    // Izgara ÇUBUĞA taşındı (K153): menüde artık yok, aynı anahtar iki yerde durmasın.
    expect(screen.queryByRole('menuitemcheckbox', { name: 'Izgara' })).not.toBeInTheDocument()
  })

  it('Görünüm menüsü tesisatta ölçü/eleman adlarını gösterir', async () => {
    useUiStore.setState({ activeViewId: 'installation' })
    renderToolbar()

    await userEvent.click(screen.getByRole('button', { name: /Görünüm/ }))

    // Boru ölçüsü duvar ölçüsünden AYRI anahtar (K153).
    expect(screen.getByRole('menuitemcheckbox', { name: 'Boru ölçüleri' })).toBeInTheDocument()
    expect(screen.getByRole('menuitemcheckbox', { name: 'Eleman adları' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitemcheckbox', { name: 'Duvar ölçüleri' })).not.toBeInTheDocument()
    // Mimariye özel maddeler tesisatta YOK.
    expect(screen.queryByRole('menuitemcheckbox', { name: 'Oda adları' })).not.toBeInTheDocument()
  })

  it('menüdeki madde tıklanınca ilgili bayrak değişir', async () => {
    renderToolbar()
    const before = useUiStore.getState().isRoomNamesVisible

    await userEvent.click(screen.getByRole('button', { name: /Görünüm/ }))
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Oda adları' }))

    expect(useUiStore.getState().isRoomNamesVisible).toBe(!before)
  })

  it('kapı/pencere ölçüleri maddesi bayrağı çevirir', async () => {
    useUiStore.setState({ isDimensionsVisible: true, isOpeningDimensionsVisible: true })
    renderToolbar()

    await userEvent.click(screen.getByRole('button', { name: /Görünüm/ }))
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Kapı/pencere ölçüleri' }))

    expect(useUiStore.getState().isOpeningDimensionsVisible).toBe(false)
  })

  it('ölçüler KAPALIYKEN de kapı/pencere maddesi çalışır (K76)', async () => {
    // İki anahtar bağımsız: kullanıcı yalnız açıklık genişliklerini görmek
    // isteyebilir, bunun için duvar ölçülerini açmak zorunda kalmamalı.
    useUiStore.setState({ isDimensionsVisible: false, isOpeningDimensionsVisible: false })
    renderToolbar()

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
    renderToolbar()

    await userEvent.click(screen.getByRole('button', { name: /Görünüm/ }))
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Açılar' }))

    expect(useUiStore.getState().isCornerAnglesVisible).toBe(true)
    expect(useUiStore.getState().isDimensionsVisible).toBe(false)
  })

  it('kapı/pencere ölçüleri maddesi tesisatta YOK', async () => {
    useUiStore.setState({ activeViewId: 'installation' })
    renderToolbar()

    await userEvent.click(screen.getByRole('button', { name: /Görünüm/ }))

    expect(
      screen.queryByRole('menuitemcheckbox', { name: 'Kapı/pencere ölçüleri' }),
    ).not.toBeInTheDocument()
  })
})

describe('FloatingToolbar — kat seçici', () => {
  // Düğmenin erişilebilir adı hem etiketi hem aktif katı söyler; görünen metin
  // artık aktif kat adı + sayı (ör. "Zemin Kat 2"), hangi kattayız her an okunsun diye.
  const floorButtonName = /^Katlar, aktif kat/

  it('açılır tüm katları listeler ve seçim aktif katı değiştirir', async () => {
    renderToolbar()

    await userEvent.click(screen.getByRole('button', { name: floorButtonName }))
    await userEvent.click(screen.getByRole('menuitemradio', { name: /1\. Kat/ }))

    expect(useCadStore.getState().activeFloorId).toBe(UPPER_FLOOR_ID)
  })

  it('oklar komşu kata götürür, uçtaki yön pasif', async () => {
    // Geçiş döngüsel değil (floors.ts sözleşmesi): zemin kattayken aşağısı yok.
    const onGoToFloor = vi.fn()
    renderToolbar({ onGoToFloor })

    expect(screen.getByRole('button', { name: 'Alt kata geç' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Üst kata geç' }))
    expect(onGoToFloor).toHaveBeenCalledWith('up')
  })

  it('düğmede aktif kat adı ve kat sayısı yazar', () => {
    renderToolbar()

    expect(screen.getByRole('button', { name: floorButtonName })).toHaveTextContent('Zemin Kat2')
  })

  it('kat yönetimi ve kat kopyalama açılırdan açılır', async () => {
    // Üst bardaki "Katlar" menüsü kalkınca bu iki pencerenin tek girişi burası.
    const onOpenFloorManagement = vi.fn()
    const onOpenFloorCopy = vi.fn()
    renderToolbar({ onOpenFloorManagement, onOpenFloorCopy })

    await userEvent.click(screen.getByRole('button', { name: floorButtonName }))
    await userEvent.click(screen.getByRole('menuitem', { name: /Kat Yönetimi/ }))
    expect(onOpenFloorManagement).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: floorButtonName }))
    await userEvent.click(screen.getByRole('menuitem', { name: /Kat Kopyalama/ }))
    expect(onOpenFloorCopy).toHaveBeenCalledTimes(1)
  })

  it('ızgara düğmesi çubukta ve İKİ görünümde de var (K153)', async () => {
    renderToolbar()
    expect(screen.getByRole('button', { name: 'Izgarayı göster' })).toBeInTheDocument()

    useUiStore.setState({ activeViewId: 'installation' })
    renderToolbar()
    expect(screen.getAllByRole('button', { name: 'Izgarayı göster' }).length).toBeGreaterThan(0)
  })

  it('ızgara düğmesi bayrağı çevirir', async () => {
    useUiStore.setState({ isGridVisible: true })
    renderToolbar()

    await userEvent.click(screen.getByRole('button', { name: 'Izgarayı göster' }))

    expect(useUiStore.getState().isGridVisible).toBe(false)
  })

  it('boru ölçüsü duvar ölçüsünden BAĞIMSIZ (K153)', async () => {
    useUiStore.setState({ activeViewId: 'installation', isDimensionsVisible: true, isPipeLengthsVisible: true })
    renderToolbar()

    await userEvent.click(screen.getByRole('button', { name: /Görünüm/ }))
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Boru ölçüleri' }))

    expect(useUiStore.getState().isPipeLengthsVisible).toBe(false)
    // Duvar ölçüleri ETKİLENMEZ — eskiden tek bayraktı.
    expect(useUiStore.getState().isDimensionsVisible).toBe(true)
  })

  it('boru ölçüsü MİMARİDE de var — tesisatı oradan yöneten tek anahtar (K153)', async () => {
    renderToolbar()

    await userEvent.click(screen.getByRole('button', { name: /Görünüm/ }))

    expect(screen.getByRole('menuitemcheckbox', { name: 'Boru ölçüleri' })).toBeInTheDocument()
  })

  it('iki menüdeki boru ölçüsü AYNI bayrağı yönetir', async () => {
    useUiStore.setState({ isPipeLengthsVisible: true })
    renderToolbar()

    // Mimariden kapat.
    await userEvent.click(screen.getByRole('button', { name: /Görünüm/ }))
    await userEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Boru ölçüleri' }))

    expect(useUiStore.getState().isPipeLengthsVisible).toBe(false)
  })
})
