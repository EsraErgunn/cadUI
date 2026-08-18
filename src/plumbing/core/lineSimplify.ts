import type { InstallationLinePoint } from './installationModel'
import { isSamePoint } from './lineGeometry'
import type { Id } from '../../core/model'

/** Bu sapmanın altındaki çapraz çarpım sıfır sayılır (kayan nokta payı). */
const COLLINEAR_EPSILON_CM = 1e-6

/**
 * Üç nokta aynı doğru üzerinde mi? Çapraz çarpımın büyüklüğü segment
 * uzunluklarıyla orantılı büyüdüğünden ölçekten bağımsız sabit bir eşik
 * yeterli (armatür payları/boru uzunlukları santimetre mertebesinde).
 */
function isCollinear(a: InstallationLinePoint, b: InstallationLinePoint, c: InstallationLinePoint): boolean {
  // Komşu segmentlerden biri PLAN boyu sıfırsa (kasıtlı dikey bağlantı, K98)
  // çapraz çarpım sıfır vektörle çarpılıp otomatik "doğrusal" çıkar — köşe
  // gürültü değil, silinmemeli.
  if (isSamePoint(a.position, b.position) || isSamePoint(b.position, c.position)) return false

  const cross =
    (b.position.x - a.position.x) * (c.position.y - a.position.y) -
    (b.position.y - a.position.y) * (c.position.x - a.position.x)
  return Math.abs(cross) < COLLINEAR_EPSILON_CM
}

/**
 * Bir armatür silinince boşa çıkan ORTA nokta, komşularıyla aynı doğru
 * üzerindeyse artık geometrik anlamı olmayan bir köşedir: `onLine` armatür
 * zaten DÜZ bir boruyu ayırarak oraya oturmuştu (bkz. knowledge/element-attach.md).
 * Kullanıcı armatürü sildikten sonra bu köşe kalırsa boru gereksiz yere bölünmüş
 * görünür. Komşular arasında açı varsa (kullanıcı köşeyi sonradan sürüklemiş)
 * `null` döner — o zaman köşe gerçek bir geometri taşır, silinmez.
 *
 * Uçtaki noktalar (index 0 / son) hiç aday değildir: `onLine` armatür yalnız
 * hattın ortasına oturur, silme burada hiç çağrılmaz.
 */
export function findCollapsiblePassThroughIndex(
  points: readonly InstallationLinePoint[],
  pointId: Id,
): number | null {
  const index = points.findIndex((point) => point.id === pointId)
  if (index <= 0 || index >= points.length - 1) return null

  if (!isCollinear(points[index - 1], points[index], points[index + 1])) return null

  return index
}
