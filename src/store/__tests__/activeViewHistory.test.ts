import { beforeEach, describe, expect, it } from 'vitest'

import { resetArchitectureState, WALL_ID } from './architectureFixture'
import { resetPlumbingHistory } from '../../plumbing/store/plumbingHistory'
import { redoActiveView, undoActiveView } from '../activeViewHistory'
import { useCadStore } from '../cadStore'
import { useUiStore } from '../uiStore'

const EMPTY_PLUMBING = {
  installationElements: [],
  installationLines: [],
  installationConnections: [],
}

function addWallOpening(): void {
  useCadStore.getState().addOpening({ wallId: WALL_ID, offsetCm: 100, widthCm: 90, type: 'door' })
}

function addPlumbingElement(): void {
  useCadStore.getState().addElement({ type: 'valve', position: { x: 0, y: 0 } })
}

beforeEach(() => {
  resetArchitectureState()
  useCadStore.temporal.getState().clear()
  // Tesisat aynası modül düzeyinde global: temizlenmezse bir testin adımı
  // diğerinin geri almasına düşer.
  useCadStore.setState(EMPTY_PLUMBING)
  resetPlumbingHistory(EMPTY_PLUMBING)
  useUiStore.getState().setActiveView('architecture')
})

describe('aktif görünümün geçmişi', () => {
  it('tesisat görünümünde tesisat adımını geri alır, mimariye dokunmaz', () => {
    addWallOpening()
    const openingCount = useCadStore.getState().openings.length
    addPlumbingElement()

    useUiStore.getState().setActiveView('installation')
    undoActiveView()

    expect(useCadStore.getState().installationElements).toHaveLength(0)
    expect(useCadStore.getState().openings).toHaveLength(openingCount)
  })

  it('tesisat görünümünde geri alınanı yineler', () => {
    addPlumbingElement()

    useUiStore.getState().setActiveView('installation')
    undoActiveView()
    redoActiveView()

    expect(useCadStore.getState().installationElements).toHaveLength(1)
  })

  it('mimari görünümde mimari adımını geri alır', () => {
    const openingCount = useCadStore.getState().openings.length
    addWallOpening()

    undoActiveView()

    expect(useCadStore.getState().openings).toHaveLength(openingCount)
  })

  // İzometrikte düzenleme yok; kısayol yine de bir yere gitmeli — proje geçmişi.
  it('izometrik görünümde proje geçmişine düşer', () => {
    const openingCount = useCadStore.getState().openings.length
    addWallOpening()

    useUiStore.getState().setActiveView('isometric')
    undoActiveView()

    expect(useCadStore.getState().openings).toHaveLength(openingCount)
  })
})
