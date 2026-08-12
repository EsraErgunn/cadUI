/**
 * Katman elevation'ları (cm). Ortografik tepe kamerada görüntüyü değiştirmez;
 * amaç z-fighting'i bitirmek. renderOrder değerleri src/scene/layers.ts'te.
 */
export const ARCHITECTURE_GHOST_ELEVATION_CM = -0.5
/** Hayalet açıklığın simgesi dolgusunun bir tık üstünde: ikisi de opak, dolgu kanadı örtmesin. */
export const ARCHITECTURE_GHOST_SYMBOL_LIFT_CM = 0.02
/** Tesisatın mimari görünümdeki izi; sıra renderOrder ile belirlenir (bkz. layers.ts). */
export const INSTALLATION_GHOST_ELEVATION_CM = 0.15
/** Baca/havalandırma borunun bir tık ALTINDA: konu gaz hattı, kanalın üstünden geçmeli. */
export const DISCHARGE_ELEVATION_CM = -0.05
export const LINE_ELEVATION_CM = 0
/** Uç işareti hattın bir tık üstünde: ikisi de opak, hat işareti örtmesin. */
export const LINE_END_MARKER_LIFT_CM = 0.05
export const INSULATION_ELEVATION_CM = 0.1
export const SYMBOL_ELEVATION_CM = 0.2
/** Yerleşmiş her şeyin üstünde: hat ve sembol önizlemesi ortak kullanır. */
export const PREVIEW_ELEVATION_CM = 0.3
/** Seçim çerçevesi port işaretlerinin ALTINDA: ikisi kutunun kenarında kesişiyor. */
export const SELECTION_OUTLINE_ELEVATION_CM = 0.35
export const PORT_MARKER_ELEVATION_CM = 0.4
/** Eleman ad etiketi sembollerin üstünde, ölçü yazısının altında. */
export const ELEMENT_LABEL_ELEVATION_CM = 0.45
export const MEASUREMENT_ELEVATION_CM = 0.5
/** Seçim çerçevesi en üstte: altındaki her şeyin üzerinde okunmalı. */
export const SELECTION_MARQUEE_ELEVATION_CM = 0.6
