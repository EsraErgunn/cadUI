import type { PlanPoint } from './coords'

/** zoom = 1 → 1 cm ekranda 1 px. Sınırlar issue 2.2: %10 … %1000. */
export const ZOOM_MIN = 0.1
export const ZOOM_MAX = 10
export const ZOOM_DEFAULT = 1

/** Tekerleğin bir çentiğinde uygulanan çarpan. */
export const ZOOM_WHEEL_FACTOR = 1.1

/** "Ekrana sığdır" sonrası kenarlarda bırakılan pay. */
const FIT_FILL_RATIO = 0.9

export type ScreenPoint = { xPx: number; yPx: number }

export type ViewportSize = { widthPx: number; heightPx: number }

export type ViewportState = {
  centerXCm: number
  centerYCm: number
  zoom: number
}

export type PlanBounds = {
  minXCm: number
  minYCm: number
  maxXCm: number
  maxYCm: number
}

export function clampZoom(zoom: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom))
}

/**
 * Ekran pikseli → plan cm.
 * Ekran y'si aşağı doğru büyür, plan y'si yukarı doğru — bu yüzden y işareti ters.
 */
export function screenToWorld(
  screen: ScreenPoint,
  view: ViewportState,
  size: ViewportSize,
): PlanPoint {
  return {
    x: view.centerXCm + (screen.xPx - size.widthPx / 2) / view.zoom,
    y: view.centerYCm - (screen.yPx - size.heightPx / 2) / view.zoom,
  }
}

export function worldToScreen(
  world: PlanPoint,
  view: ViewportState,
  size: ViewportSize,
): ScreenPoint {
  return {
    xPx: size.widthPx / 2 + (world.x - view.centerXCm) * view.zoom,
    yPx: size.heightPx / 2 - (world.y - view.centerYCm) * view.zoom,
  }
}

/**
 * İmleci sabit nokta kabul ederek yakınlaş/uzaklaş: imlecin altındaki dünya
 * noktası işlemden sonra aynı pikselde kalır (KK-4).
 */
export function zoomAtCursor(
  view: ViewportState,
  size: ViewportSize,
  cursor: ScreenPoint,
  factor: number,
): ViewportState {
  const nextZoom = clampZoom(view.zoom * factor)
  // Sınıra dayandıysak hiç dokunma; yoksa zoom değişmeden merkez kayar.
  if (nextZoom === view.zoom) return view

  const anchor = screenToWorld(cursor, view, size)
  return {
    zoom: nextZoom,
    centerXCm: anchor.x - (cursor.xPx - size.widthPx / 2) / nextZoom,
    centerYCm: anchor.y + (cursor.yPx - size.heightPx / 2) / nextZoom,
  }
}

/** Sürükleme yönü içerikle aynı olsun diye merkez ters yönde kayar. */
export function panByPixels(view: ViewportState, dxPx: number, dyPx: number): ViewportState {
  return {
    zoom: view.zoom,
    centerXCm: view.centerXCm - dxPx / view.zoom,
    centerYCm: view.centerYCm + dyPx / view.zoom,
  }
}

export function getVisibleBounds(view: ViewportState, size: ViewportSize): PlanBounds {
  const halfWidthCm = size.widthPx / 2 / view.zoom
  const halfHeightCm = size.heightPx / 2 / view.zoom
  return {
    minXCm: view.centerXCm - halfWidthCm,
    minYCm: view.centerYCm - halfHeightCm,
    maxXCm: view.centerXCm + halfWidthCm,
    maxYCm: view.centerYCm + halfHeightCm,
  }
}

/** "Ekrana sığdır" komutunun hesabı (arayüzü bu issue'da yok). */
export function fitToBounds(bounds: PlanBounds, size: ViewportSize): ViewportState {
  const centerXCm = (bounds.minXCm + bounds.maxXCm) / 2
  const centerYCm = (bounds.minYCm + bounds.maxYCm) / 2
  const widthCm = bounds.maxXCm - bounds.minXCm
  const heightCm = bounds.maxYCm - bounds.minYCm

  // Boş proje: sığdırılacak bir şey yok, varsayılan ölçeğe dön.
  if (widthCm <= 0 || heightCm <= 0) {
    return { centerXCm, centerYCm, zoom: ZOOM_DEFAULT }
  }

  const zoom = clampZoom(
    Math.min(size.widthPx / widthCm, size.heightPx / heightCm) * FIT_FILL_RATIO,
  )
  return { centerXCm, centerYCm, zoom }
}

/** "%100" komutunun hesabı: ölçek 1:1'e döner, bakılan nokta korunur. */
export function resetZoomTo100(view: ViewportState): ViewportState {
  return { ...view, zoom: ZOOM_DEFAULT }
}
