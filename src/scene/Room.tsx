import { useMemo } from 'react'

import { RoomLabel } from './RoomLabel'
import { RENDER_ORDER, ROOM_ELEVATION_CM } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { useArchitectureDraft } from './useArchitectureDraft'
import { planToThree, type PlanPoint } from '../core/coords'
import type { Id, Room as RoomData, Wall } from '../core/model'
import { findRoomFaces, type RoomFace } from '../core/room'
import { insetRoomPolygon, triangulatePolygon } from '../core/roomFill'
import { getWallSetKey } from '../core/roomIdentity'
import { getRoomLabelAnchor, toSquareMetres } from '../core/roomLabel'
import { getRoomDisplayName } from '../core/roomUsage'
import { getSelectedIds } from '../core/selection'
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

/**
 * Dolgu tamponunu, poligonun DEĞERLERİ değişmedikçe aynı referansta tutar.
 *
 * `fillCorners` her karede yeniden türetiliyor (üstteki `shapes` `points`'e
 * bağlı, o da sürükleme boyunca her kare değişiyor). Referans değişince r3f
 * `bufferAttribute`'u yeniden kuruyor ve üçgenlenmiş tampon GPU'ya yeniden
 * yükleniyordu — ODA BAŞINA, KARE BAŞINA. Oysa sürüklenen duvara komşu olmayan
 * odaların poligonu hiç değişmiyor.
 *
 * K99'un oda tarafı: önbelleğin anahtarı kimlik değil DEĞER olmalı.
 */
function useStableFillPositions(fillCorners: PlanPoint[] | undefined): Float32Array | undefined {
  const fillKey = fillCorners ? fillCorners.map((corner) => `${corner.x},${corner.y}`).join(';') : ''

  // Anahtar bilerek `fillCorners` DEĞİL `fillKey` — gerekçe yukarıda.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- kimlik değil DEĞER anahtarı
  return useMemo(() => (fillCorners ? toFillPositions(fillCorners) : undefined), [fillKey])
}

type RoomShapeProps = {
  roomId: Id
  face: RoomFace
  /** Etikette YAZAN metin: kullanım tipinin adı ya da "Tanımsız". */
  displayName: string
  isSelected: boolean
  /** Duvarların iç yüzüne çekilmiş dolgu poligonu; oda duvarından inceyse yok. */
  fillCorners: PlanPoint[] | undefined
}

function RoomShape({ face, displayName, isSelected, fillCorners }: RoomShapeProps) {
  const isRoomNamesVisible = useUiStore((state) => state.isRoomNamesVisible)
  // Etiket çapası odanın DOLGUSUNA değil, gerçek çevrimine göre bulunur; dolgu
  // duvar kalınlığı kadar küçültülmüş bir çizim ayrıntısı, odanın kendisi değil.
  const anchor = getRoomLabelAnchor(face.corners)
  const areaM2 = toSquareMetres(face.areaCm2)
  const fillPositions = useStableFillPositions(fillCorners)

  return (
    <group>
      {fillPositions && (
        <mesh frustumCulled={false} renderOrder={RENDER_ORDER.room} raycast={() => null}>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" args={[fillPositions, 3]} />
          </bufferGeometry>
          {/* Saydam: ızgara odanın altından okunmaya devam etsin. depthWrite zaten
              kapalı, sıralamayı renderOrder belirliyor. */}
          {/* Seçiliyken dolgu seçim rengine döner: mahalin gövdesi yok, o yüzden
              geri bildirimi verecek tek yüzey bu. */}
          <meshBasicMaterial
            color={isSelected ? SCENE_COLORS.selection : SCENE_COLORS.roomFill}
            transparent
            opacity={
              isSelected ? SCENE_COLORS.roomFillOpacity * 2 : SCENE_COLORS.roomFillOpacity
            }
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Mahal tanımı artık sahnede değil özellik panelinde (K117): sahne içi
          düzenleme kutusu kaldırıldı, burada yalnız etiket kaldı. */}
      {isRoomNamesVisible && <RoomLabel anchor={anchor} name={displayName} areaM2={areaM2} />}
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
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  // Duvar BAĞLANTISI da önizlemeden gelir: sürüklerken kopan komşu köşenin
  // klonuna bağlı görünmeli, yoksa ekrandaki ile bırakınca olan ayrışır (K103).
  const { points, walls } = useArchitectureDraft()
  const selection = useArchitectureUiStore((state) => state.selection)

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
          displayName: getRoomDisplayName(room.usageType),
          fillCorners: insetRoomPolygon(face.corners, thicknessesCm),
        },
      ]
    })
  }, [rooms, walls, points, activeFloorId])

  const selectedRoomIds = getSelectedIds(selection, 'room')

  return (
    <group name="rooms">
      {shapes.map((shape) => (
        <RoomShape
          key={shape.id}
          roomId={shape.id}
          face={shape.face}
          displayName={shape.displayName}
          fillCorners={shape.fillCorners}
          isSelected={selectedRoomIds.includes(shape.id)}
        />
      ))}
    </group>
  )
}
