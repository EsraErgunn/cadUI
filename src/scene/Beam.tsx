import { Line } from '@react-three/drei'

import { BEAM_ELEVATION_CM, BEAM_PREVIEW_ELEVATION_CM } from './architectureLayers'
import { ARCHITECTURE_COLORS } from './architectureTheme'
import { RENDER_ORDER } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { getBeamCorners, type BeamShape } from '../core/beam'
import { planToThree, type PlanPoint } from '../core/coords'
import { triangulatePolygon } from '../core/roomFill'
import { DEFAULT_WALL_THICKNESS_CM } from '../core/wall'

export type BeamTone = 'normal' | 'hovered' | 'selected' | 'preview'

/**
 * Kontur kalınlığı duvardan TÜRETİLİR (alan nesnesinin gövde çizgisiyle aynı
 * oran, K43): varsayılan duvar değişince kirişin çizgisi de onunla ölçeklenir.
 * Birim cm — `worldUnits` sayesinde zoom'dan bağımsız fiziksel kalınlık.
 */
const STROKE_WIDTH_CM = DEFAULT_WALL_THICKNESS_CM / 4

/**
 * Kesik çizginin boy/boşluk ölçüleri (cm). Duvar kalınlığına oranlanıyor: sabit
 * yazılsaydı 20 cm'lik bir kirişte kesikler gövdeden uzun görünürdü.
 */
const DASH_SIZE_CM = DEFAULT_WALL_THICKNESS_CM
const GAP_SIZE_CM = DEFAULT_WALL_THICKNESS_CM * 0.6

const STROKE_COLORS: Record<BeamTone, string> = {
  normal: ARCHITECTURE_COLORS.wall,
  hovered: SCENE_COLORS.wallHover,
  selected: SCENE_COLORS.selection,
  // Önizleme AYNI renk, yalnız saydam — alan nesnesiyle aynı kural.
  preview: ARCHITECTURE_COLORS.wall,
}

const FILL_COLORS: Record<BeamTone, string> = {
  normal: ARCHITECTURE_COLORS.areaObjectFill,
  hovered: SCENE_COLORS.wallHover,
  selected: SCENE_COLORS.selection,
  preview: ARCHITECTURE_COLORS.areaObjectFill,
}

/** Yalnız önizlemede saydamlık; yerleştirilmiş kirişin KONTURU tam opak. */
const PREVIEW_OPACITY = 0.45

function toFillPositions(corners: readonly PlanPoint[], elevationCm: number): Float32Array {
  const triangleCorners = triangulatePolygon(corners)
  const positions = new Float32Array(triangleCorners.length * 3)

  triangleCorners.forEach((corner, index) => {
    positions.set(planToThree(corner, elevationCm), index * 3)
  })

  return positions
}

type BeamProps = {
  beam: BeamShape
  tone: BeamTone
  /** Mesh'te yalnız id taşınır (CLAUDE.md kural 4); önizlemede id yok. */
  beamId?: number
}

/**
 * Kiriş = KESİK konturlu dikdörtgen + alan nesnesiyle aynı soluk dolgu
 * (kullanıcı isteği). Duvarın kapsülünden (yuvarlak uçlu tek kalın çizgi, K23)
 * bilerek ayrılıyor: kapsül tek bir `<Line>`, kesik kontur ise gerçek bir
 * dikdörtgen çevrimi gerektiriyor — bu yüzden kirişin uçları DÜZ.
 *
 * Kesik çizgi kirişi duvardan ayırt eden şey: ikisi aynı kalınlıkta ve aynı
 * renkte, fark yalnız konturun sürekli değil kesik olması (plan çizimi geleneği:
 * kiriş üstte, kesitin dışında kalan eleman).
 */
export function Beam({ beam, tone, beamId }: BeamProps) {
  const isPreview = tone === 'preview'
  const corners = getBeamCorners(beam)
  // Sıfır boy kirişte yön belirsiz; çizilmez (duvardaki MIN_WALL_LENGTH_CM ile aynı kural).
  if (!corners) return null

  const elevationCm = isPreview ? BEAM_PREVIEW_ELEVATION_CM : BEAM_ELEVATION_CM
  const strokeRenderOrder = isPreview ? RENDER_ORDER.linePreview : RENDER_ORDER.beam
  const fillRenderOrder = isPreview ? RENDER_ORDER.areaObjectPreviewFill : RENDER_ORDER.beamFill

  return (
    <group userData={beamId === undefined ? undefined : { id: beamId }}>
      <mesh frustumCulled={false} renderOrder={fillRenderOrder} raycast={() => null}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[toFillPositions(corners, elevationCm), 3]}
          />
        </bufferGeometry>
        <meshBasicMaterial
          color={FILL_COLORS[tone]}
          transparent
          opacity={
            ARCHITECTURE_COLORS.areaObjectFillOpacity * (isPreview ? PREVIEW_OPACITY : 1)
          }
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      <Line
        // Son nokta ilkine döner: çevrim kapansın, dördüncü kenar da çizilsin.
        points={[...corners, corners[0]].map((corner) => planToThree(corner, elevationCm))}
        color={STROKE_COLORS[tone]}
        // worldUnits: kalınlık cm cinsinden, zoom'la BİRLİKTE ölçeklenir (Wall.tsx
        // ile aynı gerekçe). Kesik ölçüleri de bu yüzden cm.
        worldUnits
        lineWidth={STROKE_WIDTH_CM}
        dashed
        dashSize={DASH_SIZE_CM}
        gapSize={GAP_SIZE_CM}
        transparent={isPreview}
        opacity={isPreview ? PREVIEW_OPACITY : 1}
        frustumCulled={false}
        renderOrder={strokeRenderOrder}
        depthWrite={false}
        toneMapped={false}
        {...(isPreview ? { raycast: () => null } : {})}
      />
    </group>
  )
}
