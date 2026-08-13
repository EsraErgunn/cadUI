import type { PlanPoint } from '../../core/coords'
import type { Point, Wall } from '../../core/model'
import { getSegmentAngleDeg, getWallEnds, projectOntoSegment } from '../../core/wall'

export type WallParallelCandidate = {
  wallId: Wall['id']
  position: PlanPoint
}

const DEG_TO_RAD = Math.PI / 180

/**
 * Duvarın YÜZÜNDEN sonra bırakılacak asgari boşluk — flush temas bile "üst
 * üste biniyor" gibi görünüyordu (kullanıcı isteği, 2026-08).
 */
const WALL_CLEARANCE_CM = 5

/**
 * Anchor'dan geçen, `wall`ın AÇISINA paralel doğru üzerinde imlece en yakın
 * nokta — mesafe/yarıçap KONTROLÜ YOK, çağıran karar verir (bkz.
 * `findNearestWallParallel` yarıçaplı sürümü ve `wallParallelLock.ts`'in
 * sınırsız/"kilitli" kullanımı). `getSegmentAngleDeg` sabit bir değer —
 * duvarın kapsül (yuvarlak uçlu, `capsule-walls.md`) render'ından bağımsız,
 * hep düz eksenin açısı.
 *
 * **Boru duvara HİÇBİR ZAMAN değmez** (kullanıcı isteği, iki kez tekrarlandı):
 * paralel doğru anchor'ın kendi dik uzaklığını miras aldığı için normal
 * durumda zaten duvara değmez (anchor daha önce ayrı bir jestle konmuştur,
 * ender olarak duvarın üstündedir). Yine de bir GÜVENCE olarak, sonucun
 * duvara dik uzaklığı `wall.thickness/2 + WALL_CLEARANCE_CM`'in altındaysa
 * (anchor'ın kendisi bu payın altında kalmışsa) sonuç duvardan uzağa DİK
 * itilir — yön hâlâ paralel kalır, yalnız bu ender köşede anchor'la aynı dik
 * ofseti paylaşmaz.
 */
export function getWallParallelPosition(
  wall: Wall,
  points: readonly Point[],
  anchor: PlanPoint,
  cursor: PlanPoint,
): PlanPoint | null {
  const ends = getWallEnds(wall, points)
  if (!ends) return null

  const angleRad = getSegmentAngleDeg(ends.p1, ends.p2) * DEG_TO_RAD
  const dirX = Math.cos(angleRad)
  const dirY = Math.sin(angleRad)
  const normalX = -dirY
  const normalY = dirX

  // Anchor'dan imlece giden vektörün, duvar yönündeki İZDÜŞÜMÜ: sonuç anchor'ı
  // içeren, duvara paralel bir doğru üzerinde — duvarın kendisiyle hiç kesişmek
  // zorunda değil.
  const alongCm = (cursor.x - anchor.x) * dirX + (cursor.y - anchor.y) * dirY
  let position = { x: anchor.x + dirX * alongCm, y: anchor.y + dirY * alongCm }

  // Dik ofset anchor'dan MİRAS alınır (dir boyunca kayma onu değiştirmez);
  // güvence bu ofsetin asgari payın altına düşmediğini denetler.
  const minClearanceCm = wall.thickness / 2 + WALL_CLEARANCE_CM
  const perpCm = (position.x - ends.p1.x) * normalX + (position.y - ends.p1.y) * normalY
  if (Math.abs(perpCm) < minClearanceCm) {
    // Anchor'ın kendi tarafı işareti taşır; anchor tam eksendeyse (perpCm≈0)
    // imlecin kendi tarafına itilir, yoksa hangi yöne itileceği belirsiz kalır.
    const cursorPerpCm = (cursor.x - ends.p1.x) * normalX + (cursor.y - ends.p1.y) * normalY
    const sign = Math.abs(perpCm) < 1e-9 ? Math.sign(cursorPerpCm) || 1 : Math.sign(perpCm)
    const pushCm = sign * minClearanceCm - perpCm
    position = { x: position.x + normalX * pushCm, y: position.y + normalY * pushCm }
  }

  return position
}

/**
 * Devam eden bir çizimde (zincirin bir ANCHOR'ı varken) yeni köşeyi imlece en
 * yakın duvarın AÇISINA paralel bir doğruya kelepçeler. Ürün kuralı borunun
 * duvarlara paralel çizilmesini ister; eskiden bu, imleci duvarın belirli bir
 * NOKTASINA (eksen ya da yüz) yapıştırarak yapılıyordu — kullanıcı isteği
 * (2026-08): artık belirli bir noktaya yapışma YOK, yalnız YÖN kelepçelenir.
 * Konum saf anchor + imleç izdüşümünden gelir.
 *
 * Yakınlık imlecin duvarın EKSENİNE (segment, uçlarda kelepçeli) dik
 * uzaklığıyla ölçülür — "yakın duvar" ifadesi bunu karşılıyor; sonuç konumla
 * bu uzaklığın bir ilgisi yok, yalnız hangi duvarın açısının kullanılacağını
 * ve bir aday olup olmadığını belirliyor. Duvarın ucundan ÖTEYE geçen bir
 * imleç için bu uzaklık büyür ve aday düşebilir — `wallParallelLock.ts`
 * kilitliyken bunun yerine sınırsız `getWallParallelPosition`i kullanır ki
 * "duvar bitince" kelepçe de bitmesin (kullanıcı isteği).
 */
export function findNearestWallParallel(
  walls: readonly Wall[],
  points: readonly Point[],
  anchor: PlanPoint,
  cursor: PlanPoint,
  radiusCm: number,
): WallParallelCandidate | null {
  if (radiusCm <= 0) return null

  let nearest: WallParallelCandidate | null = null
  let nearestDistanceCm = Number.POSITIVE_INFINITY

  for (const wall of walls) {
    const ends = getWallEnds(wall, points)
    if (!ends) continue

    const projection = projectOntoSegment(ends.p1, ends.p2, cursor)
    if (projection.distanceCm > radiusCm || projection.distanceCm >= nearestDistanceCm) continue

    const position = getWallParallelPosition(wall, points, anchor, cursor)
    if (!position) continue

    nearest = { wallId: wall.id, position }
    nearestDistanceCm = projection.distanceCm
  }

  return nearest
}
