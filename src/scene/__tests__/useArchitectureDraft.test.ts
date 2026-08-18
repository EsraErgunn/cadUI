import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { useArchitectureUiStore } from '../../store/architectureUiStore'
import { useCadStore } from '../../store/cadStore'
import { useArchitectureDraft } from '../useArchitectureDraft'

/**
 * Yan yana iki oda; ortak köşe (400,300).
 *
 *   +--------+--------+  y = 300
 *   |  sol   |  sağ   |
 *   +--------+--------+  y = 0
 *   0       400      800
 */
function drawTwoRooms() {
  const add = (input: Parameters<ReturnType<typeof useCadStore.getState>['addWall']>[0]) =>
    useCadStore.getState().addWall(input)!
  const chain = (pointId: number, x: number, y: number) =>
    add({ start: { pointId }, end: { position: { x, y } } })

  const bottom = add({ start: { position: { x: 0, y: 0 } }, end: { position: { x: 800, y: 0 } } })
  const right = chain(bottom.p2Id, 800, 300)
  const topRight = chain(right.p2Id, 400, 300)
  const topLeft = chain(topRight.p2Id, 0, 300)
  add({ start: { pointId: topLeft.p2Id }, end: { pointId: bottom.p1Id } })
  const divider = chain(topRight.p2Id, 400, 0)

  return { topLeft, topRight, divider }
}

function draft() {
  return renderHook(() => useArchitectureDraft()).result.current
}

function endsOf(wallId: number) {
  const { points, walls } = draft()
  const wall = walls.find((candidate) => candidate.id === wallId)!
  const read = (pointId: number) => {
    const point = points.find((candidate) => candidate.id === pointId)!
    return { x: point.x, y: point.y }
  }
  return { p1: read(wall.p1Id), p2: read(wall.p2Id) }
}

describe('useArchitectureDraft — sürükleme önizlemesi', () => {
  beforeEach(() => {
    useCadStore.setState({ points: [], walls: [], openings: [], rooms: [], nextUniqueId: 2 })
    useCadStore.temporal.getState().clear()
    useArchitectureUiStore.getState().setDraggingWall(null)
  })

  it('sürükleme yokken store neyse odur', () => {
    drawTwoRooms()
    const state = useCadStore.getState()

    const preview = draft()

    expect(preview.points).toBe(state.points)
    expect(preview.walls).toBe(state.walls)
  })

  it('KOPACAK komşu önizlemede de yerinde kalır', () => {
    const { topLeft, topRight } = drawTwoRooms()
    const before = endsOf(topLeft.wallId)

    useArchitectureUiStore.getState().setDraggingWall({
      wallIds: [topRight.wallId],
      dxCm: 0,
      dyCm: -100,
    })

    // Bu, düzeltmenin ta kendisi: eskiden önizleme yalnız ötelemeyi uyguluyordu,
    // sol odanın üst duvarı jest boyunca EĞİLMİŞ görünüyor ve bırakınca birden
    // düzeliyordu (K103).
    expect(endsOf(topLeft.wallId)).toEqual(before)
  })

  it('taşınan duvar önizlemede ötelenmiş', () => {
    const { topRight } = drawTwoRooms()

    useArchitectureUiStore.getState().setDraggingWall({
      wallIds: [topRight.wallId],
      dxCm: 0,
      dyCm: -100,
    })

    const ends = endsOf(topRight.wallId)
    expect([ends.p1.y, ends.p2.y]).toEqual([200, 200])
  })

  it('önizleme klonu NEGATİF id alır — gerçek id havuzuna karışmaz', () => {
    const { topRight } = drawTwoRooms()

    useArchitectureUiStore.getState().setDraggingWall({
      wallIds: [topRight.wallId],
      dxCm: 0,
      dyCm: -100,
    })

    const cloneIds = draft().points.filter((point) => point.id < 0)
    expect(cloneIds.length).toBeGreaterThan(0)
    // Store'a hiç yazılmadı: kalıcı havuz kirlenmedi.
    expect(useCadStore.getState().points.every((point) => point.id > 0)).toBe(true)
  })

  it('harekete paralel ve UZAYAN komşu köşeyi izler', () => {
    const { topRight, divider } = drawTwoRooms()

    useArchitectureUiStore.getState().setDraggingWall({
      wallIds: [topRight.wallId],
      dxCm: 0,
      dyCm: 200,
    })

    const ends = endsOf(divider.wallId)
    expect([ends.p1, ends.p2]).toContainEqual({ x: 400, y: 500 })
  })
})
