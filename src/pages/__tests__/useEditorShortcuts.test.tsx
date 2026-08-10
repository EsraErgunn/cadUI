import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resetPlumbingHistory } from '../../plumbing/store/plumbingHistory'
import { INITIAL_PLUMBING_DATA } from '../../plumbing/store/plumbingSlice'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { useEditorShortcuts } from '../useEditorShortcuts'

function Harness({ onSave }: { onSave: () => void }) {
  useEditorShortcuts({ onSave })
  // Kısayolun metin kutusunda susmasını sınamak için bir giriş alanı da var.
  return <input aria-label="not" />
}

function renderHarness(onSave = vi.fn()) {
  render(<Harness onSave={onSave} />)
  return onSave
}

beforeEach(() => {
  useCadStore.temporal.getState().clear()
  useCadStore.setState({ revision: 0, savedRevision: 0, ...INITIAL_PLUMBING_DATA })
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
    useCadStore.setState((state) => ({ revision: state.revision + 1 }))

    await user.keyboard('{Control>}z{/Control}')

    expect(useCadStore.getState().revision).toBe(0)
  })

  it('Ctrl+Shift+Z yineler', async () => {
    const user = userEvent.setup()
    renderHarness()
    useCadStore.setState((state) => ({ revision: state.revision + 1 }))

    await user.keyboard('{Control>}z{/Control}')
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')

    expect(useCadStore.getState().revision).toBe(1)
  })

  it('Ctrl+Y de yineler', async () => {
    const user = userEvent.setup()
    renderHarness()
    useCadStore.setState((state) => ({ revision: state.revision + 1 }))

    await user.keyboard('{Control>}z{/Control}')
    await user.keyboard('{Control>}y{/Control}')

    expect(useCadStore.getState().revision).toBe(1)
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
    useCadStore.setState((state) => ({ revision: state.revision + 1 }))
    useUiStore.setState({ activeViewId: 'installation' })

    await user.keyboard('{Control>}z{/Control}')

    expect(useCadStore.getState().revision).toBe(1)
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
