import { Line } from '@react-three/drei'

import { RENDER_ORDER, WALL_ELEVATION_CM } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { useArchitecturePoints } from './useArchitecturePoints'
import { useCameraZoom } from './useCameraZoom'
import { getWallLineWidthPx } from './wallStyle'
import { planToThree } from '../core/coords'
import type { Wall as WallData } from '../core/model'
import { isSelected } from '../core/selection'
import { buildPointIndex, type PointIndex } from '../core/wall'
import { getWallCapsuleFrom } from '../core/wallShape'
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
  /** Havuz indeksi, dizi değil: kapsül duvar başına uç çözüyor (bkz. wallShape). */
  pointIndex: PointIndex
  tone: WallTone
  /** Kalınlık piksel cinsinden verildiği için zoom'a bağlı; kapsayıcı bir kez okur. */
  zoom: number
}

/**
 * Duvar = yuvarlak uçlu tek bir kalın çizgi (kapsül). Konturu YOKTUR, düz renktir.
 *
 * Uç yuvarlaklığı ekran uzayında analitik hesaplanır — hiçbir zoom'da köşelenmez,
 * üçgenlenmiş geometri yoktur. Kalınlık `wallStyle.ts`'ten piksel cinsinden gelir.
 *
 * Duvarlar birbirinin üstüne çizilir ve birleşim hesabı YAPILMAZ: hepsi aynı
 * opak renkte olduğu için çakışma görünmez, kavşak kendiliğinden dolar (K23).
 */
export function Wall({ wall, pointIndex, tone, zoom }: WallProps) {
  const capsule = getWallCapsuleFrom(wall, pointIndex)
  if (!capsule) return null

  return (
    <Line
      points={[
        planToThree(capsule.p1, WALL_ELEVATION_CM),
        planToThree(capsule.p2, WALL_ELEVATION_CM),
      ]}
      color={TONE_COLORS[tone]}
      // lineWidth kapsülün TAM genişliği, birimi EKRAN PİKSELİ (worldUnits YOK
      // — bkz. wallStyle.ts: o yol ekran kenarlarına doğru inceltiyordu).
      lineWidth={getWallLineWidthPx(wall.thickness + TONE_BOOSTS_CM[tone], zoom)}
      /*
       * `alphaToCoverage` KAPALI. Açıkken kenar yumuşatma örtme maskesiyle
       * yapılıyordu ve tek renk duvarlarda sorunsuz görünüyordu — ama bir
       * KAVŞAKTA birden çok yuvarlak UÇ üst üste biniyor. Her uç kendi çizimidir
       * ve maskesini ekleyerek değil YAZARAK koyar; kenar alfası benzer olduğu
       * için hepsi aşağı yukarı aynı örnek altkümesini dolduruyor, birleşim tam
       * örtmeye ulaşmıyor ve kavşakta zeminin sızdığı açık renkli bir hale
       * kalıyordu (kullanıcı bildirimi).
       */
      alphaToCoverage={false}
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
  // Zoom BİR kez okunur ve dağıtılır; duvar başına abone olunsaydı kare başına
  // duvar sayısı kadar geri çağrım olurdu (useCameraZoom'un gerekçesi).
  const zoom = useCameraZoom()

  const floorWalls = walls.filter((wall) => wall.floorId === activeFloorId)
  const hoveredWallId = hover?.kind === 'wall' ? hover.wallId : undefined
  // Havuz BİR kez indekslenir; duvar başına taransaydı kare başına O(N·P) olurdu.
  const pointIndex = buildPointIndex(points)

  // Seçim vurgudan baskın: seçili duvarın üstündeyken mavi kalır, açılmaz.
  const toneOf = (wallId: WallData['id']): WallTone => {
    if (isSelected(selection, 'wall', wallId)) return 'selected'
    return wallId === hoveredWallId ? 'hovered' : 'normal'
  }

  return (
    <group name="walls">
      {floorWalls.map((wall) => (
        <Wall
          key={wall.id}
          wall={wall}
          pointIndex={pointIndex}
          tone={toneOf(wall.id)}
          zoom={zoom}
        />
      ))}
    </group>
  )
}
