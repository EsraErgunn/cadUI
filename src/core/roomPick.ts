import type { PlanPoint } from './coords'
import type { Id, Point, Room, Wall } from './model'
import { findRoomFaceAt, findRoomFaces } from './room'
import { getWallSetKey } from './roomIdentity'

export type RoomPickInput = {
  walls: readonly Wall[]
  points: readonly Point[]
  rooms: readonly Room[]
  floorId: Id
}

/**
 * Noktanın düştüğü mahalin kimliği.
 *
 * Yüzler HER ÇAĞRIDA taze hesaplanıyor: `Room` geometri taşımıyor, duvarların
 * türevi (K31). Önbelleğe alınmıyor çünkü çağrı yalnız TIKLAMA anında oluyor,
 * hover'da değil — mahal `resolveArchitectureTarget` zincirine bilerek
 * girmiyor, girseydi her hover'da yüz taraması yapılırdı (K117).
 *
 * ⚠️ Yüz ↔ kayıt eşleşmesi TAM KÜME eşitliğiyle: `Room.tsx` neyi çiziyorsa
 * tıklama da onu bulmalı, yoksa ekranda seçili görünen mahal ile üzerinde işlem
 * yapılan mahal ayrışır.
 *
 * `useSelectionTool` içinde yerel bir closure'dı; sağ tık menüsü de aynı testi
 * isteyince buraya çıkarıldı (K160). İki kopya olsaydı biri değiştiğinde sol
 * tık ile sağ tık farklı mahali seçebilirdi.
 */
export function findRoomIdAt(planPoint: PlanPoint, input: RoomPickInput): Id | undefined {
  const faces = findRoomFaces(input.walls, input.points, input.floorId)
  const face = findRoomFaceAt(faces, planPoint)
  if (!face) return undefined

  const key = getWallSetKey(face.wallIds)
  return input.rooms.find((room) => getWallSetKey(room.wallIds) === key)?.id
}
