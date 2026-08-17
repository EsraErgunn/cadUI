import type { PlanPoint } from '../../core/coords'
import { projectOntoClosestOrthogonalAxis } from './orthogonalAxis'

/**
 * Duvar YOKKEN (`wallParallelLock` boş döndüğünde) devreye giren genel
 * kelepçe: yeni köşe dünya ekseninin YATAY ya da DİKEY doğrusundan imlece
 * daha yakın olanına düşürülür — HER ZAMAN, toleranssız. Boru "rastgele bir
 * yere" (çapraz, herhangi bir açıda) çizilemez (2026-08 ürün kuralı,
 * CLAUDE.md → "borular duvarlara paralel (yatay/dikey)"); önceki tasarım
 * yalnız hedef açıya (45°'nin katları) YAKINKEN yakalıyor, dışındaysa imleci
 * serbest bırakıyordu — bu, duvarsız bölgede çapraz borulara izin veriyordu
 * ve kullanıcı bunu "saçmalama" olarak bildirdi. Duvar kilidiyle
 * (`wallSnap.ts`) AYNI hesabı paylaşır (`orthogonalAxis.ts`), yalnız temel
 * açı dünya ekseni (0°) — kilit YOK çünkü zaten iki sabit adaydan (0°/90°)
 * başka seçenek yok, kararsızlık riski taşımıyor.
 */
export function snapToOrthogonalAxis(anchor: PlanPoint, cursor: PlanPoint): PlanPoint {
  return projectOntoClosestOrthogonalAxis(0, anchor, cursor)
}
