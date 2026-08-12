import { HANDLE_ELEVATION_CM, RENDER_ORDER } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { useBeamHandleTool } from './useBeamHandleTool'
import { useCameraZoom } from './useCameraZoom'
import { getBeamHandles, BEAM_HANDLE_RADIUS_PX } from '../core/beamHandles'
import { planToThree, type PlanPoint } from '../core/coords'
import { getSoleSelectedId } from '../core/selection'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'

const CIRCLE_SEGMENTS = 24

/** Vurgudayken tutamaç bir tık büyür — "buradasın" demeye yetecek kadar. */
const HOVER_RADIUS_BOOST_PX = 2

function BeamHandle({ position, radiusCm }: { position: PlanPoint; radiusCm: number }) {
  return (
    <mesh
      position={planToThree(position, HANDLE_ELEVATION_CM)}
      // Daire XY düzleminde üretilir; plan düzlemi (XZ) için yatırılır.
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={RENDER_ORDER.handle}
      frustumCulled={false}
      // Tutma kararı saf geometriyle veriliyor (findBeamHandleAt); ışın gerekmiyor.
      raycast={() => null}
    >
      <circleGeometry args={[radiusCm, CIRCLE_SEGMENTS]} />
      <meshBasicMaterial color={SCENE_COLORS.selection} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

/**
 * Seçili kirişin iki ucundaki tutamaç + uzatma hook'u. Hook <Canvas> içinde
 * çalışmak zorunda; `AreaObjectHandles` ile aynı desen.
 *
 * Tutamaçlar YALNIZ tek kiriş seçiliyken görünür: çoklu seçimde hangi kirişin
 * uzatılacağı belirsiz olurdu (hook da aynı kuralı uyguluyor).
 *
 * Boy EKRAN pikselinde sabit (`px / zoom`) — alan nesnesi tutamaçlarıyla aynı
 * kural (K45): zoom değişince tutamaç büyüyüp küçülmez.
 */
export function BeamHandles() {
  useBeamHandleTool()

  const zoom = useCameraZoom()
  const selection = useArchitectureUiStore((state) => state.selection)
  const handleDrag = useArchitectureUiStore((state) => state.beamHandleDrag)
  const isHovered = useArchitectureUiStore((state) => state.isBeamHandleHovered)
  const beams = useCadStore((state) => state.beams)
  const activeFloorId = useCadStore((state) => state.activeFloorId)

  const beamId = getSoleSelectedId(selection, 'beam')
  if (beamId === undefined) return null

  const beam = beams.find((candidate) => candidate.id === beamId)
  if (!beam || beam.floorId !== activeFloorId) return null

  // Sürükleme sırasında tutamaç ÖNİZLENEN uca gider; store'a henüz yazılmadığı
  // için kirişin kendisi de aynı uçla çiziliyor.
  const drawn =
    handleDrag?.beamId === beamId
      ? handleDrag.end === 'p1'
        ? { ...beam, x1: handleDrag.position.x, y1: handleDrag.position.y }
        : { ...beam, x2: handleDrag.position.x, y2: handleDrag.position.y }
      : beam

  const radiusCm = (BEAM_HANDLE_RADIUS_PX + (isHovered ? HOVER_RADIUS_BOOST_PX : 0)) / zoom

  return (
    <group name="beam-handles">
      {getBeamHandles(drawn).map((handle) => (
        <BeamHandle key={handle.end} position={handle.position} radiusCm={radiusCm} />
      ))}
    </group>
  )
}
