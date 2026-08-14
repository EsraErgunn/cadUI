import { useMemo } from 'react'

import { RoomLabel } from './RoomLabel'
import { RoomNameEditor } from './RoomNameEditor'
import { RENDER_ORDER, ROOM_ELEVATION_CM } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { useArchitecturePoints } from './useArchitecturePoints'
import { planToThree, type PlanPoint } from '../core/coords'
import type { Id, Room as RoomData, Wall } from '../core/model'
import { findRoomFaces, type RoomFace } from '../core/room'
import { insetRoomPolygon, triangulatePolygon } from '../core/roomFill'
import { getWallSetKey } from '../core/roomIdentity'
import { getRoomLabelAnchor, toSquareMetres } from '../core/roomLabel'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

function toFillPositions(corners: readonly PlanPoint[]): Float32Array {
  const triangleCorners = triangulatePolygon(corners)
  const positions = new Float32Array(triangleCorners.length * 3)

  triangleCorners.forEach((corner, index) => {
    positions.set(planToThree(corner, ROOM_ELEVATION_CM), index * 3)
  })

  return positions
}

type RoomShapeProps = {
  roomId: Id
  face: RoomFace
  name: string
  /** Duvarların iç yüzüne çekilmiş dolgu poligonu; oda duvarından inceyse yok. */
  fillCorners: PlanPoint[] | undefined
  isEditingName: boolean
}

function RoomShape({ roomId, face, name, fillCorners, isEditingName }: RoomShapeProps) {
  const isRoomNamesVisible = useUiStore((state) => state.isRoomNamesVisible)
  // Etiket çapası odanın DOLGUSUNA değil, gerçek çevrimine göre bulunur; dolgu
  // duvar kalınlığı kadar küçültülmüş bir çizim ayrıntısı, odanın kendisi değil.
  const anchor = getRoomLabelAnchor(face.corners)
  const areaM2 = toSquareMetres(face.areaCm2)

  return (
    <group>
      {fillCorners && (
        <mesh frustumCulled={false} renderOrder={RENDER_ORDER.room} raycast={() => null}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[toFillPositions(fillCorners), 3]} />
          </bufferGeometry>
          {/* Saydam: ızgara odanın altından okunmaya devam etsin. depthWrite zaten
              kapalı, sıralamayı renderOrder belirliyor. */}
          <meshBasicMaterial
            color={SCENE_COLORS.roomFill}
            transparent
            opacity={SCENE_COLORS.roomFillOpacity}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Düzenlerken etiket gizlenir: kutu zaten aynı yerde ve adı gösteriyor.
          Düzenleme kutusu görünürlük anahtarına BAKMAZ (K56): kullanıcı çift
          tıklayıp adı yazmaya başlamışsa yazdığı şeyi görmeli. */}
      {isEditingName ? (
        <RoomNameEditor roomId={roomId} anchor={anchor} currentName={name} />
      ) : (
        isRoomNamesVisible && <RoomLabel anchor={anchor} name={name} areaM2={areaM2} />
      )}
    </group>
  )
}

/**
 * Aktif kattaki odalar. Geometri store'da DURMAZ (Room yalnız duvar id'leri
 * tutar), her çizimde duvarlardan türetilir — kopyalansaydı duvar oynayınca
 * oda yerinde donardı.
 *
 * Yüzü odayla eşleştirmek için duvar kümesi imzası kullanılıyor; kimliğin
 * store tarafındaki dayanağı da bu (K31).
 */
export function Rooms() {
  const rooms = useCadStore((state) => state.rooms)
  const walls = useCadStore((state) => state.walls)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  // Sürüklenen köşe geçici konumuyla gelir; oda duvarların arkasında kalmasın.
  const points = useArchitecturePoints()
  const editingRoomId = useArchitectureUiStore((state) => state.editingRoomId)

  const shapes = useMemo(() => {
    const faces = findRoomFaces(walls, points, activeFloorId)
    const nameByWallSet = new Map<string, RoomData>()
    for (const room of rooms) nameByWallSet.set(getWallSetKey(room.wallIds), room)

    const thicknessById = new Map<Id, Wall['thickness']>()
    for (const wall of walls) thicknessById.set(wall.id, wall.thickness)

    return faces.flatMap((face) => {
      const room = nameByWallSet.get(getWallSetKey(face.wallIds))
      // Eşleşmeyen yüz: store henüz güncellenmemiş bir ara kare. Çizme.
      if (!room) return []

      // Yüzün i. kenarını i. duvar taşıyor (findRoomFaces ikisini birlikte yazar).
      const thicknessesCm = face.wallIds.map((wallId) => thicknessById.get(wallId) ?? 0)

      return [
        {
          id: room.id,
          face,
          name: room.name,
          fillCorners: insetRoomPolygon(face.corners, thicknessesCm),
        },
      ]
    })
  }, [rooms, walls, points, activeFloorId])

  return (
    <group name="rooms">
      {shapes.map((shape) => (
        <RoomShape
          key={shape.id}
          roomId={shape.id}
          face={shape.face}
          name={shape.name}
          fillCorners={shape.fillCorners}
          isEditingName={shape.id === editingRoomId}
        />
      ))}
    </group>
  )
}
