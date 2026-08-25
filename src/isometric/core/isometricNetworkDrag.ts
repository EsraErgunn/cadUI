import { applyIsometricOffsets } from './isometricOffset'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import {
  getTargetElementId,
  type InstallationConnection,
  type InstallationLine,
} from '../../plumbing/core/installationModel'
import { getLineEndPointId } from '../../plumbing/core/lineCornerLink'

/**
 * Bir köşe izometride çekildiğinde ONUNLA BİRLİKTE kayacak noktalar
 * (sürüklenenin KENDİSİ hariç).
 *
 * `anchorPointId` çekilen EKSENİN karşı ucudur: o köşe ve arkasındaki ağın
 * tamamı yerinde kalır, çekilen parça uzar/kısalır, bu taraftaki her şey RİJİT
 * gelir. Yayılım o köşede durduğu için ağın hangi yarısının hareket edeceğine
 * kullanıcının çekme YÖNÜ karar verir (`isometricDragAxis.ts`).
 *
 * Rijit olması şart: aradaki borular esneseydi eksen kilidi anlamını yitirir,
 * yatay bir parça eğik çizilirdi. Amaç zaten üst üste binen dalları ayırmak.
 *
 * Neden `moveTargets.ts`/`resizeTargets.ts` yeniden kullanılmıyor: ikisi de
 * PLAN geometrisini değiştiriyor ve orada duraklar var (port çapası, kat
 * bağlantısı, `FloorPipeLink`in sakladığı konum). İzometrik kayma plan
 * konumuna HİÇ dokunmadığı için o durakların hiçbiri geçerli değil — çapalı
 * bir uç izometride serbestçe kayabilir. Repo bu ayrımı `moveTargets` ↔
 * `resizeTargets` arasında da yapıyor.
 *
 * Ağ şu kenarlardan örülür:
 * 1. Hattın kendi ardışık noktaları.
 * 2. Hat-hat bağlantısı (her sol tık kendi borusunu yazdığı için zincirin her
 *    halkası ayrı bir `InstallationLine`) — İKİ YÖNLÜ okunur, yoksa zincir
 *    yazılış sırasının tersine çekilince kopardı.
 * 3. Bir elemanın portuna oturan uçlar elemanın üzerinden birbirine bağlıdır:
 *    sayaca iki boru bağlıysa biri çekilince öteki de gelmeli.
 * 4. Boru düğümüne oturan armatür (`inlineElementId`) düğümüyle gelir.
 */
export function resolveIsometricDragTargets(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  pointId: Id,
  anchorPointId: Id | undefined,
): Set<Id> {
  const movedPointIds = new Set<Id>([pointId])
  const movedElementIds = new Set<Id>()

  const addPoint = (candidateId: Id | undefined): boolean => {
    if (candidateId === undefined) return false
    if (candidateId === anchorPointId || movedPointIds.has(candidateId)) return false

    movedPointIds.add(candidateId)
    return true
  }

  const addElement = (elementId: Id): boolean => {
    if (movedElementIds.has(elementId)) return false

    movedElementIds.add(elementId)
    return true
  }

  let isChanged = true
  while (isChanged) {
    isChanged = false

    for (const line of lines) {
      for (let index = 1; index < line.points.length; index += 1) {
        const previous = line.points[index - 1]
        const current = line.points[index]
        if (movedPointIds.has(previous.id)) isChanged = addPoint(current.id) || isChanged
        if (movedPointIds.has(current.id)) isChanged = addPoint(previous.id) || isChanged
      }

      for (const point of line.points) {
        if (point.inlineElementId === undefined) continue
        if (movedPointIds.has(point.id)) {
          isChanged = addElement(point.inlineElementId) || isChanged
        }
        if (movedElementIds.has(point.inlineElementId)) {
          isChanged = addPoint(point.id) || isChanged
        }
      }
    }

    for (const connection of connections) {
      const ownPointId = getLineEndPointId(lines, connection.lineId, connection.end)
      if (ownPointId === undefined) continue

      if (connection.target.kind === 'line') {
        const hostPointId = connection.target.pointId
        if (movedPointIds.has(ownPointId)) isChanged = addPoint(hostPointId) || isChanged
        if (movedPointIds.has(hostPointId)) isChanged = addPoint(ownPointId) || isChanged
        continue
      }

      const targetElementId = getTargetElementId(connection.target)
      if (targetElementId === null) continue
      if (movedPointIds.has(ownPointId)) isChanged = addElement(targetElementId) || isChanged
      if (movedElementIds.has(targetElementId)) isChanged = addPoint(ownPointId) || isChanged
    }
  }

  movedPointIds.delete(pointId)
  return movedPointIds
}

/**
 * İzometrik sürüklemenin TÜM ağa uygulanmış hâli: çekilen nokta kendi
 * kaymasını, birlikte gelenler mirası alır.
 *
 * Dokunulmayan hat AYNI nesneyle geri döner: hem store hem sahne önizlemesi
 * "değişti mi" sorusunu referans karşılaştırmasıyla soruyor.
 */
export function applyIsometricNetworkDrag(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  pointId: Id,
  anchorPointId: Id | undefined,
  deltaCm: PlanPoint,
): InstallationLine[] {
  if (deltaCm.x === 0 && deltaCm.y === 0) return [...lines]

  const movedPointIds = resolveIsometricDragTargets(lines, connections, pointId, anchorPointId)

  return lines.map((line) => {
    const points = applyIsometricOffsets(line.points, pointId, movedPointIds, deltaCm)
    if (points.every((point, index) => point === line.points[index])) return line
    return { ...line, points }
  })
}
