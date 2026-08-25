import { Line, Text } from '@react-three/drei'

import { FONT_URL } from './LengthLabels'
import { ARCHITECTURE_GHOST_ELEVATION_CM } from './plumbingLayers'
import { PLUMBING_COLORS } from './plumbingTheme'
import type { AreaObjectShape } from '../../core/areaObject'
import { getAreaObjectPlanGeometry } from '../../core/areaObjectGeometry'
import { getBeamCorners, type BeamShape } from '../../core/beam'
import { planToThree, type PlanPoint } from '../../core/coords'
import type { AreaObjectType } from '../../core/model'
import {
  AREA_OBJECT_STROKE_WIDTHS_CM,
  BEAM_DASH_SIZE_CM,
  BEAM_GAP_SIZE_CM,
  BEAM_STROKE_WIDTH_CM,
  getArchitectureStrokeWidthPx,
} from '../../scene/architectureStrokeStyle'
import { RENDER_ORDER } from '../../scene/layers'

/**
 * `ArchitectureGhost`in (Ghosts.tsx) oda/kiriş/alan nesnesi şekilleri — ayrı
 * dosyada, duvar+açıklık (`ArchitectureGhostWalls.tsx`) ve nokta sembolü
 * (`ArchitectureGhostPointSymbol.tsx`) ile birlikte 200 satır sınırını aşıyordu.
 *
 * Her şekil, mimari görünümdeki KARŞILIĞIYLA (Room/Beam/AreaObject.tsx) AYNI
 * geometriden çizilir; değişen yalnız çizim dili — hayalet, kâğıttaki kat planı
 * paftası gibi İÇİ BOŞ ve iki kademeli tonda basılır (K165).
 *
 * ⚠️ Bu dosyadaki hiçbir şeklin DOLGUSU yok (K154/K165): tesisat görünümünde
 * konu gaz hattı, mimari yalnız bağlam — altından geçen boru hiçbir mimari
 * yüzeyin arkasında kalmamalı. Kaldırılan dolgular: oda, kiriş, alan nesnesi.
 */

/** Türkçe büyük harf i → İ; varsayılan locale I üretir ve ad yanlış okunur (RoomLabel.tsx ile aynı). */
const TURKISH_LOCALE = 'tr-TR'
const GHOST_ROOM_NAME_SIZE_CM = 26
const GHOST_ROOM_AREA_SIZE_CM = 20
/** Ad ile alan arasındaki dikey boşluk; ikisi ortak bir blok gibi okunsun (RoomLabel.tsx). */
const GHOST_ROOM_LINE_GAP_CM = 6

/**
 * Hayalet oda ETİKETİ: büyük harf ad + altında m² (kullanıcı isteği, 2026-08:
 * "mahal tanımları silinmesin ghost modunda"). Oda DOLGUSU kalktığı için
 * (K165) mahali gösteren tek işaret bu; kâğıtta da öyle — pafta oda yüzeyini
 * basmıyor, adı ve alanı basıyor (`planSvgArchitecture.ts`).
 *
 * `RoomLabel.tsx` ile AYNI çapa (`getRoomLabelAnchor`), aynı büyük harf
 * dönüşümü ve aynı iki satır düzeni; ROZET yok — hayalet bağlam, kâğıt gibi
 * düz basılır.
 */
export function GhostRoomLabel({
  anchor,
  name,
  areaM2,
}: {
  anchor: PlanPoint
  name: string
  areaM2: number
}) {
  return (
    <group
      position={planToThree(anchor, ARCHITECTURE_GHOST_ELEVATION_CM)}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <Text
        font={FONT_URL}
        fontSize={GHOST_ROOM_NAME_SIZE_CM}
        color={PLUMBING_COLORS.architectureGhostText}
        anchorX="center"
        anchorY="bottom"
        renderOrder={RENDER_ORDER.architectureGhostRoomLabel}
        raycast={() => null}
      >
        {name.toLocaleUpperCase(TURKISH_LOCALE)}
      </Text>

      <Text
        font={FONT_URL}
        position={[0, -GHOST_ROOM_LINE_GAP_CM, 0]}
        fontSize={GHOST_ROOM_AREA_SIZE_CM}
        color={PLUMBING_COLORS.architectureGhostText}
        anchorX="center"
        anchorY="top"
        renderOrder={RENDER_ORDER.architectureGhostRoomLabel}
        raycast={() => null}
      >
        {`${areaM2.toFixed(2)} m²`}
      </Text>
    </group>
  )
}

/**
 * Hayalet kiriş: `Beam.tsx` ile AYNI dikdörtgen ve AYNI kesik kontur, yalnız
 * dolgusuz ve soluk tonda. Sıfır boy kirişte `getBeamCorners` undefined döner,
 * çizilmez.
 *
 * Kalınlık sabitleri gerçek kirişle ORTAK (`architectureStrokeStyle.ts`);
 * burada kopyaları duruyordu ve "gerçeğiyle aynı oran" notuna rağmen ikisi
 * elle senkron tutuluyordu.
 */
export function GhostBeam({ beam, zoom }: { beam: BeamShape; zoom: number }) {
  const corners = getBeamCorners(beam)
  if (!corners) return null

  return (
    <Line
      points={[...corners, corners[0]].map((corner) =>
        planToThree(corner, ARCHITECTURE_GHOST_ELEVATION_CM),
      )}
      color={PLUMBING_COLORS.architectureGhostFaint}
      lineWidth={getArchitectureStrokeWidthPx(BEAM_STROKE_WIDTH_CM, zoom)}
      dashed
      dashSize={BEAM_DASH_SIZE_CM}
      gapSize={BEAM_GAP_SIZE_CM}
      frustumCulled={false}
      renderOrder={RENDER_ORDER.architectureGhostBeam}
      depthWrite={false}
      raycast={() => null}
      toneMapped={false}
    />
  )
}

/**
 * Hayalet alan nesnesi (merdiven/kolon/baca şaftı/kolon havalandırması):
 * `AreaObject.tsx` ile AYNI geometriden (`core/areaObjectGeometry.ts`), soluk
 * tonda ve İÇİ BOŞ. Sınır poligonu dolgu yerine KONTUR olarak çizilir —
 * kâğıttaki karşılığıyla aynı (`planSvgObjects.ts`, K154): kolonun bile dolgusu
 * yok, altından geçen boru mimari yüzeyin arkasında kalmamalı.
 */
export function GhostAreaObject({
  type,
  areaObject,
  zoom,
}: {
  type: AreaObjectType
  areaObject: AreaObjectShape
  zoom: number
}) {
  const geometry = getAreaObjectPlanGeometry(type, areaObject)

  return (
    <>
      {geometry.fill.length > 0 && (
        <Line
          points={[...geometry.fill, geometry.fill[0]].map((point) =>
            planToThree(point, ARCHITECTURE_GHOST_ELEVATION_CM),
          )}
          color={PLUMBING_COLORS.architectureGhostFaint}
          lineWidth={getArchitectureStrokeWidthPx(AREA_OBJECT_STROKE_WIDTHS_CM.body, zoom)}
          frustumCulled={false}
          renderOrder={RENDER_ORDER.architectureGhostAreaObject}
          depthWrite={false}
          raycast={() => null}
          toneMapped={false}
        />
      )}

      {geometry.strokes.map((stroke) => (
        <Line
          key={stroke.name}
          points={stroke.points.map((point) =>
            planToThree(point, ARCHITECTURE_GHOST_ELEVATION_CM),
          )}
          color={PLUMBING_COLORS.architectureGhostFaint}
          lineWidth={getArchitectureStrokeWidthPx(
            AREA_OBJECT_STROKE_WIDTHS_CM[stroke.role],
            zoom,
          )}
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
