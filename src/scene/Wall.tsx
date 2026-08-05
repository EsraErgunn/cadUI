import { Line } from '@react-three/drei'

import { RENDER_ORDER, WALL_ELEVATION_CM } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { useArchitecturePoints } from './useArchitecturePoints'
import { planToThree } from '../core/coords'
import type { Point, Wall as WallData } from '../core/model'
import { isSelected } from '../core/selection'
import { getWallCapsule } from '../core/wallShape'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'

/**
 * İmleç üstündeyken duvar bu kadar kalınlaşır (cm). Kasten küçük: amaç "buradasın"
 * demek, seçili göstermek değil. Renk değişimiyle birlikte okunuyor.
 */
const HOVER_THICKNESS_BOOST_CM = 2

/** Seçili duvar hover'dan daha belirgin: renk zaten mavi, kalınlık da bir tık fazla. */
const SELECTED_THICKNESS_BOOST_CM = 3

export type WallTone = 'normal' | 'hovered' | 'selected'

const TONE_COLORS: Record<WallTone, string> = {
  normal: SCENE_COLORS.wallFill,
  hovered: SCENE_COLORS.wallHover,
  selected: SCENE_COLORS.selection,
}

const TONE_BOOSTS_CM: Record<WallTone, number> = {
  normal: 0,
  hovered: HOVER_THICKNESS_BOOST_CM,
  selected: SELECTED_THICKNESS_BOOST_CM,
}

type WallProps = {
  wall: WallData
  points: readonly Point[]
  tone: WallTone
}

/**
 * Duvar = yuvarlak uçlu tek bir kalın çizgi (kapsül). Konturu YOKTUR, düz renktir.
 *
 * `worldUnits` LineMaterial'ın kapsül shader'ını açar: parça, ışının doğru
 * parçasına uzaklığı yarıçapı aşınca atılır. Yani eğri analitiktir — hiçbir
 * zoom'da köşelenmez, üçgenlenmiş geometri yoktur.
 *
 * Duvarlar birbirinin üstüne çizilir ve birleşim hesabı YAPILMAZ: hepsi aynı
 * opak renkte olduğu için çakışma görünmez, kavşak kendiliğinden dolar (K23).
 */
export function Wall({ wall, points, tone }: WallProps) {
  const capsule = getWallCapsule(wall, points)
  if (!capsule) return null

  return (
    <Line
      points={[
        planToThree(capsule.p1, WALL_ELEVATION_CM),
        planToThree(capsule.p2, WALL_ELEVATION_CM),
      ]}
      color={TONE_COLORS[tone]}
      // lineWidth kapsülün TAM genişliği; worldUnits ile birimi cm.
      worldUnits
      lineWidth={wall.thickness + TONE_BOOSTS_CM[tone]}
      /*
       * Kenar yumuşatma örtme (coverage) maskesiyle yapılır, harmanlamayla değil.
       * Duvarlar tek renk olduğu için çakışan kenarlarda dikiş oluşmaz: maske
       * hangi örneği seçerse seçsin yazılan renk aynı. Kapatılırsa shader sert
       * `discard` eder ve eğri uçlar tırtıklanır.
       */
      alphaToCoverage
      // Kapsül geometrinin sınırlarını taştığı için kırpma kapalı.
      frustumCulled={false}
      renderOrder={RENDER_ORDER.wall}
      depthWrite={false}
      toneMapped={false}
      // Sahne state'in türevi: mesh'te veri değil yalnız id taşınır.
      userData={{ id: wall.id }}
    />
  )
}

/** Aktif kattaki duvarlar. Store'daki dizileri olduğu gibi okur — türetilmiş dizi
 *  seçici döndürseydi her store değişiminde yeni referans çıkar ve gereksiz render olurdu. */
export function Walls() {
  const walls = useCadStore((state) => state.walls)
  // Sürüklenen köşe geçici konumuyla gelir; duvar imlecin arkasında kalmasın.
  const points = useArchitecturePoints()
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const hover = useArchitectureUiStore((state) => state.hover)
  // Kararlı referansa abone olunur; seçili olup olmadığı render sırasında türetilir.
  const selection = useArchitectureUiStore((state) => state.selection)

  const floorWalls = walls.filter((wall) => wall.floorId === activeFloorId)
  const hoveredWallId = hover?.kind === 'wall' ? hover.wallId : undefined

  // Seçim vurgudan baskın: seçili duvarın üstündeyken mavi kalır, açılmaz.
  const toneOf = (wallId: WallData['id']): WallTone => {
    if (isSelected(selection, 'wall', wallId)) return 'selected'
    return wallId === hoveredWallId ? 'hovered' : 'normal'
  }

  return (
    <group name="walls">
      {floorWalls.map((wall) => (
        <Wall key={wall.id} wall={wall} points={points} tone={toneOf(wall.id)} />
      ))}
    </group>
  )
}
