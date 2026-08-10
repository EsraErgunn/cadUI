import { beforeEach, describe, expect, it } from 'vitest'

import {
  createHorizontalLine,
  getFixtureMetadata,
} from '../../plumbing/core/__tests__/symbolFixture'
import {
  resolveFreeEndAttachment,
  resolveNearestLineAttachment,
  resolveOnLineAttachment,
  resolveOnLineSlide,
} from '../../plumbing/core/elementAttach'
import type { InstallationLine } from '../../plumbing/core/installationModel'
import { resetPlumbingHistory } from '../../plumbing/store/plumbingHistory'
import { useCadStore } from '../cadStore'

const LINE_ID = 10
const FIXTURE_NEXT_FREE_ID = 100
const SNAP_RADIUS_CM = 20

function getLine(): InstallationLine {
  const line = useCadStore.getState().installationLines.find((candidate) => candidate.id === LINE_ID)
  if (!line) throw new Error('fikstür hattı kayboldu')
  return line
}

function getInlineElementIds(): (number | undefined)[] {
  return getLine().points.map((point) => point.inlineElementId)
}

function resetState(): void {
  const snapshot = {
    installationElements: [],
    installationLines: [createHorizontalLine(LINE_ID)],
    installationConnections: [],
  }
  useCadStore.setState({
    ...snapshot,
    nextUniqueId: FIXTURE_NEXT_FREE_ID,
    revision: 0,
    savedRevision: 0,
  })
  // Ayna da başlangıç hâline çekilir: yoksa ilk Ctrl+Z'nin döneceği adım olmaz.
  resetPlumbingHistory(snapshot)
}

beforeEach(resetState)

describe('placeOnLineElements', () => {
  function attachAt(x: number, type: 'valve' | 'regulator') {
    const attachment = resolveOnLineAttachment(
      useCadStore.getState().installationLines,
      getFixtureMetadata,
      type,
      { x, y: 0 },
      SNAP_RADIUS_CM,
    )
    if (!attachment) throw new Error('yerleşim çözülemedi')
    useCadStore.getState().placeOnLineElements(attachment)
  }

  it('boruyu ayırır ve doğan düğüme armatürü oturtur', () => {
    attachAt(400, 'valve')

    const state = useCadStore.getState()
    expect(state.installationElements).toHaveLength(1)
    expect(getLine().points.map((point) => point.position.x)).toEqual([0, 400, 1000])
    expect(getInlineElementIds()).toEqual([
      undefined,
      state.installationElements[0].id,
      undefined,
    ])
  })

  it('refakatçileriyle gelen elemanı boru yönünde sırayla yerleştirir', () => {
    attachAt(400, 'regulator')

    const state = useCadStore.getState()
    expect(state.installationElements.map((element) => element.type)).toEqual([
      'valve',
      'manometer',
      'regulator',
      'manometer',
      'valve',
    ])
    // Her armatür kendi düğümünde: beş bölme, beş yeni köşe.
    expect(getLine().points.map((point) => point.position.x)).toEqual([
      0, 341, 374, 400, 426, 459, 1000,
    ])
    expect(getLine().segments).toHaveLength(6)
    expect(getInlineElementIds().filter((id) => id !== undefined)).toHaveLength(5)
  })

  it('beş eleman + beş bölme TEK geçmiş adımıdır', () => {
    attachAt(400, 'regulator')
    useCadStore.getState().undoPlumbing()

    expect(useCadStore.getState().installationElements).toHaveLength(0)
    expect(getLine().points).toHaveLength(2)
  })
})

describe('slideOnLineElement', () => {
  function attachValve(x: number) {
    const attachment = resolveOnLineAttachment(
      useCadStore.getState().installationLines,
      getFixtureMetadata,
      'valve',
      { x, y: 0 },
      SNAP_RADIUS_CM,
    )
    if (!attachment) throw new Error('yerleşim çözülemedi')
    useCadStore.getState().placeOnLineElements(attachment)
  }

  it('düğümü ve elemanı komşu köşeler arasında MUTLAK konuma taşır, boru bölünmez', () => {
    attachValve(400)
    const valveId = useCadStore.getState().installationElements[0].id

    const resolved = resolveOnLineSlide(
      useCadStore.getState().installationLines,
      getFixtureMetadata,
      valveId,
      'valve',
      0,
      { x: 700, y: 40 },
    )
    if (!resolved) throw new Error('kaydırma çözülemedi')
    useCadStore
      .getState()
      .slideOnLineElement(
        resolved.lineId,
        resolved.pointId,
        valveId,
        resolved.nodePosition,
        resolved.elementPosition,
      )

    expect(getLine().points).toHaveLength(3)
    expect(getLine().points[1].position).toEqual({ x: 700, y: 0 })
    expect(useCadStore.getState().installationElements[0].position).toEqual({ x: 700, y: 0 })
  })

  it('yer değişmediyse geçmişe adım yazılmaz', () => {
    attachValve(400)
    const valveId = useCadStore.getState().installationElements[0].id
    const before = getLine().points[1].position

    useCadStore.getState().slideOnLineElement(LINE_ID, getLine().points[1].id, valveId, before, {
      x: before.x,
      y: before.y,
    })

    // Konum değişmedi (no-op yazım).
    expect(getLine().points[1].position).toEqual(before)

    // Kayıt hiç yazılmadıysa TEK Ctrl+Z doğrudan placeOnLineElements'i geri
    // alır — araya sahte bir "yer değiştirmedi" adımı girmez.
    useCadStore.getState().undoPlumbing()
    expect(useCadStore.getState().installationElements).toHaveLength(0)
    expect(getLine().points).toHaveLength(2)
  })
})

describe('placeElementAtLineEnd', () => {
  function attachMeter(x: number) {
    const state = useCadStore.getState()
    const attachment = resolveFreeEndAttachment(
      state.installationLines,
      state.installationConnections,
      getFixtureMetadata,
      'gasMeter',
      { x, y: 0 },
      SNAP_RADIUS_CM,
    )
    if (!attachment) throw new Error('yerleşim çözülemedi')
    return useCadStore.getState().placeElementAtLineEnd(attachment)
  }

  it('hattı uzatır, araya vana koyar ve ucu sayacın girişine bağlar', () => {
    const meterId = attachMeter(1005)

    const state = useCadStore.getState()
    expect(state.installationElements.map((element) => element.type)).toEqual([
      'valve',
      'gasMeter',
    ])
    expect(getLine().points.map((point) => point.position.x)).toEqual([0, 1000, 1026])
    // Vana eski uç düğümünde: artık boru ile sayaç ARASINDA.
    expect(getInlineElementIds()).toEqual([undefined, state.installationElements[0].id, undefined])
    expect(state.installationConnections).toEqual([
      { lineId: LINE_ID, end: 'end', target: { kind: 'port', elementId: meterId, portId: 'in' } },
    ])
  })

  it('dolu uca ikinci sayaç takılmaz', () => {
    attachMeter(1005)

    const state = useCadStore.getState()
    expect(
      resolveFreeEndAttachment(
        state.installationLines,
        state.installationConnections,
        getFixtureMetadata,
        'gasMeter',
        { x: 1055, y: 0 },
        SNAP_RADIUS_CM,
      ),
    ).toBeNull()
  })

  it('sayaç + vana + uzatma TEK geçmiş adımıdır', () => {
    attachMeter(1005)
    useCadStore.getState().undoPlumbing()

    const state = useCadStore.getState()
    expect(state.installationElements).toHaveLength(0)
    expect(state.installationConnections).toHaveLength(0)
    expect(getLine().points).toHaveLength(2)
  })
})

describe('placeElementWithStub', () => {
  // x=1050: hattın (1000,0) ucuna en yakın açık uç — nearestLine artık yalnız
  // BOŞ uçlara bağlanır, borunun ortasına (400,0 gibi) değil.
  function attachStove(y: number) {
    const attachment = resolveNearestLineAttachment(
      useCadStore.getState().installationLines,
      useCadStore.getState().installationConnections,
      getFixtureMetadata,
      'stove',
      { x: 1050, y },
    )
    if (!attachment) throw new Error('yerleşim çözülemedi')
    useCadStore.getState().placeElementWithStub(attachment, 'DN25')
  }

  it('cihaz + kol + kolun dibindeki vanayı birlikte yazar', () => {
    attachStove(300)

    const state = useCadStore.getState()
    expect(state.installationElements.map((element) => element.type)).toEqual(['valve', 'stove'])
    expect(state.installationLines).toHaveLength(2)
    // Kolun iki ucu da bağlı: biri boru düğümüne, diğeri cihazın portuna.
    expect(state.installationConnections).toHaveLength(2)
    expect(state.installationConnections.map((connection) => connection.target.kind)).toEqual([
      'line',
      'port',
    ])
  })

  it('cihaz taşınınca kolun ucu değil, oturduğu düğüm birlikte gelir', () => {
    attachStove(300)

    const state = useCadStore.getState()
    const valve = state.installationElements[0]
    const nodeBefore = getLine().points[1].position

    useCadStore.getState().moveElements([valve.id], { x: 0, y: 50 })

    expect(getLine().points[1].position).toEqual({
      x: nodeBefore.x,
      y: nodeBefore.y + 50,
    })
  })

  it('vana taşınınca kol KOPMAZ — kolun boru ucuna değen ucu da aynı kaymayla gelir', () => {
    attachStove(300)

    const state = useCadStore.getState()
    const valve = state.installationElements[0]
    const stubLine = state.installationLines[1]
    const stubStartBefore = stubLine.points[0].position

    useCadStore.getState().moveElements([valve.id], { x: 7, y: 50 })

    const stubAfter = useCadStore
      .getState()
      .installationLines.find((line) => line.id === stubLine.id)
    expect(stubAfter?.points[0].position).toEqual({
      x: stubStartBefore.x + 7,
      y: stubStartBefore.y + 50,
    })
  })

  it('kol silinince üstündeki armatür de düşer, ana boru kalır', () => {
    attachStove(300)

    const state = useCadStore.getState()
    const stubId = state.installationLines[1].id
    const stoveId = state.installationElements[1].id

    useCadStore.getState().removeSelection([], [stubId])

    const after = useCadStore.getState()
    expect(after.installationLines.map((line) => line.id)).toEqual([LINE_ID])
    // Kolun üstünde armatür yoktu: yalnız kol gitti, ocak yerinde kaldı.
    expect(after.installationElements.map((element) => element.id)).toContain(stoveId)
    expect(after.installationConnections).toHaveLength(0)
  })

  it('ana boru silinince üstündeki vana da gider', () => {
    attachStove(300)

    const valveId = useCadStore.getState().installationElements[0].id
    useCadStore.getState().removeSelection([], [LINE_ID])

    const after = useCadStore.getState()
    expect(after.installationElements.map((element) => element.id)).not.toContain(valveId)
  })

  it('armatür silinince düğüm boşa çıkar, boru YAPISI değişmez (bölme yok)', () => {
    attachStove(300)

    const valveId = useCadStore.getState().installationElements[0].id
    useCadStore.getState().removeElements([valveId])

    // onLine'daki gibi bölme YOK: vana borunun zaten var olan ucuna oturmuştu.
    expect(getLine().points).toHaveLength(2)
    expect(getInlineElementIds()).toEqual([undefined, undefined])
  })
})
