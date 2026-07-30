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
