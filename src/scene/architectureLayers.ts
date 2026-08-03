/**
 * Mimari katman elevation'ları (cm). Ortografik tepe kamerada görüntüyü
 * değiştirmez; amaç z-fighting'i bitirmek. renderOrder değerleri layers.ts'te.
 */
export const WALL_ELEVATION_CM = 0
export const OPENING_ELEVATION_CM = 0.1
export const OPENING_PREVIEW_ELEVATION_CM = 0.2
/**
 * Sembol (kapı kanadı, cam çizgileri) açıklık dolgusunun bir tık üstünde durur.
 * İkisi de opak mesh: aynı elevation'da çizim sırası malzeme oluşturma sırasına
 * kalır ve beyaz dolgu kanadı örtebilir.
 */
export const OPENING_SYMBOL_LIFT_CM = 0.02
