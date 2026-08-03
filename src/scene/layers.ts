/**
 * Katman sırası. Mesh'e elle sayı yazılmaz, buradan alınır.
 * Mimari altta soluk, tesisat üstte (CLAUDE.md scene kuralı).
 */
export const RENDER_ORDER = {
  gridMinor: 0,
  gridMajor: 1,
  architectureGhost: 5,
  room: 10,
  wall: 20,
  opening: 30,
  /**
   * Tesisatın mimari görünümdeki soluk izi. architectureGhost'un aksine mimarinin
   * ÜSTÜNDE: "hayalet"liği saydamlıktan geliyor, derinlikten değil. Altına konsaydı
   * (oda dolgusu geldiğinde) tamamen kaybolurdu.
   */
  installationGhost: 35,
  pipe: 40,
  insulation: 45,
  fitting: 50,
  equipment: 60,
  linePreview: 70,
  portMarker: 80,
  warning: 90,
  measurement: 95,
  handle: 100,
  label: 110,
} as const

/** Plan düzlemi y = 0. Izgara bir tık altta durur ki duvarlarla z-fighting olmasın. */
export const GRID_ELEVATION_CM = -1

/** Mimari katmanın elevation'ları (cm). Tepe kamerada görüntüyü değiştirmez, z-fighting'i keser. */
export const ROOM_ELEVATION_CM = -0.2
export const WALL_ELEVATION_CM = 0
export const OPENING_ELEVATION_CM = 0.1
export const WALL_PREVIEW_ELEVATION_CM = 0.2
export const HANDLE_ELEVATION_CM = 0.3
