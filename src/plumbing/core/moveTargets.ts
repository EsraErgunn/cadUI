import { expandMoveSelection } from './elementAttach'
import type { InstallationConnection, InstallationLine } from './installationModel'
import { getLineEndPointId, getPortAnchoredPointIds } from './lineCornerLink'
import type { Id } from '../../core/model'

export type MoveTargets = {
  /** Aynı kaymayla taşınacak elemanlar. */
  elementIds: Set<Id>
  /** Aynı kaymayla taşınacak hat noktaları. */
  pointIds: Set<Id>
}

/**
 * Bir taşıma jestinin neyi kaydıracağı — TEK hesapta, sıraya bağlı olmadan.
 *
 * Model üç bağ tanır ve hepsi KAYNAKTIR (birleşen şeyler ayrılamaz):
 * bir hat ucu ↔ elemanın portu, bir hat ucu ↔ başka bir hattın köşesi
 * (zincirin adımları, branşman, cihaz kolu), bir düğüm ↔ üstündeki armatür.
 *
 * Kural: **seçim rijit taşınır, kaynak yerinden ayrılmaz.** Seçilen her şey
 * kayar; kayan bir köşeye kaynaklı komşu uçlar da kayar (o hatlar esner).
 * Yayılım SABİT NOKTAYA kadar sürer, çünkü zincir çok halkalı olabilir
 * (adım → adım → cihaz kolu).
 *
 * Yayılımı durduran tek şey ÇAPA: taşınmayan bir elemanın portuna oturan uç.
 * O uç kaynağını bırakamaz, dolayısıyla yerinde kalır ve zincir onun üstünden
 * ilerlemez — çapa olmasaydı ağın bir ucundan çekmek bütün tesisatı sürüklerdi.
 *
 * Neden tek hesap: bu iş daha önce arka arkaya geçişlerle yapılıyordu ve karar
 * sırası sonucu değiştiriyordu (bir köşenin kayacağı, ona bakan pim kararından
 * SONRA belli oluyordu; aynı nokta iki geçişte iki kez kaydırılabiliyordu).
 * Küme önce kapanıyor, kayma sonra BİR KEZ uygulanıyor.
 */
export function resolveMoveTargets(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  selectedElementIds: readonly Id[],
  selectedLineIds: readonly Id[],
): MoveTargets {
  const lineIdSet = new Set(selectedLineIds)
  // Seçili hattın üstündeki armatürler ve ucundaki eleman seçime katılır (K-W3).
  const elementIds = new Set(
    expandMoveSelection(lines, connections, selectedElementIds, selectedLineIds),
  )

  const anchoredPointIds = getPortAnchoredPointIds(lines, connections, elementIds)

  const pointIds = new Set<Id>()
  const addPoint = (pointId: Id | undefined) => {
    if (pointId === undefined || anchoredPointIds.has(pointId)) return false
    if (pointIds.has(pointId)) return false

    pointIds.add(pointId)
    return true
  }

  // Seçili hat BÜTÜNÜYLE kayar; çapa denetimine takılmaz çünkü portuna bağlı
  // elemanı zaten seçime katıldı (`expandMoveSelection`) — yani çapa değil.
  for (const line of lines) {
    if (!lineIdSet.has(line.id)) continue
    for (const point of line.points) pointIds.add(point.id)
  }

  for (const connection of connections) {
    if (connection.target.kind !== 'port') continue
    if (!elementIds.has(connection.target.elementId)) continue

    addPoint(getLineEndPointId(lines, connection.lineId, connection.end))
  }

  for (const line of lines) {
    for (const point of line.points) {
      if (point.inlineElementId === undefined) continue
      if (!elementIds.has(point.inlineElementId)) continue

      addPoint(point.id)
    }
  }

  // Kaynak kapanışı: bağ İKİ YÖNLÜ okunur. Kayıt "B'nin ucu A'nın köşesine
  // tutunuyor" diye tek yönlü yazılıyor ama fiziksel olarak orası TEK düğümdür;
  // hangi taraf kayarsa öteki de kaymalı.
  let isChanged = true
  while (isChanged) {
    isChanged = false

    for (const connection of connections) {
      if (connection.target.kind !== 'line') continue

      const ownPointId = getLineEndPointId(lines, connection.lineId, connection.end)
      if (ownPointId === undefined) continue

      const hostPointId = connection.target.pointId
      if (pointIds.has(ownPointId)) isChanged = addPoint(hostPointId) || isChanged
      if (pointIds.has(hostPointId)) isChanged = addPoint(ownPointId) || isChanged
    }
  }

  // Kayan düğümde oturan armatür düğümüyle gelir: armatür bir düğümdür (K-W3),
  // ayrılsaydı borunun dışında asılı kalırdı.
  for (const line of lines) {
    for (const point of line.points) {
      if (point.inlineElementId === undefined) continue
      if (!pointIds.has(point.id)) continue

      elementIds.add(point.inlineElementId)
    }
  }

  return { elementIds, pointIds }
}
