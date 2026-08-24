import { beforeEach, describe, expect, it } from 'vitest'

import type { SketchStroke } from '../../core/sketchStroke'
import { undoActiveView, redoActiveView } from '../activeViewHistory'
import { useCadStore } from '../cadStore'
import { markSketchAction } from '../sketchHistory'
import { useUiStore } from '../uiStore'

const FLOOR_ID = 1

function stroke(id: number): SketchStroke {
  return {
    id,
    floorId: FLOOR_ID,
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
  }
}

/** Kroki ekler ve sıralama damgasını da vurur — araç hook'unun yaptığının aynısı. */
function drawStroke(id: number) {
  useUiStore.getState().addSketchStroke(stroke(id))
  markSketchAction()
}

/** Çizim tarafında bir düzenleme: `revision` artınca saat çizime damgalanır. */
function drawWall() {
  useCadStore.setState({ revision: useCadStore.getState().revision + 1 })
}

beforeEach(() => {
  useUiStore.setState({
    activeViewId: 'architecture',
    sketchStrokes: [],
    sketchUndoStack: [],
    sketchRedoStack: [],
  })
})

describe('serbest çizimde geri al / yinele', () => {
  it('Ctrl+Z son darbeyi kaldırır', () => {
    drawStroke(1)
    drawStroke(2)

    undoActiveView()

    expect(useUiStore.getState().sketchStrokes.map((item) => item.id)).toEqual([1])
  })

  it('yineleme darbeyi geri getirir', () => {
    drawStroke(1)
    undoActiveView()
    redoActiveView()

    expect(useUiStore.getState().sketchStrokes.map((item) => item.id)).toEqual([1])
  })

  it('SİLGİ de geri alınabilir', () => {
    // İşlem tutuluyor, anlık görüntü değil: "silindi"nin tersi "geri koy".
    drawStroke(1)
    useUiStore.getState().removeSketchStroke(1)
    markSketchAction()
    expect(useUiStore.getState().sketchStrokes).toHaveLength(0)

    undoActiveView()
    expect(useUiStore.getState().sketchStrokes.map((item) => item.id)).toEqual([1])
  })

  it('yeni darbe YİNELEME zincirini keser', () => {
    drawStroke(1)
    undoActiveView()
    drawStroke(2)
    redoActiveView()

    // 1 geri gelmemeli: araya yeni bir iş girdi.
    expect(useUiStore.getState().sketchStrokes.map((item) => item.id)).toEqual([2])
  })
})

describe('sıralama: kroki mi çizim mi', () => {
  it('kroki DAHA YENİYSE Ctrl+Z krokiyi alır', () => {
    drawWall()
    drawStroke(1)

    undoActiveView()

    expect(useUiStore.getState().sketchStrokes).toHaveLength(0)
  })

  it('çizim DAHA YENİYSE kroki KORUNUR', () => {
    // Kroki çizip sonra duvar çizen kullanıcı Ctrl+Z'de duvarı geri almalı;
    // krokisi ekranda kalmalı.
    drawStroke(1)
    drawWall()

    undoActiveView()

    expect(useUiStore.getState().sketchStrokes.map((item) => item.id)).toEqual([1])
  })

  it('kroki yığını BOŞALINCA çizime düşer', () => {
    // Duvar → kroki → Ctrl+Z (kroki gider) → Ctrl+Z (artık çizime gitmeli).
    drawWall()
    drawStroke(1)

    undoActiveView()
    expect(useUiStore.getState().sketchUndoStack).toHaveLength(0)

    // İkinci geri alma krokiye GİTMEMELİ: yığın boş.
    undoActiveView()
    expect(useUiStore.getState().sketchStrokes).toHaveLength(0)
  })

  it('TESİSAT görünümünde kroki yığınına HİÇ bakılmaz', () => {
    // Orada geri alma tesisat aynasına gidiyor (K123); kroki mimarinin işi.
    drawStroke(1)
    useUiStore.setState({ activeViewId: 'installation' })

    undoActiveView()

    expect(useUiStore.getState().sketchStrokes.map((item) => item.id)).toEqual([1])
  })
})
