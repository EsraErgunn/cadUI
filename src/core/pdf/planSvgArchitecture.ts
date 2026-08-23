import { svgPolygon, svgPolyline, svgText, PLAN_COLORS, WALL_OUTLINE_CM } from './svgPrimitives'
import type { Id, Opening, Point, Room, Wall } from '../model'
import { getOpeningOutline } from '../opening'
import { getOpeningSymbol, type OpeningSymbolRole } from '../openingSymbol'
import { findRoomFaces } from '../room'
import { getWallSetKey } from '../roomIdentity'
import { getRoomLabelAnchor, toSquareMetres } from '../roomLabel'
import { getRoomDisplayName } from '../roomUsage'

/** Oda adı ve alanının PLAN santimi cinsinden yüksekliği. */
const ROOM_NAME_HEIGHT_CM = 22
const ROOM_AREA_HEIGHT_CM = 16

/**
 * Açıklığın beyazının duvar yüzünden dışarı taşma payı (cm). Kontur genişliği
 * poligonu her yöne YARISI kadar büyüttüğü için değer iki katı seçilir.
 */
const WALL_OPENING_BLEED_CM = 2 * WALL_OUTLINE_CM

/**
 * Açıklık sembolünün çizgi kalınlıkları (cm). Ekrandaki 1.8 / 1.2 / 1 piksel
 * oranının kâğıt karşılığı — söve baskın, ayrıntı ince.
 */
const OPENING_STROKE_WIDTHS_CM: Record<OpeningSymbolRole, number> = {
  jamb: 3,
  face: 2,
  detail: 1.5,
}

export type PlanRoomsInput = {
  points: readonly Point[]
  floorWalls: readonly Wall[]
  rooms: readonly Room[]
  floorId: Id
  fontFamily: string
}

export type PlanRoomsSvg = {
  /** Ad ve alan yazıları — EN ÜSTE girer, çağıran sırayı kuruyor. */
  labels: string[]
}

/**
 * Oda ad ve alan yazıları.
 *
 * ⚠️ Oda DOLGUSU basılmıyor (K154): pafta tesisat odaklı ve dolu hiçbir mimari
 * yüzey yok. Ad ile m² duruyor — tesisatçının hangi cihazın hangi mahalde
 * olduğunu okuması gerekiyor, oda tanınmadan pafta işe yaramıyor.
 */
export function buildPlanRoomsSvg(input: PlanRoomsInput): PlanRoomsSvg {
  const { points, floorWalls, rooms, floorId, fontFamily } = input

  const roomByWallSet = new Map<string, Room>()
  for (const room of rooms) roomByWallSet.set(getWallSetKey(room.wallIds), room)

  const labels: string[] = []

  for (const face of findRoomFaces(floorWalls, points, floorId)) {
    const room = roomByWallSet.get(getWallSetKey(face.wallIds))
    if (!room) continue

    const anchor = getRoomLabelAnchor(face.corners)
    labels.push(
      // Serbest metin ad KALKTI (K117): etiket kullanım tipinden türer,
      // tip seçilmemişse "Tanımsız". Türetim ekranla AYNI fonksiyondan
      // (`Room.tsx` de bunu çağırıyor) — kâğıt kendi adlandırmasını uydurmaz.
      svgText(anchor, getRoomDisplayName(room.usageType), {
        fontFamily,
        sizeCm: ROOM_NAME_HEIGHT_CM,
        color: PLAN_COLORS.architectureText,
      }),
      svgText(
        { x: anchor.x, y: anchor.y - ROOM_NAME_HEIGHT_CM },
        `${toSquareMetres(face.areaCm2).toFixed(2)} m²`,
        { fontFamily, sizeCm: ROOM_AREA_HEIGHT_CM, color: PLAN_COLORS.architectureText },
      ),
    )
  }

  return { labels }
}

/**
 * Kapı ve pencereler — EKRANDAKİ sembolle.
 *
 * Önce boşluk beyaza boyanır — duvar konturunun İKİ yüz çizgisi burada kesilsin
 * diye; delik gerçekten delik gibi okunur. Sonra söve/yüz çizgileri ve varsa
 * kapı kanadı basılır. Düz beyaz bir dikdörtgen yeterli değildi: kapı ile
 * pencere ayırt edilemiyordu (kullanıcı bildirimi).
 *
 * ⚠️ Kapı kanadı da İÇİ BOŞ (K154): mimaride dolu yüzey kalmadı, kanat yalnız
 * konturuyla çizilir.
 *
 * ⚠️ Duvarlardan SONRA çizilmeli; sırayı çağıran kuruyor.
 */
export function buildPlanOpeningsSvg(
  openings: readonly Opening[],
  floorWalls: readonly Wall[],
  points: readonly Point[],
): string[] {
  const floorWallById = new Map(floorWalls.map((wall) => [wall.id, wall]))
  const body: string[] = []

  for (const opening of openings) {
    const wall = floorWallById.get(opening.wallId)
    if (!wall) continue

    const outline = getOpeningOutline(wall, points, opening)
    if (!outline) continue

    // Boşluk, duvar konturu KADAR şişirilerek boyanır. Poligonun kendisi tam
    // duvar kalınlığında; olduğu gibi basılsaydı duvarın iki yüz çizgisi
    // açıklığın önünden kesintisiz geçer, delik "delik" gibi okunmazdı. Aynı
    // renkte kontur vermek poligonu her yöne yarım kontur genişletir —
    // `WALL_OPENING_BLEED_CM` bunun İKİ katı olduğu için taşma tam yüz çizgisi
    // kadar oluyor.
    body.push(
      svgPolygon(outline, PLAN_COLORS.wallVoid, {
        color: PLAN_COLORS.wallVoid,
        widthCm: WALL_OPENING_BLEED_CM,
      }),
    )

    const symbol = getOpeningSymbol(outline, opening.type)
    if (symbol.panel) {
      body.push(
        svgPolygon(symbol.panel, 'none', {
          color: PLAN_COLORS.faint,
          widthCm: OPENING_STROKE_WIDTHS_CM.face,
        }),
      )
    }
    for (const stroke of symbol.strokes) {
      body.push(
        svgPolyline(stroke.points, OPENING_STROKE_WIDTHS_CM[stroke.role], PLAN_COLORS.faint),
      )
    }
  }

  return body
}
