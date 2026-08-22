import { svgPolygon, svgPolyline, svgText, SVG_COLORS } from './svgPrimitives'
import type { Id, Opening, Point, Room, Wall } from '../model'
import { getOpeningOutline } from '../opening'
import { getOpeningSymbol, type OpeningSymbolRole } from '../openingSymbol'
import { findRoomFaces } from '../room'
import { insetRoomPolygon } from '../roomFill'
import { getWallSetKey } from '../roomIdentity'
import { getRoomLabelAnchor, toSquareMetres } from '../roomLabel'
import { getRoomDisplayName } from '../roomUsage'

/** Oda adı ve alanının PLAN santimi cinsinden yüksekliği. */
const ROOM_NAME_HEIGHT_CM = 22
const ROOM_AREA_HEIGHT_CM = 16

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
  /** Dolgular — çizim sırasının EN ALTINA girer. */
  fills: string[]
  /** Ad ve alan yazıları — EN ÜSTE girer, çağıran sırayı kuruyor. */
  labels: string[]
}

/**
 * Oda dolguları ve ad/alan yazıları.
 *
 * Dolgu ile yazı AYRI dönüyor: dolgu duvarların altında, yazı her şeyin üstünde
 * olmalı. Tek liste dönseydi çağıran ikisini ayıramaz, ya dolgu duvarı örterdi
 * ya yazı duvarın altında kalırdı.
 */
export function buildPlanRoomsSvg(input: PlanRoomsInput): PlanRoomsSvg {
  const { points, floorWalls, rooms, floorId, fontFamily } = input

  const roomByWallSet = new Map<string, Room>()
  for (const room of rooms) roomByWallSet.set(getWallSetKey(room.wallIds), room)

  const thicknessById = new Map<Id, number>()
  for (const wall of floorWalls) thicknessById.set(wall.id, wall.thickness)

  const fills: string[] = []
  const labels: string[] = []

  for (const face of findRoomFaces(floorWalls, points, floorId)) {
    const inset = insetRoomPolygon(
      face.corners,
      face.wallIds.map((wallId) => thicknessById.get(wallId) ?? 0),
    )
    if (inset) fills.push(svgPolygon(inset, SVG_COLORS.roomFill))

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
        color: SVG_COLORS.label,
      }),
      svgText(
        { x: anchor.x, y: anchor.y - ROOM_NAME_HEIGHT_CM },
        `${toSquareMetres(face.areaCm2).toFixed(2)} m²`,
        { fontFamily, sizeCm: ROOM_AREA_HEIGHT_CM, color: SVG_COLORS.label },
      ),
    )
  }

  return { fills, labels }
}

/**
 * Kapı ve pencereler — EKRANDAKİ sembolle.
 *
 * Önce boşluk beyaza boyanır (duvar kütlesi delinsin), sonra söve/yüz çizgileri
 * ve varsa kapı kanadı basılır. Düz beyaz bir dikdörtgen yeterli değildi: kapı
 * ile pencere ayırt edilemiyordu (kullanıcı bildirimi).
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

    body.push(svgPolygon(outline, SVG_COLORS.openingFill))

    const symbol = getOpeningSymbol(outline, opening.type)
    if (symbol.panel) body.push(svgPolygon(symbol.panel, SVG_COLORS.symbol))
    for (const stroke of symbol.strokes) {
      body.push(
        svgPolyline(stroke.points, OPENING_STROKE_WIDTHS_CM[stroke.role], SVG_COLORS.symbol),
      )
    }
  }

  return body
}
