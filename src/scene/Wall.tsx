import { Line } from '@react-three/drei'
import { memo, useMemo } from 'react'

import { RENDER_ORDER, WALL_ELEVATION_CM } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { useArchitectureDraft } from './useArchitectureDraft'
import { useCameraZoom } from './useCameraZoom'
import { getWallLineWidthPx } from './wallStyle'
import { planToThree } from '../core/coords'
import type { Wall as WallData } from '../core/model'
import { isSelected } from '../core/selection'
import { buildPointIndex } from '../core/wall'
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
  /**
   * Uçlar SAYI olarak geliyor, indeks/nesne olarak değil. Kapsayıcı zaten
   * indeksi tutuyor ve kapsülü çözebiliyor; buraya nesne geçirilseydi `memo`
   * sürüklemede tamamen etkisiz kalırdı — havuz her karede değişiyor, oysa
   * duvarların çoğunun UCU oynamıyor.
   */
  p1x: number
  p1y: number
  p2x: number
  p2y: number
  tone: WallTone
  /** Kalınlık piksel cinsinden verildiği için zoom'a bağlı; kapsayıcı bir kez okur. */
  zoom: number
}

/**
 * Duvar = yuvarlak uçlu tek bir kalın çizgi (kapsül). Konturu YOKTUR, düz renktir.
 *
 * `memo`'lu: `Walls` hover, seçim ve zoom'a abone, yani bunlardan biri
 * değiştiğinde kapsayıcı yeniden render oluyor. Memo olmadan tek duvarın
 * üstüne gelmek TÜM duvarları render ediyordu.
 *
 * Uç yuvarlaklığı ekran uzayında analitik hesaplanır — hiçbir zoom'da köşelenmez,
 * üçgenlenmiş geometri yoktur. Kalınlık `wallStyle.ts`'ten piksel cinsinden gelir.
 *
 * Duvarlar birbirinin üstüne çizilir ve birleşim hesabı YAPILMAZ: hepsi aynı
 * opak renkte olduğu için çakışma görünmez, kavşak kendiliğinden dolar (K23).
 */
export const Wall = memo(function Wall({ wall, p1x, p1y, p2x, p2y, tone, zoom }: WallProps) {
  /*
   * drei `<Line>` geometriyi `points` dizisinin KİMLİĞİNE göre kuruyor
   * (useMemo bağımlılığı). Dizi her render'da yeniden yazılırsa duvar başına
   * yeni `LineGeometry` ayrılıyor, GPU tamponu yükleniyor ve eskisi imha
   * ediliyordu — zoom ve sürükleme boyunca KARE BAŞINA, duvar sayısı kadar.
   * Dizi artık yalnız uçlar gerçekten oynayınca değişiyor.
   */
  const points = useMemo(
    () => [
      planToThree({ x: p1x, y: p1y }, WALL_ELEVATION_CM),
      planToThree({ x: p2x, y: p2y }, WALL_ELEVATION_CM),
    ],
    [p1x, p1y, p2x, p2y],
  )

  return (
    <Line
      points={points}
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
})

/** Aktif kattaki duvarlar. Store'daki dizileri olduğu gibi okur — türetilmiş dizi
 *  seçici döndürseydi her store değişiminde yeni referans çıkar ve gereksiz render olurdu. */
export function Walls() {
  // Duvar BAĞLANTISI da önizlemeden gelir: sürüklerken kopan komşu köşenin
  // klonuna bağlı görünmeli, yoksa ekrandaki ile bırakınca olan ayrışır (K102).
  const { points, walls } = useArchitectureDraft()
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const hover = useArchitectureUiStore((state) => state.hover)
  // Kararlı referansa abone olunur; seçili olup olmadığı render sırasında türetilir.
  const selection = useArchitectureUiStore((state) => state.selection)
  // Zoom BİR kez okunur ve dağıtılır; duvar başına abone olunsaydı kare başına
  // duvar sayısı kadar geri çağrım olurdu (useCameraZoom'un gerekçesi).
  const zoom = useCameraZoom()

  const floorWalls = useMemo(
    () => walls.filter((wall) => wall.floorId === activeFloorId),
    [walls, activeFloorId],
  )
  const hoveredWallId = hover?.kind === 'wall' ? hover.wallId : undefined
  // Havuz BİR kez indekslenir; duvar başına taransaydı kare başına O(N·P) olurdu.
  // Kimliği de KARARLI olmalı: `Wall` artık `memo`'lu ve bunu prop olarak
  // alıyor, her render yeni indeks vermek memo'yu tamamen etkisiz bırakırdı.
  const pointIndex = useMemo(() => buildPointIndex(points), [points])

  // Seçim vurgudan baskın: seçili duvarın üstündeyken mavi kalır, açılmaz.
  const toneOf = (wallId: WallData['id']): WallTone => {
    if (isSelected(selection, 'wall', wallId)) return 'selected'
    return wallId === hoveredWallId ? 'hovered' : 'normal'
  }

  return (
    <group name="walls">
      {floorWalls.map((wall) => {
        // Kapsül BURADA çözülüyor: `Wall` uçları sayı olarak alıyor (bkz.
        // WallProps). Sıfır boy duvar kapsül üretmez ve hiç çizilmez.
        const capsule = getWallCapsuleFrom(wall, pointIndex)
        if (!capsule) return null

        return (
          <Wall
            key={wall.id}
            wall={wall}
            p1x={capsule.p1.x}
            p1y={capsule.p1.y}
            p2x={capsule.p2.x}
            p2y={capsule.p2.y}
            tone={toneOf(wall.id)}
            zoom={zoom}
          />
        )
      })}
    </group>
  )
}
