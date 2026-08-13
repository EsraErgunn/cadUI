import type { PlanPoint } from '../../core/coords'
import { getSegmentLength } from '../../core/wall'

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI

/** 45°'lik adımlarla sekiz yön (0/45/90/135/180/225/270/315) — yalnız yatay/dikey
 *  DEĞİL, çapraz da (kullanıcı isteği, 2026-08: "45 derece 90 derece falan yapsın"). */
export const ANGLE_SNAP_STEP_DEG = 45

/**
 * Bu toleransın DIŞINDA imleç serbest kalır — sabit bir 45°'lik ızgaraya
 * KİLİTLEMEK yerine yalnız hedef açıya yakınken yakalanır (kullanıcı isteği:
 * "her zaman dümdüz ilerlemesin, biraz da oynasın"). Duvara paralel kelepçe
 * (`wallParallelLock.ts`) BİLEREK toleranssız/sıkı — o özel bir hedefe
 * (gerçek bir duvara) kilitleniyor; bu ise duvar YOKKEN genel bir yardımcı,
 * rijit olursa serbest çizim hissini bozardı.
 */
export const ANGLE_SNAP_TOLERANCE_DEG = 6

function normalizeDeg(deg: number): number {
  return ((deg % 360) + 360) % 360
}

/**
 * Anchor'dan imlece giden yönü en yakın 45°'lik adıma yakalar — yalnız
 * toleransın içindeyse (aksi hâlde `null`, çağıran ham/ızgara noktasına
 * düşer). Duvara paralel kelepçenin (öncelikte daha yüksek) bir ALTERNATİFİ:
 * duvar yakınında değilken de kullanıcı düzgün açılarla çizebilsin diye.
 * Mesafe imleçten AYNEN alınır — yalnız YÖN kelepçelenir, konum değil (aynı
 * ilke `findNearestWallParallel`de de var).
 */
export function snapToNearestAngle(anchor: PlanPoint, cursor: PlanPoint): PlanPoint | null {
  const distanceCm = getSegmentLength(anchor, cursor)
  if (distanceCm < 1e-6) return null

  const rawDeg = normalizeDeg(Math.atan2(cursor.y - anchor.y, cursor.x - anchor.x) * RAD_TO_DEG)
  const snappedDeg = normalizeDeg(Math.round(rawDeg / ANGLE_SNAP_STEP_DEG) * ANGLE_SNAP_STEP_DEG)
  const diffDeg = Math.min(Math.abs(rawDeg - snappedDeg), 360 - Math.abs(rawDeg - snappedDeg))
  if (diffDeg > ANGLE_SNAP_TOLERANCE_DEG) return null

  const snappedRad = snappedDeg * DEG_TO_RAD
  return {
    x: anchor.x + Math.cos(snappedRad) * distanceCm,
    y: anchor.y + Math.sin(snappedRad) * distanceCm,
  }
}
