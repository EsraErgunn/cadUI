import type { PlanPoint } from './coords'
import { pickGridLevel, snapPointToGrid } from './grid'

/**
 * Bırakma noktası aktif zoom'un İNCE ızgara adımına oturur — kullanıcı ızgarada
 * gördüğü çizgiye bırakır, kademe değişince snap adımı da onunla değişir. Sabit
 * adım kullanılsaydı uzaklaşınca snap görünmez olurdu.
 *
 * Mimari nokta sembolü ve tesisat elemanı AYNI kuralı paylaşıyor; bu yüzden
 * plumbing/core/placement.ts'ten buraya taşındı. İki yerde yaşasaydı biri
 * ızgara kademesi değiştiğinde diğerinden ayrışırdı.
 */
export function getPlacementPosition(planPoint: PlanPoint, zoom: number): PlanPoint {
  return snapPointToGrid(planPoint, getPlacementStepCm(zoom))
}

/**
 * Aktif zoom'un yakalama adımı. Ayrıca dışa açık, çünkü bir KONUMU değil bir
 * KAYMAYI ızgaraya yuvarlaması gerekenler var (pano yapıştırması): adım iki
 * yerde ayrı ayrı seçilseydi biri ızgara kademesi değişince ayrışırdı.
 */
export function getPlacementStepCm(zoom: number): number {
  return pickGridLevel(zoom).minorCm
}
