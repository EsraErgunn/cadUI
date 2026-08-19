import { beforeEach, describe, expect, it } from 'vitest'

import { addWall, resetEmpty } from './roomFixture'
import { useCadStore } from '../cadStore'

/** Kirlilik İÇERİKTEN hesaplanıyor; temiz başlangıç için anlık görüntü tazelenir. */
function drawAndSave() {
  addWall(0, 0, 400, 0)
  addWall(0, 0, 0, 300)
  useCadStore.getState().markSaved()
}

describe('clearProjectDrawing — Projeyi Temizle (K111)', () => {
  beforeEach(resetEmpty)

  it('çizimi boşaltır', () => {
    drawAndSave()
    expect(useCadStore.getState().walls.length).toBeGreaterThan(0)

    useCadStore.getState().clearProjectDrawing()

    const state = useCadStore.getState()
    expect(state.walls).toEqual([])
    expect(state.points).toEqual([])
    expect(state.rooms).toEqual([])
  })

  it('KAT yapısı korunur — kullanıcının kurduğu katlar silinmez', () => {
    drawAndSave()
    const floorsBefore = useCadStore.getState().floors

    useCadStore.getState().clearProjectDrawing()

    expect(useCadStore.getState().floors).toEqual(floorsBefore)
    expect(useCadStore.getState().activeFloorId).toBe(floorsBefore[0].id)
  })

  it('TEK Ctrl+Z ile geri gelir — temizlemek bir düzenlemedir, yeni başlangıç değil', () => {
    drawAndSave()
    const wallsBefore = useCadStore.getState().walls.length

    useCadStore.getState().clearProjectDrawing()
    useCadStore.temporal.getState().undo()

    expect(useCadStore.getState().walls).toHaveLength(wallsBefore)
  })

  it('proje KİRLİ işaretlenir: çıkarken uyarı çıksın, iş sessizce kaybolmasın', () => {
    drawAndSave()
    // Kaydedilmiş hâlde başlıyoruz.
    const clean = useCadStore.getState().savedContent

    useCadStore.getState().clearProjectDrawing()

    // savedContent TAZELENMEZ: diskteki hâl değişmedi, yalnız bellekteki çizim boşaldı.
    expect(useCadStore.getState().savedContent).toBe(clean)
  })

  it('id sayacı GERİ ALINMAZ: silinen id ikinci kez üretilmemeli', () => {
    drawAndSave()
    const counterBefore = useCadStore.getState().nextUniqueId

    useCadStore.getState().clearProjectDrawing()

    expect(useCadStore.getState().nextUniqueId).toBe(counterBefore)
  })
})
