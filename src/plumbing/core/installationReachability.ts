import type { InstallationConnection, InstallationElement, InstallationLine } from './installationModel'
import { isGasCarryingKind } from './lineKinds'
import type { FloorPipeLink, Id } from '../../core/model'

export type ConnectedInstallation = { elementIds: Id[]; lineIds: Id[]; floorIds: Id[] }

/**
 * Servis kutusundan başlayarak GAZ TAŞIYAN hat/eleman grafında ulaşılabilen
 * her şeyi toplar (borular, branşmanlar, armatürler, cihazlar). Baca/
 * havalandırma kanalları BAŞKA bir graftır (element-attach.md, "baca ayrı
 * graf") — buraya girmez: silinen cihazın kanalı `applyRemoval` içindeki
 * `collectDischargeLineIdsForElements` tarafından AYRICA süpürülüyor, aynı
 * işi burada tekrarlamak iki kaynak-tek gerçek kuralını bozardı.
 *
 * Servis kutusu proje başına TEKTİR (lineSeed.ts → hasServiceBox) ve tüm gaz
 * tesisatının köküdür: kutu silinince geride köksüz bir ağ kalmasın diye
 * silme bu kümenin TAMAMINI hedeflemeli (bkz. store/deletionActions.ts).
 *
 * Düğümler (eleman/hat) TEK id evrenini paylaşır (nextUniqueId proje bazlı
 * ortak sayaç, K71) — bu yüzden komşuluk haritası eleman ve hat id'lerini
 * çakışma riski olmadan aynı anahtar uzayında tutabilir.
 *
 * KATLAR ARASI (kullanıcı isteği, 2026-08): `floorPipeLinks` verilirse
 * gezinme aktif kattan TAŞAR — kolon devamının bağlı olduğu diğer katlardaki
 * borular da kapsama girer (`floorIds` dönüşünde hangi katların etkilendiği
 * görülür). Kat bağlantısı hidrolik BİRLEŞİM değildir (model.ts notu) ama
 * kaynağı (servis kutusu) silinince karşı kattaki devam borusu artık gerçek
 * bir hiçliğe bağlıdır — silme kapsamına alınır.
 */
export function collectServiceBoxInstallation(
  elements: readonly InstallationElement[],
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  floorPipeLinks: readonly FloorPipeLink[],
  serviceBoxId: Id,
): ConnectedInstallation {
  const gasLines = lines.filter((line) => isGasCarryingKind(line.kind))
  const gasLineIds = new Set(gasLines.map((line) => line.id))

  const adjacency = new Map<Id, Id[]>()
  const addEdge = (a: Id, b: Id) => {
    adjacency.set(a, [...(adjacency.get(a) ?? []), b])
    adjacency.set(b, [...(adjacency.get(b) ?? []), a])
  }

  for (const connection of connections) {
    if (!gasLineIds.has(connection.lineId)) continue

    if (connection.target.kind === 'line') {
      // Branşman ana hattın bir NOKTASINA bağlanır (K-W'nin zincir birleşimi).
      if (gasLineIds.has(connection.target.lineId)) {
        addEdge(connection.lineId, connection.target.lineId)
      }
      continue
    }

    addEdge(connection.lineId, connection.target.elementId)
  }

  // Boruya oturan armatür (`onLine`) ayrı bir bağlantı kaydı DEĞİL, hattın
  // düğümündeki `inlineElementId` — element-attach.md.
  for (const line of gasLines) {
    for (const point of line.points) {
      if (point.inlineElementId !== undefined) addEdge(line.id, point.inlineElementId)
    }
  }

  // Kat bağlantısı (kolon devamı, `FloorPipeLink`): hidrolik olarak BİRLEŞTİRMEZ
  // (model.ts notu — malzeme dökümünde iki ayrı uç kalır), ama servis kutusu/
  // sayaç silinince üst/alt kattaki devam borusu KAYNAKSIZ kalmasın diye silme
  // KAPSAMINA dahil edilir (kullanıcı isteği, 2026-08). Karşı ucun hangi hatta
  // ait olduğu aranmalı — link yalnız NOKTA id'si taşıyor, hat id'si değil.
  const lineIdByPointId = new Map<Id, Id>()
  for (const line of gasLines) {
    for (const point of line.points) lineIdByPointId.set(point.id, line.id)
  }
  for (const link of floorPipeLinks) {
    const belowLineId = lineIdByPointId.get(link.belowPointId)
    const aboveLineId = lineIdByPointId.get(link.abovePointId)
    if (belowLineId !== undefined && aboveLineId !== undefined) addEdge(belowLineId, aboveLineId)
  }

  const visited = new Set<Id>([serviceBoxId])
  const queue: Id[] = [serviceBoxId]
  while (queue.length > 0) {
    const current = queue.shift() as Id
    for (const neighbor of adjacency.get(current) ?? []) {
      if (visited.has(neighbor)) continue
      visited.add(neighbor)
      queue.push(neighbor)
    }
  }

  const reachedLines = gasLines.filter((line) => visited.has(line.id))
  const lineIds = reachedLines.map((line) => line.id)
  const elementIds = elements
    .filter((element) => visited.has(element.id))
    .map((element) => element.id)
  const floorIds = [...new Set(reachedLines.map((line) => line.floorId))]

  return { elementIds, lineIds, floorIds }
}
