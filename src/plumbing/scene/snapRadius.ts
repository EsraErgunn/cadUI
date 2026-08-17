/**
 * Yakalama yarıçapı EKRAN piksel cinsinden: zoom'a bölündüğü için yakalama
 * uzaklığı her ölçekte aynı hissedilir. Izgara adımından (en küçüğü 50 cm) daha
 * dar tutulur ki snap ızgarayı bastırırken hedefi şaşırmasın.
 *
 * Hat aracı ve eleman yerleştirme AYNI değeri kullanır: iki araç farklı
 * yarıçapla çalışsaydı aynı boruya biri yapışır diğeri yapışmazdı.
 */
export const SNAP_RADIUS_PX = 14

export function getSnapRadiusCm(zoom: number): number {
  return SNAP_RADIUS_PX / zoom
}

/**
 * Boru duvarın YÜZÜNE bu kadar ekran pikseli kadar yaklaşabilir — neredeyse
 * bitişik ama asla tam üst üste değil (kullanıcı isteği, 2026-08: eski sabit
 * 5cm pay "duvardan uzak duruyor" hissi veriyordu, artık ekran pikseli kadar).
 */
export const WALL_EDGE_GAP_PX = 2

export function getWallEdgeGapCm(zoom: number): number {
  return WALL_EDGE_GAP_PX / zoom
}
