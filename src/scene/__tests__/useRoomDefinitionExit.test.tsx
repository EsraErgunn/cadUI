import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useArchitectureUiStore } from '../../store/architectureUiStore'
import { publishDrawSurfaceEvent } from '../drawSurfaceEvents'
import { useRoomDefinitionExit } from '../useRoomDefinitionExit'

/** Tuvale basma; bu kural için konumun önemi yok, tuş numarası belirleyici. */
function pressOnCanvas(button: number) {
  publishDrawSurfaceEvent('onPointerDown', {
    planPoint: { x: 0, y: 0 },
    button,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
  })
}

beforeEach(() => {
  useArchitectureUiStore.getState().stopRoomDefinition()
})

describe('useRoomDefinitionExit', () => {
  it('sol tık kipten çıkarır', () => {
    renderHook(() => useRoomDefinitionExit())
    useArchitectureUiStore.getState().startRoomDefinition([1, 2])

    pressOnCanvas(0)

    expect(useArchitectureUiStore.getState().roomDefinitionQueue).toBeNull()
  })

  it('orta tuş çıkarmaz — o kaydırma jesti', () => {
    renderHook(() => useRoomDefinitionExit())
    useArchitectureUiStore.getState().startRoomDefinition([1, 2])

    pressOnCanvas(1)

    expect(useArchitectureUiStore.getState().roomDefinitionQueue).not.toBeNull()
  })

  it('sağ tık çıkarmaz — o araçtan çıkma jesti (K84)', () => {
    renderHook(() => useRoomDefinitionExit())
    useArchitectureUiStore.getState().startRoomDefinition([1, 2])

    pressOnCanvas(2)

    expect(useArchitectureUiStore.getState().roomDefinitionQueue).not.toBeNull()
  })

  it('kip kapalıyken tıklama bir şey bozmaz', () => {
    renderHook(() => useRoomDefinitionExit())

    pressOnCanvas(0)

    expect(useArchitectureUiStore.getState().roomDefinitionQueue).toBeNull()
  })
})
