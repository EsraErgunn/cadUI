import { Line } from '@react-three/drei'

import { ARCHITECTURE_GHOST_ELEVATION_CM, ARCHITECTURE_GHOST_SYMBOL_LIFT_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import { planToThree, type PlanPoint, type ThreePosition } from '../../core/coords'
import type { OpeningType, Wall as WallData } from '../../core/model'
import { getOpeningSymbol, type OpeningSymbolRole } from '../../core/openingSymbol'
import { WALL_OUTLINE_CM } from '../../core/pdf/svgPrimitives'
import { type PointIndex } from '../../core/wall'
import { getWallCapsuleFrom } from '../../core/wallShape'
import { getArchitectureStrokeWidthPx } from '../../scene/architectureStrokeStyle'
import { RENDER_ORDER } from '../../scene/layers'
import { toOpeningFillPositions } from '../../scene/openingFill'
import { SCENE_COLORS } from '../../scene/sceneTheme'
import { getWallLineWidthPx } from '../../scene/wallStyle'

/**
 * `ArchitectureGhost`in (Ghosts.tsx) duvar + açıklık şekilleri — ayrı dosyada,
 * kalan şekillerle (oda/kiriş/alan nesnesi/nokta sembolü, `ArchitectureGhostFixtures.tsx`)
 * birlikte 200 satır sınırını aşıyordu.
 *
 * Her şekil, mimari görünümdeki KARŞILIĞIYLA (Wall/Opening.tsx) AYNI geometriden
 * çizilir — ayrı bir "kaba hayalet" tutulmuyor; değişen yalnız çizim dili:
 * hayalet, kâğıttaki kat planı paftası gibi İÇİ BOŞ basılır (K165, bkz.
 * knowledge/ghost-layers.md).
 */

/**
 * Mimari görünümün 1.8 / 1.2 / 1 oranı, hayalette bir tık ince: açıklık bağlam,
 * konu değil — duvar kütlesi baskın kalsın, delik onun üstünde okunsun.
 */
const GHOST_OPENING_STROKE_WIDTHS: Record<OpeningSymbolRole, number> = {
  jamb: 1.4,
  face: 1,
  detail: 0.8,
}

/**
 * Duvar konturunun ekran kalınlığı. Sabit KÂĞITTAN geliyor (`WALL_OUTLINE_CM`):
 * hayalet ile pafta aynı çizimi göstermeli, kalınlık oranı da aynı olmalı.
 * Piksele çevrilir çünkü duvar bandının kendisi de piksel yolundan geçiyor
 * (`getWallLineWidthPx`) — biri cm biri piksel kalsaydı yakınlaştıkça kontur
 * kıl gibi incelirdi.
 */
function getGhostWallOutlinePx(zoom: number): number {
  return getArchitectureStrokeWidthPx(WALL_OUTLINE_CM, zoom)
}

type GhostLineProps = {
  points: ThreePosition[]
  lineWidth: number
}

/** Hayaletin her çizgisi raycast DIŞI — mimari bu görünümde seçilemez, salt bağlam. */
function GhostLine({ points, lineWidth }: GhostLineProps) {
  return (
    <Line
      points={points}
      color={PLUMBING_COLORS.architectureGhostFaint}
      lineWidth={lineWidth}
      renderOrder={RENDER_ORDER.architectureGhostOpeningSymbol}
      depthWrite={false}
      raycast={() => null}
      toneMapped={false}
    />
  )
}

/**
 * Hayalet duvar = İÇİ BOŞ kapsül, kâğıttaki kat planıyla aynı iki geçişte
 * (K154/K165): önce `kalınlık + 2×kontur` kontur renginde, sonra tam kalınlıkta
 * zemin renginde. Duvar duvar konturlamak yanlış sonuç verirdi — kapsüller
 * kavşakta üst üste biner (K23) ve her birinin konturu ötekinin İÇİNDEN geçerdi;
 * iki geçiş, polygon union yazmadan birleşimin dış çeperini veriyor. İkinci
 * geçişin ayrı `renderOrder`da olmasının sebebi de bu: aynı bantta kalsaydı bir
 * duvarın içi komşusunun konturunu silerdi.
 *
 * Geometri scene/Wall.tsx ile AYNI; değişen yalnız dolgunun kalkması.
 */
export function GhostWall({
  wall,
  pointIndex,
  zoom,
}: {
  wall: WallData
  pointIndex: PointIndex
  /** Kalınlığın ekran tabanı zoom'a bağlı; kapsayıcı bir kez okur. */
  zoom: number
}) {
  const capsule = getWallCapsuleFrom(wall, pointIndex)
  if (!capsule) return null

  const points = [
    planToThree(capsule.p1, ARCHITECTURE_GHOST_ELEVATION_CM),
    planToThree(capsule.p2, ARCHITECTURE_GHOST_ELEVATION_CM),
  ]
  // Kalınlık mimari görünümdekiyle AYNI yoldan (piksel, worldUnits YOK):
  // uzaklaşınca hayalet incelip kaybolursa borunun hangi duvarın üstünde
  // olduğuna bakılacak bağlam da kaybolur.
  const bandWidthPx = getWallLineWidthPx(wall.thickness, zoom)

  return (
    <>
      <Line
        points={points}
        color={PLUMBING_COLORS.architectureGhostWall}
        lineWidth={bandWidthPx + 2 * getGhostWallOutlinePx(zoom)}
        alphaToCoverage
        frustumCulled={false}
        renderOrder={RENDER_ORDER.architectureGhost}
        depthWrite={false}
        raycast={() => null}
        toneMapped={false}
      />

      <Line
        points={points}
        color={SCENE_COLORS.background}
        lineWidth={bandWidthPx}
        alphaToCoverage
        frustumCulled={false}
        renderOrder={RENDER_ORDER.architectureGhostWallVoid}
        depthWrite={false}
        raycast={() => null}
        toneMapped={false}
      />
    </>
  )
}

const GHOST_SYMBOL_ELEVATION_CM =
  ARCHITECTURE_GHOST_ELEVATION_CM + ARCHITECTURE_GHOST_SYMBOL_LIFT_CM

/**
 * Hayalet açıklık, mimari görünümle AYNI plan simgesinden çizilir
 * (core/openingSymbol.ts): kapı kanadından, pencere cam çizgilerinden tanınsın.
 *
 * Boşluk önce zemin rengiyle boyanır ve KONTUR KADAR ŞİŞİRİLİR: poligonun
 * kendisi tam duvar kalınlığında, olduğu gibi bırakılsaydı duvarın iki yüz
 * çizgisi açıklığın önünden kesintisiz geçer ve delik "delik" gibi okunmazdı
 * (kâğıtta `WALL_OPENING_BLEED_CM` ile aynı hesap — çizgi kalınlığı poligonu
 * her yöne YARISI kadar büyüttüğü için değer konturun iki katı).
 *
 * Kapı kanadı da İÇİ BOŞ (K154/K165): hayalette dolu mimari yüzey kalmadı.
 */
export function GhostOpening({
  outline,
  type,
  zoom,
}: {
  outline: readonly PlanPoint[]
  type: OpeningType
  /** Şişirme payı duvar konturuna bağlı, o da zoom'a. */
  zoom: number
}) {
  const symbol = getOpeningSymbol(outline, type)
  const closedOutline = [...outline, outline[0]]

  return (
    <>
      <mesh
        frustumCulled={false}
        renderOrder={RENDER_ORDER.architectureGhostOpening}
        raycast={() => null}
      >
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[toOpeningFillPositions(outline, ARCHITECTURE_GHOST_ELEVATION_CM), 3]}
          />
        </bufferGeometry>
        <meshBasicMaterial color={SCENE_COLORS.background} depthWrite={false} toneMapped={false} />
      </mesh>

      <Line
        points={closedOutline.map((corner) =>
          planToThree(corner, ARCHITECTURE_GHOST_ELEVATION_CM),
        )}
        color={SCENE_COLORS.background}
        lineWidth={2 * getGhostWallOutlinePx(zoom)}
        frustumCulled={false}
        renderOrder={RENDER_ORDER.architectureGhostOpening}
        depthWrite={false}
        raycast={() => null}
        toneMapped={false}
      />

      {symbol.panel && (
        <GhostLine
          points={[...symbol.panel, symbol.panel[0]].map((corner) =>
            planToThree(corner, GHOST_SYMBOL_ELEVATION_CM),
          )}
          lineWidth={GHOST_OPENING_STROKE_WIDTHS.face}
        />
      )}

      {symbol.strokes.map((stroke) => (
        <GhostLine
          key={stroke.name}
          points={stroke.points.map((corner) => planToThree(corner, GHOST_SYMBOL_ELEVATION_CM))}
          lineWidth={GHOST_OPENING_STROKE_WIDTHS[stroke.role]}
        />
      ))}
    </>
  )
}
