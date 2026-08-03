import { HANDLE_ELEVATION_CM, RENDER_ORDER } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { useArchitectureHover } from './useArchitectureHover'
import { useArchitecturePoints } from './useArchitecturePoints'
import { usePointDragTool } from './usePointDragTool'
import { planToThree } from '../core/coords'
import { getJointRadiusCm } from '../core/wallShape'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'

/** Vurgu diski kavşak diskinden bu kadar taşar (cm) — duvar vurgusuyla aynı pay. */
const HOVER_RADIUS_BOOST_CM = 1

const CIRCLE_SEGMENTS = 32

/**
 * İmlecin altındaki köşe. Kavşak diskiyle AYNI ölçüde çizilir (biraz taşarak):
 * duvarlar yuvarlak uçlu olduğu için köşedeki kütle zaten bir disk, vurgu da
 * onu takip edince geometriyle örtüşüyor.
 */
function CornerHover() {
  const hover = useArchitectureUiStore((state) => state.hover)
  const walls = useCadStore((state) => state.walls)
  // Sürüklenen köşe geçici konumuyla gelir; vurgu imlecin arkasında kalmasın.
  const points = useArchitecturePoints()

  if (hover?.kind !== 'point') return null

  const point = points.find((candidate) => candidate.id === hover.pointId)
  if (!point) return null

  const jointRadiusCm = getJointRadiusCm(hover.pointId, walls)
  if (jointRadiusCm === undefined) return null

  return (
    <mesh
      position={planToThree(point, HANDLE_ELEVATION_CM)}
      // Daire XY düzleminde üretilir; plan düzlemi (XZ) için yatırılır.
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={RENDER_ORDER.handle}
      frustumCulled={false}
      raycast={() => null}
    >
      <circleGeometry args={[jointRadiusCm + HOVER_RADIUS_BOOST_CM, CIRCLE_SEGMENTS]} />
      <meshBasicMaterial color={SCENE_COLORS.cornerHover} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/**
 * Köşe araçları. Seçim modunda HER köşede işaret belirmez — çizimi
 * kalabalıklaştırıyordu; yalnız imlecin altındaki köşe vurgulanır. Tutma
 * matematikle yapılıyor (usePointDragTool → resolveSnap), ışın tutacak bir
 * mesh gerekmiyor.
 *
 * Hook'lar <Canvas> içinde çalışmak zorunda; bu bileşen onun için var
 * (SceneRoot'taki ViewportControls ile aynı desen).
 */
export function PointHandles() {
  usePointDragTool()
  useArchitectureHover()

  return <CornerHover />
}
