import { Line, Text } from '@react-three/drei'

import { FONT_URL } from './LengthLabels'
import { ARCHITECTURE_GHOST_ELEVATION_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import type { AreaObjectShape } from '../../core/areaObject'
import { getAreaObjectPlanGeometry, type AreaObjectStrokeRole } from '../../core/areaObjectGeometry'
import { getBeamCorners, type BeamShape } from '../../core/beam'
import { planToThree, type PlanPoint } from '../../core/coords'
import type { AreaObjectType } from '../../core/model'
import { triangulatePolygon } from '../../core/roomFill'
import { DEFAULT_WALL_THICKNESS_CM } from '../../core/wall'
import { ARCHITECTURE_COLORS } from '../../scene/architectureTheme'
import { RENDER_ORDER } from '../../scene/layers'
import { SCENE_COLORS } from '../../scene/sceneTheme'

/**
 * `ArchitectureGhost`in (Ghosts.tsx) oda/kiriş/alan nesnesi şekilleri — ayrı
 * dosyada, duvar+açıklık (`ArchitectureGhostWalls.tsx`) ve nokta sembolü
 * (`ArchitectureGhostPointSymbol.tsx`) ile birlikte 200 satır sınırını aşıyordu.
 *
 * Her şekil, mimari görünümdeki KARŞILIĞIYLA (Room/Beam/AreaObject.tsx) AYNI
 * geometriden çizilir — ayrı bir "kaba hayalet" tutulmuyor, yalnız tek soluk
 * renge boyanıyor (bkz. knowledge/ghost-layers.md).
 */

/**
 * Kiriş/alan nesnesi/oda dolgusu hayalette de KORUNUR (yalnız renk tek tona
 * iner) — gerçek görünümdeki opaklıkla AYNI, `Room.tsx`/`AreaObject.tsx`/
 * `Beam.tsx`'teki `toFillPositions` ile aynı yöntem (üçgenleme genel amaçlı
 * `triangulatePolygon`, dört dosyada da tek tek tutulan yerel yardımcı).
 */
function toGhostFillPositions(corners: readonly PlanPoint[], elevationCm: number): Float32Array {
  const triangleCorners = triangulatePolygon(corners)
  const positions = new Float32Array(triangleCorners.length * 3)

  triangleCorners.forEach((corner, index) => {
    positions.set(planToThree(corner, elevationCm), index * 3)
  })

  return positions
}

/** Kiriş/alan nesnesi dolgusunun hayaletteki opaklığı — gerçek görünümle AYNI. */
const GHOST_FILL_OPACITY = ARCHITECTURE_COLORS.areaObjectFillOpacity

/**
 * Hayalet oda: `Room.tsx`'teki dolguyla AYNI yöntem (duvarın iç yüzüne kadar
 * çekilmiş poligon, K31) — yalnız tek soluk renkte. Çağıran yalnız `rooms`
 * store kaydıyla eşleşen yüzleri geçirir (`Room.tsx` ile aynı kural).
 */
export function GhostRoomFill({ corners }: { corners: readonly PlanPoint[] }) {
  return (
    <mesh
      frustumCulled={false}
      renderOrder={RENDER_ORDER.architectureGhostRoom}
      raycast={() => null}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[toGhostFillPositions(corners, ARCHITECTURE_GHOST_ELEVATION_CM), 3]}
        />
      </bufferGeometry>
      <meshBasicMaterial
        color={PLUMBING_COLORS.architectureGhost}
        transparent
        opacity={SCENE_COLORS.roomFillOpacity}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}

/** Türkçe büyük harf i → İ; varsayılan locale I üretir ve ad yanlış okunur (RoomLabel.tsx ile aynı). */
const TURKISH_LOCALE = 'tr-TR'
const GHOST_ROOM_NAME_SIZE_CM = 26

/**
 * Hayalet oda ADI (kullanıcı isteği, 2026-08: "mahal tanımları silinmesin ghost
 * modunda") — dolgu (`GhostRoomFill`) hayalette KORUNUYORDU ama ismi hiç
 * çizilmiyordu, tesisatçı hangi mahalde olduğunu göremiyordu. `RoomLabel.tsx`
 * ile AYNI çapa noktası (`getRoomLabelAnchor`) ve büyük harf dönüşümü; rozet ve
 * m² satırı BİLEREK YOK — diğer hayalet öğeleri gibi (nokta sembolü, alan
 * nesnesi) tek satır, tek soluk renk, salt tanıma amaçlı.
 */
export function GhostRoomLabel({ anchor, name }: { anchor: PlanPoint; name: string }) {
  return (
    <group position={planToThree(anchor, ARCHITECTURE_GHOST_ELEVATION_CM)} rotation={[-Math.PI / 2, 0, 0]}>
      <Text
        font={FONT_URL}
        fontSize={GHOST_ROOM_NAME_SIZE_CM}
        color={PLUMBING_COLORS.architectureGhost}
        anchorX="center"
        anchorY="middle"
        renderOrder={RENDER_ORDER.architectureGhostRoom}
        raycast={() => null}
      >
        {name.toLocaleUpperCase(TURKISH_LOCALE)}
      </Text>
    </group>
  )
}

/** Kirişin kesik konturu duvardan TÜRETİLİR — gerçek `Beam.tsx` ile aynı oran. */
const GHOST_BEAM_STROKE_WIDTH_CM = DEFAULT_WALL_THICKNESS_CM / 4
const GHOST_BEAM_DASH_SIZE_CM = DEFAULT_WALL_THICKNESS_CM
const GHOST_BEAM_GAP_SIZE_CM = DEFAULT_WALL_THICKNESS_CM * 0.6

/**
 * Hayalet kiriş: `Beam.tsx` ile AYNI dikdörtgen + kesik kontur, tek soluk
 * renkte. Sıfır boy kirişte `getBeamCorners` undefined döner, çizilmez.
 */
export function GhostBeam({ beam }: { beam: BeamShape }) {
  const corners = getBeamCorners(beam)
  if (!corners) return null

  return (
    <>
      <mesh
        frustumCulled={false}
        renderOrder={RENDER_ORDER.architectureGhostBeamFill}
        raycast={() => null}
      >
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[toGhostFillPositions(corners, ARCHITECTURE_GHOST_ELEVATION_CM), 3]}
          />
        </bufferGeometry>
        <meshBasicMaterial
          color={PLUMBING_COLORS.architectureGhost}
          transparent
          opacity={GHOST_FILL_OPACITY}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <Line
        points={[...corners, corners[0]].map((corner) =>
          planToThree(corner, ARCHITECTURE_GHOST_ELEVATION_CM),
        )}
        color={PLUMBING_COLORS.architectureGhost}
        worldUnits
        lineWidth={GHOST_BEAM_STROKE_WIDTH_CM}
        dashed
        dashSize={GHOST_BEAM_DASH_SIZE_CM}
        gapSize={GHOST_BEAM_GAP_SIZE_CM}
        frustumCulled={false}
        renderOrder={RENDER_ORDER.architectureGhostBeam}
        depthWrite={false}
        raycast={() => null}
        toneMapped={false}
      />
    </>
  )
}

/** Gövde/ayrıntı kalınlığı gerçek `AreaObject.tsx` ile AYNI (duvardan türetilir). */
const GHOST_AREA_OBJECT_STROKE_WIDTHS: Record<AreaObjectStrokeRole, number> = {
  body: DEFAULT_WALL_THICKNESS_CM / 4,
  detail: DEFAULT_WALL_THICKNESS_CM / 8,
}

/**
 * Hayalet alan nesnesi (merdiven/kolon/baca şaftı/kolon havalandırması):
 * `AreaObject.tsx` ile AYNI geometriden (`core/areaObjectGeometry.ts`), tek
 * soluk renkte.
 */
export function GhostAreaObject({
  type,
  areaObject,
}: {
  type: AreaObjectType
  areaObject: AreaObjectShape
}) {
  const geometry = getAreaObjectPlanGeometry(type, areaObject)

  return (
    <>
      <mesh
        frustumCulled={false}
        renderOrder={RENDER_ORDER.architectureGhostAreaObjectFill}
        raycast={() => null}
      >
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[toGhostFillPositions(geometry.fill, ARCHITECTURE_GHOST_ELEVATION_CM), 3]}
          />
        </bufferGeometry>
        <meshBasicMaterial
          color={PLUMBING_COLORS.architectureGhost}
          transparent
          opacity={GHOST_FILL_OPACITY}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {geometry.strokes.map((stroke) => (
        <Line
          key={stroke.name}
          points={stroke.points.map((point) =>
            planToThree(point, ARCHITECTURE_GHOST_ELEVATION_CM),
          )}
          color={PLUMBING_COLORS.architectureGhost}
          worldUnits
          lineWidth={GHOST_AREA_OBJECT_STROKE_WIDTHS[stroke.role]}
          frustumCulled={false}
          renderOrder={RENDER_ORDER.architectureGhostAreaObject}
          depthWrite={false}
          raycast={() => null}
          toneMapped={false}
        />
      ))}
    </>
  )
}

