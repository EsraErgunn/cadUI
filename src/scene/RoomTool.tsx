import { Line } from '@react-three/drei'

import { HANDLE_ELEVATION_CM, RENDER_ORDER, WALL_PREVIEW_ELEVATION_CM } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { useRoomTool } from './useRoomTool'
import { planToThree, type PlanPoint } from '../core/coords'
import { getRoomRectangleCorners } from '../core/room'
import { isSnapOnExistingGeometry } from '../core/snap'

const PREVIEW_WIDTH = 1.6
const SNAP_MARKER_SIZE_PX = 9

type SnapMarkerProps = {
  position: PlanPoint
}

function SnapMarker({ position }: SnapMarkerProps) {
  return (
    <mesh
      position={planToThree(position, HANDLE_ELEVATION_CM)}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={RENDER_ORDER.handle}
      // Boyut piksel cinsinden sabit kalsın diye ölçek kameradan bağımsız tutulur.
      scale={SNAP_MARKER_SIZE_PX}
      raycast={() => null}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial color={SCENE_COLORS.snapMarker} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/**
 * Dikdörtgen oda aracının canlı önizlemesi. Kesikli çerçeve, yazılacak duvarların
 * EKSENİNİ gösterir — duvar kalınlığı bırakıldıktan sonra ortaya çıkar.
 */
export function RoomTool() {
  const { origin, cursor, cursorSnapKind } = useRoomTool()
  // Aynı fonksiyon yazma anında da kullanılıyor: önizlemede görünen dikdörtgen
  // ile oluşan duvarlar birebir aynı olsun, "gördüğümden başkası çizildi" olmasın.
  const corners = origin && cursor ? getRoomRectangleCorners(origin, cursor) : undefined

  return (
    <group name="room-tool">
      {corners && (
        <Line
          // Kapalı çerçeve: ilk köşe sona tekrar ekleniyor.
          points={[...corners, corners[0]].map((corner) =>
            planToThree(corner, WALL_PREVIEW_ELEVATION_CM),
          )}
          color={SCENE_COLORS.preview}
          lineWidth={PREVIEW_WIDTH}
          dashed
          dashSize={12}
          gapSize={8}
          renderOrder={RENDER_ORDER.linePreview}
          depthWrite={false}
          toneMapped={false}
        />
      )}

      {cursor && isSnapOnExistingGeometry(cursorSnapKind) && <SnapMarker position={cursor} />}
    </group>
  )
}
