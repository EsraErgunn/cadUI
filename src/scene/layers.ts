/**
 * Katman sırası. Mesh'e elle sayı yazılmaz, buradan alınır.
 * Mimari altta soluk, tesisat üstte (CLAUDE.md scene kuralı).
 */
export const RENDER_ORDER = {
  gridMinor: 0,
  gridMajor: 1,
  room: 10,
  wall: 20,
  opening: 30,
  pipe: 40,
  fitting: 50,
  equipment: 60,
  warning: 90,
  handle: 100,
} as const

/** Plan düzlemi y = 0. Izgara bir tık altta durur ki duvarlarla z-fighting olmasın. */
export const GRID_ELEVATION_CM = -1
