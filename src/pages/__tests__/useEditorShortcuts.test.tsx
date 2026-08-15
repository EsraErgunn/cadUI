import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resetPlumbingHistory } from '../../plumbing/store/plumbingHistory'
import { INITIAL_PLUMBING_DATA } from '../../plumbing/store/plumbingSlice'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { useEditorShortcuts } from '../useEditorShortcuts'

type HarnessHandlers = {
  onSave: () => void
  onOpenFloorManagement: () => void
  onOpenFloorCopy: () => void
  onGoToFloor: (direction: 'up' | 'down') => void
}

/**
 * Mimari geçmişe adım yazan en küçük değişiklik. `revision` artırmak YETMEZ:
 * kirli işareti K71'den beri geçmişin dışında, izlenen tek şey çizim verisi.
 */
function addTrackedPoint(): void {
  useCadStore.setState((state) => ({
    points: [...state.points, { id: 1, floorId: 1, x: 0, y: 0 }],
  }))
}

function Harness(handlers: HarnessHandlers) {
  useEditorShortcuts(handlers)
  // Kısayolun metin kutusunda susmasını sınamak için bir giriş alanı da var.
  return <input aria-label="not" />
}

function renderHarness(onSave = vi.fn()) {
  const handlers: HarnessHandlers = {
    onSave,
    onOpenFloorManagement: vi.fn(),
    onOpenFloorCopy: vi.fn(),
    onGoToFloor: vi.fn(),
  }
  render(<Harness {...handlers} />)
  return onSave
}

function renderFloorHarness() {
  const handlers: HarnessHandlers = {
    onSave: vi.fn(),
    onOpenFloorManagement: vi.fn(),
    onOpenFloorCopy: vi.fn(),
    onGoToFloor: vi.fn(),
  }
  render(<Harness {...handlers} />)
  return handlers
}

beforeEach(() => {
  // Önce yaz sonra temizle: ters sırada bu setState geçmişe bir adım bırakırdı.
  useCadStore.setState({ revision: 0, savedRevision: 0, points: [], ...INITIAL_PLUMBING_DATA })
  useCadStore.temporal.getState().clear()
  resetPlumbingHistory(INITIAL_PLUMBING_DATA)
  useUiStore.setState({ activeViewId: 'architecture' })
})

describe('useEditorShortcuts', () => {
  it('Ctrl+S kaydeder (KK-16)', async () => {
    const user = userEvent.setup()
    const onSave = renderHarness()

    await user.keyboard('{Control>}s{/Control}')

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('Cmd+S de kaydeder', async () => {
    const user = userEvent.setup()
    const onSave = renderHarness()

    await user.keyboard('{Meta>}s{/Meta}')

    expect(onSave).toHaveBeenCalledTimes(1)
  })

  it('metin kutusundayken kısayol susar', async () => {
    // Kullanıcı yazı yazarken Ctrl+S sayfayı değil metni ilgilendirir.
    const user = userEvent.setup()
    const onSave = renderHarness()

    await user.click(screen.getByRole('textbox', { name: 'not' }))
    await user.keyboard('{Control>}s{/Control}')

    expect(onSave).not.toHaveBeenCalled()
  })

  it('Ctrl+Z geri alır', async () => {
    const user = userEvent.setup()
    renderHarness()
    addTrackedPoint()

    await user.keyboard('{Control>}z{/Control}')

    expect(useCadStore.getState().points).toHaveLength(0)
  })

  it('Ctrl+Shift+Z yineler', async () => {
    const user = userEvent.setup()
    renderHarness()
    addTrackedPoint()

    await user.keyboard('{Control>}z{/Control}')
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')

    expect(useCadStore.getState().points).toHaveLength(1)
  })

  it('Ctrl+Y de yineler', async () => {
    const user = userEvent.setup()
    renderHarness()
    addTrackedPoint()

    await user.keyboard('{Control>}z{/Control}')
    await user.keyboard('{Control>}y{/Control}')

    expect(useCadStore.getState().points).toHaveLength(1)
  })

  it('tesisat görünümünde Ctrl+Z tesisat elemanını geri alır', async () => {
    const user = userEvent.setup()
    renderHarness()
    useUiStore.setState({ activeViewId: 'installation' })
    useCadStore.getState().addElement({ type: 'valve', position: { x: 0, y: 0 } })

    await user.keyboard('{Control>}z{/Control}')

    expect(useCadStore.getState().installationElements).toHaveLength(0)
  })

  it('tesisat görünümünde Ctrl+Z mimari geçmişine dokunmaz', async () => {
    // Aynı tuşu iki dinleyici yakalasaydı tek Ctrl+Z iki geçmişi birden gezerdi.
    const user = userEvent.setup()
    renderHarness()
    addTrackedPoint()
    useUiStore.setState({ activeViewId: 'installation' })

    await user.keyboard('{Control>}z{/Control}')

    expect(useCadStore.getState().points).toHaveLength(1)
  })

  it('mimari görünümünde Ctrl+Z tesisat elemanını geri almaz', async () => {
    const user = userEvent.setup()
    renderHarness()
    useUiStore.setState({ activeViewId: 'installation' })
    useCadStore.getState().addElement({ type: 'valve', position: { x: 0, y: 0 } })
    useUiStore.setState({ activeViewId: 'architecture' })

    await user.keyboard('{Control>}z{/Control}')

    expect(useCadStore.getState().installationElements).toHaveLength(1)
  })

  it('tesisat görünümünde Ctrl+Y tesisat adımını yineler', async () => {
    const user = userEvent.setup()
    renderHarness()
    useUiStore.setState({ activeViewId: 'installation' })
    useCadStore.getState().addElement({ type: 'valve', position: { x: 0, y: 0 } })

    await user.keyboard('{Control>}z{/Control}')
    await user.keyboard('{Control>}y{/Control}')

    expect(useCadStore.getState().installationElements).toHaveLength(1)
  })

  it('düz S tuşu hiçbir şey yapmaz', async () => {
    const user = userEvent.setup()
    const onSave = renderHarness()

    await user.keyboard('s')

    expect(onSave).not.toHaveBeenCalled()
  })
})

describe('kat kısayolları (madde 1)', () => {
  it('Ctrl+K kat yönetimini, Ctrl+Shift+K kopyalamayı açar', async () => {
    const handlers = renderFloorHarness()

    await userEvent.keyboard('{Control>}k{/Control}')
    expect(handlers.onOpenFloorManagement).toHaveBeenCalledTimes(1)

    await userEvent.keyboard('{Control>}{Shift>}k{/Shift}{/Control}')
    expect(handlers.onOpenFloorCopy).toHaveBeenCalledTimes(1)
  })

  it('Page Up / Page Down aktif katı değiştirir — değiştirici tuş İSTEMEZ', async () => {
    const handlers = renderFloorHarness()

    await userEvent.keyboard('{PageUp}')
    await userEvent.keyboard('{PageDown}')

    expect(handlers.onGoToFloor).toHaveBeenNthCalledWith(1, 'up')
    expect(handlers.onGoToFloor).toHaveBeenNthCalledWith(2, 'down')
  })

  it('metin kutusunda kat kısayolu ÇALIŞMAZ', async () => {
    const handlers = renderFloorHarness()

    await userEvent.click(screen.getByRole('textbox', { name: 'not' }))
    await userEvent.keyboard('{PageUp}')
    await userEvent.keyboard('{Control>}k{/Control}')

    expect(handlers.onGoToFloor).not.toHaveBeenCalled()
    expect(handlers.onOpenFloorManagement).not.toHaveBeenCalled()
  })
})
