/**
 * Katman elevation'ları (cm). Ortografik tepe kamerada görüntüyü değiştirmez;
 * amaç z-fighting'i bitirmek. renderOrder değerleri src/scene/layers.ts'te.
 */
export const ARCHITECTURE_GHOST_ELEVATION_CM = -0.5
/** Tesisatın mimari görünümdeki izi; sıra renderOrder ile belirlenir (bkz. layers.ts). */
export const INSTALLATION_GHOST_ELEVATION_CM = 0.15
export const LINE_ELEVATION_CM = 0
export const INSULATION_ELEVATION_CM = 0.1
export const SYMBOL_ELEVATION_CM = 0.2
/** Yerleşmiş her şeyin üstünde: hat ve sembol önizlemesi ortak kullanır. */
export const PREVIEW_ELEVATION_CM = 0.3
/** Seçim çerçevesi port işaretlerinin ALTINDA: ikisi kutunun kenarında kesişiyor. */
export const SELECTION_OUTLINE_ELEVATION_CM = 0.35
export const PORT_MARKER_ELEVATION_CM = 0.4
export const MEASUREMENT_ELEVATION_CM = 0.5
