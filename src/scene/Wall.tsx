import { Line } from '@react-three/drei'

import { RENDER_ORDER, WALL_ELEVATION_CM } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { useArchitecturePoints } from './useArchitecturePoints'
import { planToThree } from '../core/coords'
import type { Point, Wall as WallData } from '../core/model'
import { getWallCapsule } from '../core/wallShape'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'

/**
 * İmleç üstündeyken duvar bu kadar kalınlaşır (cm). Kasten küçük: amaç "buradasın"
 * demek, seçili göstermek değil. Renk değişimiyle birlikte okunuyor.
 */
const HOVER_THICKNESS_BOOST_CM = 2

type WallProps = {
  wall: WallData
  points: readonly Point[]
  isHovered: boolean
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
export function Wall({ wall, points, isHovered }: WallProps) {
  const capsule = getWallCapsule(wall, points)
  if (!capsule) return null

  return (
    <Line
      points={[
        planToThree(capsule.p1, WALL_ELEVATION_CM),
        planToThree(capsule.p2, WALL_ELEVATION_CM),
      ]}
      color={isHovered ? SCENE_COLORS.wallHover : SCENE_COLORS.wallFill}
      // lineWidth kapsülün TAM genişliği; worldUnits ile birimi cm.
      worldUnits
      lineWidth={wall.thickness + (isHovered ? HOVER_THICKNESS_BOOST_CM : 0)}
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

  const floorWalls = walls.filter((wall) => wall.floorId === activeFloorId)
  const hoveredWallId = hover?.kind === 'wall' ? hover.wallId : undefined

  return (
    <group name="walls">
      {floorWalls.map((wall) => (
        <Wall
          key={wall.id}
          wall={wall}
          points={points}
          isHovered={wall.id === hoveredWallId}
        />
      ))}
    </group>
  )
}
