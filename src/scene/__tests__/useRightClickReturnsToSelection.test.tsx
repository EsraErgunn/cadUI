import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { SELECTION_TOOL_ID, WALL_TOOL_ID, type ToolId } from '../../core/tools'
import { useUiStore } from '../../store/uiStore'
import { publishDrawSurfaceEvent } from '../drawSurfaceEvents'
import { useRightClickReturnsToSelection } from '../useRightClickReturnsToSelection'

/** Sağ tık; veri yolu ham olayı taşıyor, konumun bu kural için önemi yok. */
function rightClick() {
  publishDrawSurfaceEvent('onContextMenu', {
    planPoint: { x: 0, y: 0 },
    button: 2,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
  })
}

beforeEach(() => {
  useUiStore.setState({ activeToolId: SELECTION_TOOL_ID })
})

describe('useRightClickReturnsToSelection', () => {
  it('yerleştirme aracından seçime döner', () => {
    renderHook(() => useRightClickReturnsToSelection())
    useUiStore.setState({ activeToolId: 'lighting' })

    rightClick()

    expect(useUiStore.getState().activeToolId).toBe(SELECTION_TOOL_ID)
  })

  it.each<ToolId>(['door', 'window', 'measure', 'text', 'eraser', 'drawRoom', 'stairs'])(
    '%s aracından da çıkar',
    (toolId) => {
      renderHook(() => useRightClickReturnsToSelection())
      useUiStore.setState({ activeToolId: toolId })

      rightClick()

      expect(useUiStore.getState().activeToolId).toBe(SELECTION_TOOL_ID)
    },
  )

  it('DUVAR aracına dokunmaz — orada sağ tıkın kendi işi var (iki adımlı)', () => {
    // Zinciri bitirmek aracı da kapatsaydı arka arkaya duvar çizilemezdi;
    // çıkış kararını `useWallTool` veriyor.
    renderHook(() => useRightClickReturnsToSelection())
    useUiStore.setState({ activeToolId: WALL_TOOL_ID })

    rightClick()

    expect(useUiStore.getState().activeToolId).toBe(WALL_TOOL_ID)
  })

  it('zaten seçimdeyken bir şey yapmaz', () => {
    renderHook(() => useRightClickReturnsToSelection())

    rightClick()

    expect(useUiStore.getState().activeToolId).toBe(SELECTION_TOOL_ID)
  })

  it('hook söküldükten sonra artık dinlemez', () => {
    const { unmount } = renderHook(() => useRightClickReturnsToSelection())
    unmount()
    useUiStore.setState({ activeToolId: 'lighting' })

    rightClick()

    expect(useUiStore.getState().activeToolId).toBe('lighting')
  })
})
