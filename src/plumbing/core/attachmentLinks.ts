import { ATTACHED_VALVE_TYPE } from './attachModes'
import { getTargetElementId } from './installationModel'
import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from './installationModel'
import { isDischargeKind } from './lineKinds'
import type { Id } from '../../core/model'

/** Cihazın EKLENTİSİ olan, tek başına var olamayan hat türleri. */
const ATTACHMENT_LINE_KINDS = new Set<InstallationLine['kind']>(['applianceStub'])

function isAttachmentLine(line: InstallationLine): boolean {
  return isDischargeKind(line.kind) || ATTACHMENT_LINE_KINDS.has(line.kind)
}

/**
 * Silinen elemanlarla BİRLİKTE gitmesi gereken hatlar.
 *
 * Gaz borusundan bilinçli fark: bir eleman silinince ona bağlı BORU kalır (boru
 * bağımsız bir varlık, ucu serbestleşir). Bu türler öyle değil — cihazın
 * eklentisi:
 *
 * - **Baca / havalandırma kanalı**: sahipsiz kalsaydı havada asılı bir kanal
 *   olurdu ve yeniden bağlanmasının yolu YOK, çünkü araç güzergâhı yalnız
 *   cihazdan BAŞLATABİLİYOR.
 * - **Cihaz kolu (`applianceStub`)**: araç paletinde bile yok, yerleştirme
 *   sırasında otomatik doğuyor. Cihaz silinince geride kırmızı kesikli bir
 *   parça kalıyordu (kullanıcı bildirimi, 2026-08-20).
 *
 * Armatürün hattıyla birlikte gitmesi kuralının kardeşi.
 */
export function collectAttachmentLineIdsForElements(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  elementIds: readonly Id[],
): Id[] {
  if (elementIds.length === 0) return []

  const removedElementIds = new Set(elementIds)
  const attachmentLineIds = new Set(lines.filter(isAttachmentLine).map((line) => line.id))

  const doomed = new Set<Id>()
  for (const connection of connections) {
    if (!attachmentLineIds.has(connection.lineId)) continue
    const targetElementId = getTargetElementId(connection.target)
    if (targetElementId === null) continue
    if (!removedElementIds.has(targetElementId)) continue
    doomed.add(connection.lineId)
  }

  return [...doomed]
}

/**
 * Silinen kolların ANA BORUDAKİ refakatçi vanaları.
 *
 * Vana kolun üstünde DEĞİL, kolun tutunduğu borunun düğümünde oturuyor
 * (`placeElementWithStub`) — yani "silinen hattın üstündeki armatürler de
 * gider" kuralı onu görmüyor ve cihaz gidince boru ucunda sahipsiz bir vana
 * kalıyordu.
 *
 * Yalnız OTOMATİK vana toplanır: kullanıcı o düğüme başka bir armatür
 * (filtre, izolasyon…) koyduysa o kendi başına bir karardır, cihazla birlikte
 * silinmez.
 */
export function collectCompanionValveIdsForLines(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  elements: readonly InstallationElement[],
  removedLineIds: readonly Id[],
): Id[] {
  if (removedLineIds.length === 0) return []

  const doomedLineIds = new Set(removedLineIds)
  const typeById = new Map(elements.map((element) => [element.id, element.type]))
  const valveIds = new Set<Id>()

  for (const connection of connections) {
    if (!doomedLineIds.has(connection.lineId)) continue
    const { target } = connection
    if (target.kind !== 'line') continue
    // Kol gidiyor ama tutunduğu boru KALIYOR; vana o borunun düğümünde.
    if (doomedLineIds.has(target.lineId)) continue

    const host = lines.find((line) => line.id === target.lineId)
    const point = host?.points.find((candidate) => candidate.id === target.pointId)
    const inlineElementId = point?.inlineElementId
    if (inlineElementId === undefined) continue
    if (typeById.get(inlineElementId) !== ATTACHED_VALVE_TYPE) continue

    valveIds.add(inlineElementId)
  }

  return [...valveIds]
}
