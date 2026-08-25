import type { Id } from '../../core/model'
import {
  getTargetElementId,
  type InstallationConnection,
} from '../../plumbing/core/installationModel'

/**
 * Vurgulanan hattın uçlarına bağlı elemanlar. Hem SEMBOL hem ETİKET bunu okur:
 * bir cihaz solmuş dururken künyesi tam opak kalsaydı ekranda sahipsiz bir yazı
 * asılı olurdu (kullanıcı bildirimi, K167).
 *
 * `IsometricLayer`'dan buraya taşındı — iki tüketicisi olunca sahne bileşeninin
 * içinde kalması onu ikinci kez yazdırırdı.
 */
export function getConnectedElementIds(
  lineId: Id,
  connections: readonly InstallationConnection[],
): Set<Id> {
  const elementIds = new Set<Id>()
  for (const connection of connections) {
    if (connection.lineId !== lineId) continue
    const elementId = getTargetElementId(connection.target)
    if (elementId !== null) elementIds.add(elementId)
  }
  return elementIds
}
