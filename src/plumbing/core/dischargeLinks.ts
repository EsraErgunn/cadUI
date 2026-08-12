import { getTargetElementId } from './installationModel'
import type { InstallationConnection, InstallationLine } from './installationModel'
import { isDischargeKind } from './lineKinds'
import type { Id } from '../../core/model'

/**
 * Silinen cihazlarla BİRLİKTE gitmesi gereken baca/havalandırma güzergâhları.
 *
 * Gaz borusundan bilinçli fark: bir eleman silinince ona bağlı BORU kalır (boru
 * bağımsız bir varlık, ucu serbestleşir). Kanal öyle değil — cihazın eklentisi.
 * Sahipsiz kalsaydı havada asılı bir kanal olurdu ve yeniden bağlanmasının yolu
 * YOK, çünkü araç güzergâhı yalnız cihazdan BAŞLATABİLİYOR. Armatürün hattıyla
 * birlikte gitmesi kuralının kardeşi.
 */
export function collectDischargeLineIdsForElements(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  elementIds: readonly Id[],
): Id[] {
  if (elementIds.length === 0) return []

  const removedElementIds = new Set(elementIds)
  const dischargeLineIds = new Set(
    lines.filter((line) => isDischargeKind(line.kind)).map((line) => line.id),
  )

  const doomed = new Set<Id>()
  for (const connection of connections) {
    if (!dischargeLineIds.has(connection.lineId)) continue
    const targetElementId = getTargetElementId(connection.target)
    if (targetElementId === null) continue
    if (!removedElementIds.has(targetElementId)) continue
    doomed.add(connection.lineId)
  }

  return [...doomed]
}
