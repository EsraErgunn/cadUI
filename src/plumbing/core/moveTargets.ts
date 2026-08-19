import { expandMoveSelection } from './elementAttach'
import { getTargetElementId } from './installationModel'
import type { InstallationConnection, InstallationLine } from './installationModel'
import {
  getFloorLinkAnchoredPointIds,
  getLineEndPointId,
  getPortAnchoredPointIds,
} from './lineCornerLink'
import type { FloorPipeLink, Id } from '../../core/model'

export type MoveTargets = {
  /** Aynı kaymayla taşınacak elemanlar. */
  elementIds: Set<Id>
  /** Aynı kaymayla taşınacak hat noktaları. */
  pointIds: Set<Id>
}

/**
 * Porta bağlı bir hat ucunun HEMEN yanındaki (aradaki tek segmentin öbür
 * ucundaki) nokta — YALNIZ orada bir armatür oturuyorsa (`elementAttach.ts` →
 * `resolveFreeEndAttachment`: "vana hattın ESKİ ucundaki düğüme oturur").
 * O zaman aradaki kısa parça esneyen bir boru değil, elemana yapışık bir
 * montaj payıdır. Hat 2'den az noktalıysa (olmaz ama savunma) komşu yoktur.
 *
 * Armatür KOŞULU şart: cihaz kolu (`applianceStub`) tam İKİ noktalıdır, yani
 * "komşu" doğrudan kolun ana boruya tutunan ucudur. Koşulsuz eklenince cihazı
 * sürüklemek o ucu, kaynak kapanışı da (aşağıdaki döngü) ana borunun köşesini
 * ve üstündeki vanayı peşinden sürüklüyordu — kol hiç ESNEMEDEN bütün ağ
 * geliyordu. Kullanıcı isteği (2026-08): eleman yalnız BAĞLANTI yerinden
 * hareket etsin, boru o noktadan gerilsin.
 */
function getGlueNeighborPointId(
  lines: readonly InstallationLine[],
  lineId: Id,
  end: InstallationConnection['end'],
): Id | undefined {
  const line = lines.find((candidate) => candidate.id === lineId)
  if (!line || line.points.length < 2) return undefined

  const neighbor = end === 'start' ? line.points[1] : line.points.at(-2)
  if (!neighbor || neighbor.inlineElementId === undefined) return undefined

  return neighbor.id
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
  floorPipeLinks: readonly FloorPipeLink[],
  selectedElementIds: readonly Id[],
  selectedLineIds: readonly Id[],
): MoveTargets {
  const lineIdSet = new Set(selectedLineIds)
  // Seçili hattın üstündeki armatürler ve ucundaki eleman seçime katılır (K-W3).
  const elementIds = new Set(
    expandMoveSelection(lines, connections, selectedElementIds, selectedLineIds),
  )

  // Port çapasının aksine bir `FloorPipeLink` ucunun "diğer tarafını da
  // seçime katan" bir eş mekanizma YOK (diğer taraf başka bir kattaki hat) —
  // bu yüzden floor-link çapası HİÇBİR koşulda düşürülmez (kullanıcı isteği,
  // 2026-08).
  const floorLinkAnchoredPointIds = getFloorLinkAnchoredPointIds(floorPipeLinks)
  const anchoredPointIds = new Set([
    ...getPortAnchoredPointIds(lines, connections, elementIds),
    ...floorLinkAnchoredPointIds,
  ])

  const pointIds = new Set<Id>()
  const addPoint = (pointId: Id | undefined) => {
    if (pointId === undefined || anchoredPointIds.has(pointId)) return false
    if (pointIds.has(pointId)) return false

    pointIds.add(pointId)
    return true
  }

  // Seçili hat BÜTÜNÜYLE kayar; PORT çapa denetimine takılmaz çünkü portuna
  // bağlı elemanı zaten seçime katıldı (`expandMoveSelection`) — yani çapa
  // değil. Floor-link çapasının böyle bir eşi yok, bu yüzden burada AYRICA
  // elenir (kullanıcı isteği, 2026-08) — yoksa doğrudan seçilip sürüklenen
  // bir hattın kata bağlı ucu sessizce kayardı.
  for (const line of lines) {
    if (!lineIdSet.has(line.id)) continue
    for (const point of line.points) {
      if (floorLinkAnchoredPointIds.has(point.id)) continue
      pointIds.add(point.id)
    }
  }

  for (const connection of connections) {
    const targetElementId = getTargetElementId(connection.target)
    if (targetElementId === null) continue
    if (!elementIds.has(targetElementId)) continue

    addPoint(getLineEndPointId(lines, connection.lineId, connection.end))

    // Bağlı ucun komşusunda bir armatür oturuyorsa (branşmanla gelen vana gibi)
    // o da AYNI kaymayla gelir: aradaki kısa parça esneyen bir boru değil,
    // elemana yapışık bir montaj payı — kullanıcı isteği (2026-08): "branşmanla
    // gelen vana branşmanın portuna yapışsın". Armatür YOKSA komşu gelmez, boru
    // o bağlantı noktasından gerilir. Alt döngü (armatür→elemanIds) bu noktayı
    // zaten okuyor, burada yalnız pointIds'e katılması yeter.
    const glueNeighborPointId = getGlueNeighborPointId(lines, connection.lineId, connection.end)
    if (glueNeighborPointId !== undefined) addPoint(glueNeighborPointId)
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
  //
  // Branşmanın ana hatta tutunan YER ucu da buna DAHİL (kullanıcı isteği,
  // 2026-08): branşman sürüklenince ana borunun bağlantı KÖŞESİ onu takip eder
  // ve boru orada bükülür — borunun geri kalanı yerinde kalır, kayan yalnız o
  // tek köşedir. Bu bağ bir ara tek yönlü yapılmıştı (ana boru çapa sayılsın
  // diye); o zaman branşman boruyu yerinde bırakıp KOPUYORDU, geri alındı.
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
