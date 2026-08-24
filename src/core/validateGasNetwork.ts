import type { Floor, Id } from './model'
import { getBoundsAround } from './planBounds'
import { VALIDATION_MESSAGES, type ValidationIssue, type ValidationSource } from './validationModel'
import {
  getTargetElementId,
  type InstallationElement,
  type InstallationLine,
} from '../plumbing/core/installationModel'
import { isGasCarryingKind } from '../plumbing/core/lineKinds'
import { isBurnerAppliance, isShutoffValve } from '../plumbing/core/symbolMetadata'

type LineEnd = 'start' | 'end'

const LINE_ENDS: readonly LineEnd[] = ['start', 'end']

/**
 * Hattı sonlandırmaya YETKİLİ olmayan ama uç da sayılmayan eleman: servis
 * kutusu gazın girdiği yer, yani hattın kaynağı. Sayaç/filtre gibi ara
 * elemanlar bu listede DEĞİL — onlarda hat devam etmek zorunda (doküman
 * Hata6: "sayaç, filtre gibi elemanlar hattı sonlandırmaz").
 */
function isNetworkSource(element: InstallationElement): boolean {
  return element.type === 'serviceBox'
}

function getEndPointId(line: InstallationLine, end: LineEnd): Id | undefined {
  const point = end === 'start' ? line.points[0] : line.points[line.points.length - 1]
  return point?.id
}

/**
 * Gaz hattının serbest kalan uçları (doküman Hata6). "Serbest" üç hâlin
 * herhangi biri: hiç bağlantı kaydı yok, yakıcı olmayan bir elemanda bitip
 * oradan başka hat çıkmıyor, ya da o eleman zaten yok.
 *
 * Kolon devamı (`floorPipeLinks`) uç saymaz: hat üst/alt kata geçiyor, orada
 * sonlanıyor. Deşarj hatları (baca, havalandırma) gaz taşımaz, kapsam dışı.
 * BRANŞMAN KOLU (`branchStub`) da kapsam dışı (kullanıcı isteği, 2026-08):
 * kolun yer seviyesindeki ucu bir bağlantı noktası değil, kimse oraya bir şey
 * takmaz — zaten yerleştirme tarafında da hedef sayılmıyor
 * (`placementResolution.readFloorLines`).
 *
 * Ucunda KESME VANASI olan hat da serbest değildir (kullanıcı isteği, 2026-08):
 * vana orayı kapatır, gaz çıkışı yoktur. Vanadan yeni bir boru çıkarsa o nokta
 * zaten kavşak olur ve vana geçiş armatürüne dönüşür — iki hâl de uyarısızdır.
 */
export function validateGasNetwork(source: ValidationSource, floor: Floor): ValidationIssue[] {
  const elementById = new Map<Id, InstallationElement>(
    source.installationElements.map((element) => [element.id, element]),
  )

  const connectionByEnd = new Map<string, (typeof source.installationConnections)[number]>()
  const lineCountByElementId = new Map<Id, number>()
  /**
   * Üstüne BAŞKA bir hattın tutunduğu noktalar.
   *
   * Bir uca kol takıldığında bağlantı kayıtlarının İKİSİ de KOLA yazılıyor
   * (`placeElementWithStub`): ana borunun kendi ucunda kayıt OLUŞMUYOR. Yalnız
   * `connectionByEnd`'e bakılırsa ocakla bitirilmiş bir hat "bağlantısız uç"
   * görünür — kullanıcı bildirimi. O nokta aslında bir KAVŞAK: kolun kendi ucu
   * ayrıca denetleniyor, yani cihaz orada aranır.
   */
  const junctionPointIds = new Set<Id>()
  for (const connection of source.installationConnections) {
    connectionByEnd.set(`${connection.lineId}:${connection.end}`, connection)

    if (connection.target.kind === 'line') junctionPointIds.add(connection.target.pointId)

    const elementId = getTargetElementId(connection.target)
    if (elementId === undefined || elementId === null) continue
    lineCountByElementId.set(elementId, (lineCountByElementId.get(elementId) ?? 0) + 1)
  }

  const linkedPointIds = new Set<Id>(
    source.floorPipeLinks.flatMap((link) => [link.belowPointId, link.abovePointId]),
  )

  const issues: ValidationIssue[] = []

  for (const line of source.installationLines) {
    if (line.floorId !== floor.id || !isGasCarryingKind(line.kind)) continue
    if (line.kind === 'branchStub') continue

    for (const end of LINE_ENDS) {
      const pointId = getEndPointId(line, end)
      if (pointId === undefined || linkedPointIds.has(pointId)) continue
      // Kavşak uç değildir: devamı, oraya tutunan hattın kendi denetiminde.
      if (junctionPointIds.has(pointId)) continue

      const point = end === 'start' ? line.points[0] : line.points[line.points.length - 1]
      const inlineElement =
        point.inlineElementId === undefined ? undefined : elementById.get(point.inlineElementId)
      // Kapalı uç: armatürün kendisi gazı kesiyor.
      if (inlineElement && isShutoffValve(inlineElement.type)) continue

      const connection = connectionByEnd.get(`${line.id}:${end}`)
      // Başka bir hatta bağlanan uç sonlanmıyor, devam ediyor.
      if (connection && connection.target.kind === 'line') continue

      if (connection) {
        const elementId = getTargetElementId(connection.target)
        const element = elementId === null ? undefined : elementById.get(elementId)
        if (element && (isBurnerAppliance(element.type) || isNetworkSource(element))) continue
        // Ara eleman: kendisinden BAŞKA bir hat da çıkıyorsa ağ devam ediyor.
        if (element && (lineCountByElementId.get(element.id) ?? 0) > 1) continue
      }

      const bounds = getBoundsAround([point.position])
      issues.push({
        key: `lineTermination:${line.id}:${end}`,
        ruleId: 'lineTermination',
        message: VALIDATION_MESSAGES.lineTermination,
        location: { floorId: floor.id },
        focus: bounds ? { view: 'installation', elementIds: [], lineIds: [line.id], bounds } : undefined,
      })
    }
  }

  return issues
}
