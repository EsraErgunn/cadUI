import { beforeEach, describe, expect, it } from 'vitest'

import { resetArchitectureState, WALL_ID, WINDOW_ID } from './architectureFixture'
import { createGroundFloor } from '../../core/floors'
import { redoProject, selectIsProjectDirty, undoProject, useCadStore } from '../cadStore'
import { HISTORY_LIMIT } from '../history'

function temporal() {
  return useCadStore.temporal.getState()
}

beforeEach(() => {
  resetArchitectureState()
  // setState geçmişe yazıyor; her test sıfır adımdan başlasın.
  temporal().clear()
})

describe('geri al / yinele', () => {
  it('eklenen açıklığı geri alır ve yineler', () => {
    useCadStore.getState().addOpening({ wallId: WALL_ID, offsetCm: 100, widthCm: 90, type: 'door' })
    expect(useCadStore.getState().openings).toHaveLength(2)

    undoProject()
    expect(useCadStore.getState().openings).toHaveLength(1)

    redoProject()
    expect(useCadStore.getState().openings).toHaveLength(2)
  })

  it('taşımayı geri alır', () => {
    useCadStore.getState().moveOpening(WINDOW_ID, { wallId: WALL_ID, offsetCm: 120 })

    undoProject()

    expect(useCadStore.getState().openings[0]?.offsetCm).toBe(250)
  })

  it('adımları tek tek geri alır', () => {
    const { addOpening, removeOpening } = useCadStore.getState()
    addOpening({ wallId: WALL_ID, offsetCm: 100, widthCm: 90, type: 'door' })
    removeOpening(WINDOW_ID)
    expect(useCadStore.getState().openings).toHaveLength(1)

    undoProject()
    expect(useCadStore.getState().openings).toHaveLength(2)

    undoProject()
    expect(useCadStore.getState().openings).toHaveLength(1)
    expect(useCadStore.getState().openings[0]?.id).toBe(WINDOW_ID)
  })

  it('REDDEDİLEN action geçmişe adım yazmaz', () => {
    // K13: geçersiz taşıma reddedilir. set() yine de çalışıyor ama hiçbir şeye
    // dokunmuyor; equality kontrolü olmasa Ctrl+Z burada boşa basardı.
    expect(useCadStore.getState().moveOpening(WINDOW_ID, { wallId: WALL_ID, offsetCm: 470 })).toBe(
      false,
    )

    expect(temporal().pastStates).toHaveLength(0)
  })

  it('kaydedilen noktaya geri alınca proje TEMİZ olur', () => {
    // Eskiden kirlilik `revision` sayacına bakıyordu ve sayaç geri alınmıyor
    // (K71). Sonuç: çizimi kaydedilenle birebir aynı hâle getiren kullanıcı
    // yine de kaydetme uyarısı alıyordu. Artık İÇERİK karşılaştırılıyor.
    useCadStore.getState().markSaved()
    useCadStore.getState().addOpening({ wallId: WALL_ID, offsetCm: 100, widthCm: 90, type: 'door' })
    expect(selectIsProjectDirty(useCadStore.getState())).toBe(true)

    undoProject()

    expect(selectIsProjectDirty(useCadStore.getState())).toBe(false)
    // Sayaç yine de ileride: anlamı "bir action yazdı", kirlilik değil.
    expect(useCadStore.getState().revision).toBeGreaterThan(0)
  })

  it('kaydedilmemiş TESİSAT işi mimari geri almayla gizlenmez (K71)', () => {
    // K71'in asıl koruduğu şey: mimari geçmişi tesisatı kapsamıyor, o yüzden
    // mimaride Ctrl+Z yapmak kaydedilmemiş tesisat işini "temiz" göstermemeli.
    // İçerik anlık görüntüsü tesisat dizilerini de taşıdığı için gösteremiyor.
    useCadStore.getState().markSaved()
    useCadStore.getState().addOpening({ wallId: WALL_ID, offsetCm: 100, widthCm: 90, type: 'door' })
    useCadStore.getState().addElement({ type: 'valve', position: { x: 0, y: 0 } })

    undoProject()

    expect(selectIsProjectDirty(useCadStore.getState())).toBe(true)
  })

  it('geri alma id sayacını geriye DÜŞÜRMEZ (K71)', () => {
    // Sayaç geri alınsaydı silinen açıklığın id'si ikinci kez üretilirdi —
    // knowledge/id-scheme.md'nin "bir kez üretilir" kuralının ihlali.
    const counterBefore = useCadStore.getState().nextUniqueId
    useCadStore.getState().addOpening({ wallId: WALL_ID, offsetCm: 100, widthCm: 90, type: 'door' })

    undoProject()

    expect(useCadStore.getState().nextUniqueId).toBeGreaterThan(counterBefore)
  })

  it('tesisat düzenlemesi mimari geçmişe adım yazmaz (K71)', () => {
    // Boş adım kalırsa mimaride Ctrl+Z görünürde hiçbir şey yapmaz.
    useCadStore.getState().addElement({ type: 'valve', position: { x: 0, y: 0 } })

    expect(temporal().pastStates).toHaveLength(0)
  })

  it('kaydetmek geçmişe adım yazmaz', () => {
    // markSaved yalnız savedContent'e dokunuyor: o alan izlenmiyor.
    useCadStore.getState().markSaved()

    expect(temporal().pastStates).toHaveLength(0)
  })

  it('yeni bir işlem yinele yığınını temizler', () => {
    const { addOpening } = useCadStore.getState()
    addOpening({ wallId: WALL_ID, offsetCm: 100, widthCm: 90, type: 'door' })
    undoProject()
    expect(temporal().futureStates).toHaveLength(1)

    addOpening({ wallId: WALL_ID, offsetCm: 400, widthCm: 90, type: 'door' })

    expect(temporal().futureStates).toHaveLength(0)
  })

  it('proje yüklemek geçmişi sıfırlar', () => {
    // Aksi halde Ctrl+Z kullanıcıyı ÖNCEKİ projenin çizimine götürürdü.
    useCadStore.getState().addOpening({ wallId: WALL_ID, offsetCm: 100, widthCm: 90, type: 'door' })
    expect(temporal().pastStates.length).toBeGreaterThan(0)

    useCadStore.getState().loadProject({
      nextUniqueId: 2,
      activeFloorId: 1,
      floors: [createGroundFloor()],
      points: [],
      walls: [],
      openings: [],
      rooms: [],
      symbols: [],
      areaObjects: [],
      beams: [],
      texts: [],
      installationElements: [],
      installationLines: [],
      installationConnections: [],
      floorPipeLinks: [],
    })

    expect(temporal().pastStates).toHaveLength(0)
    expect(temporal().futureStates).toHaveLength(0)
  })

  it('geçmiş sınırı aşıldığında en eski adım düşer', () => {
    const { addOpening, removeOpening } = useCadStore.getState()
    for (let step = 0; step < HISTORY_LIMIT + 10; step += 1) {
      const createdId = addOpening({
        wallId: WALL_ID,
        offsetCm: 100,
        widthCm: 90,
        type: 'door',
      })
      if (createdId !== undefined) removeOpening(createdId)
    }

    expect(temporal().pastStates).toHaveLength(HISTORY_LIMIT)
  })
})
