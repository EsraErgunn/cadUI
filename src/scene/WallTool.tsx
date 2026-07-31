import { Line } from '@react-three/drei'

import { HANDLE_ELEVATION_CM, RENDER_ORDER, WALL_PREVIEW_ELEVATION_CM } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { useWallTool } from './useWallTool'
import { planToThree, type PlanPoint } from '../core/coords'
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

/** Duvar aracının canlı önizlemesi: çapadan imlece uzanan lastik çizgi. */
export function WallTool() {
  const { anchor, cursor, cursorSnapKind } = useWallTool()

  return (
    <group name="wall-tool">
      {anchor && cursor && (
        <Line
          points={[
            planToThree(anchor, WALL_PREVIEW_ELEVATION_CM),
            planToThree(cursor, WALL_PREVIEW_ELEVATION_CM),
          ]}
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
