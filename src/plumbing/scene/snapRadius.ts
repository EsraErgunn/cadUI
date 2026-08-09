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
