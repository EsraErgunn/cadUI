import { beforeEach, describe, expect, it } from 'vitest'

import { useUiStore } from '../uiStore'

/** Store modül düzeyinde global; her test kendi başlangıcını kurar. */
const INITIAL = useUiStore.getState()

beforeEach(() => {
  useUiStore.setState({
    activeViewId: 'architecture',
    isDimensionsVisible: INITIAL.isDimensionsVisible,
    isRoomNamesVisible: INITIAL.isRoomNamesVisible,
    isOpeningDimensionsVisible: INITIAL.isOpeningDimensionsVisible,
    isCornerAnglesVisible: INITIAL.isCornerAnglesVisible,
    isAreaObjectNamesVisible: INITIAL.isAreaObjectNamesVisible,
    isDeviceNamesVisible: INITIAL.isDeviceNamesVisible,
    isPipeLengthsVisible: INITIAL.isPipeLengthsVisible,
    isGridVisible: true,
  })
})

/**
 * Mimari açılış kadrajı (kullanıcı kararı): plan ilk açıldığında okunabilir
 * olmalı, katmanları kapatmakla başlanmamalı.
 */
describe('mimari görünüm varsayılanları', () => {
  it('YALNIZ duvar ölçüleri ve oda adları açık başlar', () => {
    expect(INITIAL.isDimensionsVisible).toBe(true)
    expect(INITIAL.isRoomNamesVisible).toBe(true)
  })

  it('kalan mimari katmanlar KAPALI başlar', () => {
    expect(INITIAL.isOpeningDimensionsVisible).toBe(false)
    expect(INITIAL.isCornerAnglesVisible).toBe(false)
    expect(INITIAL.isAreaObjectNamesVisible).toBe(false)
    expect(INITIAL.isDeviceNamesVisible).toBe(false)
    // ⚠️ Tesisatla PAYLAŞILAN bayrak (K153): mimari açılışı temiz olsun diye
    // kapalı, bedeli tesisatın da kapalı açılması.
    expect(INITIAL.isPipeLengthsVisible).toBe(false)
  })
})

describe('ızgara görünüm geçişinde korunur (K153)', () => {
  it('mimaride kapatılan ızgara tesisata gidip dönünce KAPALI kalır', () => {
    useUiStore.getState().toggleGridVisible()
    expect(useUiStore.getState().isGridVisible).toBe(false)

    useUiStore.getState().setActiveView('installation')
    useUiStore.getState().setActiveView('architecture')

    // Eskiden burada true olurdu: geçiş kullanıcının kararını eziyordu.
    expect(useUiStore.getState().isGridVisible).toBe(false)
  })

  it('açık bırakılan ızgara tesisatta da açık kalır', () => {
    useUiStore.getState().setActiveView('installation')

    expect(useUiStore.getState().isGridVisible).toBe(true)
  })
})
