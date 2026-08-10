import { useCadStore } from '../cadStore'

export function resetEmpty(): void {
  useCadStore.setState({
    points: [],
    walls: [],
    openings: [],
    rooms: [],
    nextUniqueId: 2,
    revision: 0,
    savedRevision: 0,
  })
  useCadStore.temporal.getState().clear()
}

export function addWall(x1: number, y1: number, x2: number, y2: number) {
  return useCadStore
    .getState()
    .addWall({ start: { position: { x: x1, y: y1 } }, end: { position: { x: x2, y: y2 } } })
}

/**
 * 400 x 300 kapalı dikdörtgen. Zincir `pointId` ile sürdürülüyor — duvar aracının
 * yaptığı da bu; her segmenti konumla eklemek aynı köşede İKİ nokta üretir ve
 * çevrim kapanmaz.
 */
export function drawRectangle() {
  const chain = (startPointId: number, x: number, y: number) =>
    useCadStore.getState().addWall({ start: { pointId: startPointId }, end: { position: { x, y } } })!

  const bottom = addWall(0, 0, 400, 0)!
  const right = chain(bottom.p2Id, 400, 300)
  const top = chain(right.p2Id, 0, 300)
  const left = useCadStore
    .getState()
    .addWall({ start: { pointId: top.p2Id }, end: { pointId: bottom.p1Id } })!

  return { bottom, right, top, left }
}

export function rooms() {
  return useCadStore.getState().rooms
}
