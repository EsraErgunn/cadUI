import { beforeEach, describe, expect, it } from 'vitest'

import { resetArchitectureState, WALL_ID } from './architectureFixture'
import { resetPlumbingHistory } from '../../plumbing/store/plumbingHistory'
import { redoActiveView, undoActiveView } from '../activeViewHistory'
import { useCadStore } from '../cadStore'
import { useUiStore } from '../uiStore'

/** Yüklenen projede zaten duran tesisat elemanı (K148 gerilemesi). */
const LOADED_ELEMENT_ID = 900

const EMPTY_PLUMBING = {
  installationElements: [],
  installationLines: [],
  installationConnections: [],
  floorPipeLinks: [],
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

  /**
   * İzometrikteki her düzenleme (dal ayırma, etiket taşıma, sıfırlama)
   * `installationLines`/`Elements` üstünde çalışıyor ve tesisat aynasına
   * yazılıyor. Proje geçmişine bağlansaydı izometrikte Ctrl+Z kullanıcının en
   * son çizdiği DUVARI geri alırdı.
   */
  it('izometrik görünümde TESİSAT geçmişine gider, mimariye DOKUNMAZ', () => {
    addWallOpening()
    const openingCount = useCadStore.getState().openings.length
    addPlumbingElement()
    const elementCount = useCadStore.getState().installationElements.length

    useUiStore.getState().setActiveView('isometric')
    undoActiveView()

    expect(useCadStore.getState().installationElements).toHaveLength(elementCount - 1)
    expect(useCadStore.getState().openings).toHaveLength(openingCount)
  })
})

/**
 * Tesisat geçmişi aynası cadStore'un yükleme/temizleme yollarından geçmiyordu:
 * proje açıldıktan sonraki İLK tesisat düzenlemesinde zundo "önceki durum" diye
 * BOŞ aynayı geçmişe itiyor ve Ctrl+Z tüm tesisatı siliyordu (kullanıcı bulgusu).
 */
describe('tesisat geçmişi aynası yüklemede tohumlanır', () => {

  function projectWithInstallation() {
    return {
      ...useCadStore.getState(),
      nextUniqueId: 1000,
      installationElements: [
        {
          id: LOADED_ELEMENT_ID,
          floorId: useCadStore.getState().activeFloorId,
          type: 'valve' as const,
          position: { x: 10, y: 10 },
          angleDeg: 0,
          scale: 1,
        },
      ],
      installationLines: [],
      installationConnections: [],
      floorPipeLinks: [],
    }
  }

  it('yüklenen tesisat, ilk düzenlemeden sonra geri alınınca KAYBOLMAZ', () => {
    useCadStore.getState().loadProject(projectWithInstallation())
    useUiStore.getState().setActiveView('installation')

    // Projedeki İLK tesisat düzenlemesi.
    addPlumbingElement()
    expect(useCadStore.getState().installationElements).toHaveLength(2)

    undoActiveView()

    // Yüklenen eleman geri gelmeli; eskiden burası 0 oluyordu.
    expect(useCadStore.getState().installationElements).toHaveLength(1)
    expect(useCadStore.getState().installationElements[0].id).toBe(LOADED_ELEMENT_ID)
  })

  it('çizimi temizlemek tek adımda geri alınır', () => {
    useCadStore.getState().loadProject(projectWithInstallation())
    useUiStore.getState().setActiveView('installation')

    useCadStore.getState().clearProjectDrawing()
    expect(useCadStore.getState().installationElements).toHaveLength(0)

    undoActiveView()

    expect(useCadStore.getState().installationElements).toHaveLength(1)
  })
})
