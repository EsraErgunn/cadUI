import { getSymbolLocalBounds } from './elementPicking'
import { getTargetElementId } from './installationModel'
import type { InstallationConnection, InstallationElement, InstallationLine } from './installationModel'
import { getLineEndPointId } from './lineCornerLink'
import { rotatePlanOffset, svgLocalToPlanOffset } from './ports'
import type { SymbolMetadata } from './symbolMetadata'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import { getSegmentLength } from '../../core/wall'

/** Döndürmede PİVOTUN DIŞINDA kalan, elemana bağlı bir hat ucu. */
export type ElementRotateFollower = {
  lineId: Id
  pointId: Id
  /** Bu ucun bağlı olduğu portun elemanın YEREL (SVG) koordinatındaki yeri. */
  local: readonly [number, number]
}

export type ElementRotateAnchors = {
  /** Döndürme boyunca DÜNYADA sabit tutulan yerel nokta. */
  pivotLocal: readonly [number, number]
  /**
   * Pivotun DIŞINDAKİ tutunmalar — eleman dönerken bunlar dünyada SABİT
   * KALMAZ, bağlı oldukları hat ucu elemanın YENİ port konumuna taşınır (boru
   * gerilir, kopmaz). Tek tutunma ya da hiç yoksa boş dizi.
   */
  followers: readonly ElementRotateFollower[]
}

/**
 * Elemanın boruya/porta TUTUNDUĞU yerel (SVG) nokta(lar) — döndürme
 * kapsamının kilidi bu (bkz. `PlumbingSlice.rotateElement` yorumu). Boruya/porta
 * bağlı elemanın açısı YERLEŞTİRME anında port ekseninden türer
 * (`element-attach.md` → "Sembol boruya PORT EKSENİNDEN hizalanır") ama o an
 * sonrası hiçbir yerde YENİDEN hesaplanmaz (`resolveOnLineSlide` "Açı SABİT"
 * notu) — bu yüzden elle döndürme güvenlidir, YETER Kİ pivot noktası DÜNYADA
 * yerinde kalsın (`getElementAnchorOffset` bunu sağlar, çağıran
 * `element.position`'ı buna göre yeniden yazar).
 *
 * TAM OLARAK İKİ `port` tutunması varsa (ör. branşmandaki sayaç: bir GİRİŞ +
 * bir ÇIKIŞ portundan iki ayrı boruya bağlı — kullanıcı isteği, 2026-08:
 * "iki yerden bağlı olsa da döndürebilelim") biri PİVOT, öbürü TAKİPÇİ olur —
 * katı bir gövde iki sabit noktayı aynı anda koruyarak dönemez, ama BİRİNİ
 * sabit tutup ÖBÜRÜNÜ yeni port konumuna taşımak geometrik olarak mümkün
 * (`useElementRotateTool.ts` takipçinin bağlı olduğu hat ucunu her karede
 * oraya çeker). `outlet` (cihazın deşarj ağzı, birden fazla olabilir) hâlâ
 * İMKÂNSIZ: o bağın ilan edilmiş bir PORTU yok, "yeni port konumu" diye bir
 * şey hesaplanamaz — ikiden fazla tutunma da aynı gerekçeyle engelli kalır.
 *
 * Hem tutamacın GÖRÜNÜRLÜĞÜ hem TUTULABİLİRLİĞİ aynı bu kontrolden geçer
 * (`ElementRotateHandle.tsx` + `useElementRotateTool.ts`), ayrışsalardı
 * görünmeyen bir tutamaç ya da görünüp tutulamayan bir tutamaç ortaya çıkardı.
 */
export function getElementRotateAnchorLocal(
  elementId: InstallationElement['id'],
  metadata: SymbolMetadata,
  connections: readonly InstallationConnection[],
  lines: readonly InstallationLine[],
): ElementRotateAnchors | null {
  type Anchor =
    | { local: readonly [number, number]; kind: 'inline' }
    // `outlet` PORTSUZ bağlanır — takipçi olamaz, yalnız pivotu engeller.
    | { local: readonly [number, number]; kind: 'port' | 'outlet'; connection: InstallationConnection }
  const anchors: Anchor[] = []

  for (const line of lines) {
    for (const point of line.points) {
      if (point.inlineElementId !== elementId) continue
      const [onlyPort] = metadata.ports
      anchors.push({
        local: metadata.ports.length === 1 && onlyPort ? onlyPort.position : metadata.origin,
        kind: 'inline',
      })
    }
  }

  for (const connection of connections) {
    const target = connection.target
    if (getTargetElementId(target) !== elementId) continue
    if (target.kind === 'port') {
      const port = metadata.ports.find((candidate) => candidate.id === target.portId)
      if (port) anchors.push({ local: port.position, kind: 'port', connection })
    } else if (target.kind === 'outlet') {
      anchors.push({ local: target.position, kind: 'outlet', connection })
    }
  }

  if (anchors.length === 0) {
    // Bağlantısız (serbest) eleman: çapa kendi kökeni — döndürme konumu
    // DEĞİŞTİRMEZ, bugüne kadarki `free` davranışıyla birebir aynı.
    return { pivotLocal: metadata.origin, followers: [] }
  }

  if (anchors.length === 1) {
    return { pivotLocal: anchors[0].local, followers: [] }
  }

  const [pivot, follower] = anchors
  if (anchors.length === 2 && pivot.kind === 'port' && follower.kind === 'port') {
    const followerPointId = getLineEndPointId(lines, follower.connection.lineId, follower.connection.end)
    if (followerPointId === undefined) return null

    return {
      pivotLocal: pivot.local,
      followers: [{ lineId: follower.connection.lineId, pointId: followerPointId, local: follower.local }],
    }
  }

  return null
}

/**
 * Bir çapanın (yerel SVG noktası) elemanın KENDİ konumuna göre dünya ofseti —
 * ölçek + açı uygulanmış. Sürüklemenin hem BAŞINDA (mevcut açı, sabit tutulacak
 * dünya noktasını bulmak için) hem her KARESİNDE (yeni açı, o noktayı koruyacak
 * yeni konumu bulmak için) AYNI formülle çağrılır.
 */
export function getElementAnchorOffset(
  element: Pick<InstallationElement, 'scale'>,
  metadata: SymbolMetadata,
  anchorLocal: readonly [number, number],
  angleDeg: number,
): PlanPoint {
  return rotatePlanOffset(svgLocalToPlanOffset(anchorLocal, metadata.origin, element.scale), angleDeg)
}

/**
 * Mimari taraftaki `AreaObject` döndürme tutamacıyla AYNI ölçüler
 * (`core/areaObjectHandles.ts`) — kullanıcı isteği "mimari çizimdeki
 * döndürmeyi kullanabiliriz" (2026-08). Fonksiyonlar birebir kopyalanmadı;
 * plumbing kendi `InstallationElement` geometrisine (`getSymbolLocalBounds`,
 * ölçek+açı dönüşümü) göre yeniden yazıldı, ama görsel dil (ikon boyutu,
 * ofset, 90°'lik taban açısı) aynı kalsın diye sabitler eşleştirildi.
 */
export const ELEMENT_ROTATE_HANDLE_ICON_PX = 14
const ELEMENT_ROTATE_HANDLE_HIT_PX = 28
const ELEMENT_ROTATE_HANDLE_OFFSET_PX = 18

const DEG_TO_RAD = Math.PI / 180
const RAD_TO_DEG = 180 / Math.PI
/** Tutamaç elemanın yerel +y ucunda; imleç açısından elemanın açısına inerken düşülür. */
const HANDLE_OFFSET_DEG = 90

/** Yerel (ölçeklenmemiş) bir noktayı elemanın ölçek+açı+konumuyla dünyaya taşır. */
function toElementWorldPoint(
  element: Pick<InstallationElement, 'position' | 'angleDeg' | 'scale'>,
  local: PlanPoint,
): PlanPoint {
  const angleRad = element.angleDeg * DEG_TO_RAD
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  const scaledX = local.x * element.scale
  const scaledY = local.y * element.scale
  return {
    x: element.position.x + scaledX * cos - scaledY * sin,
    y: element.position.y + scaledX * sin + scaledY * cos,
  }
}

/**
 * Döndürme ikonunun plan konumu — sembolün yerel sınır kutusunun ÜST-ORTA
 * noktasının biraz dışında (AreaObject'teki yerleşimle aynı). Ofset EKRAN
 * pikselinden gelir ve elemanın ölçeğine bölünür: `toElementWorldPoint` sonucu
 * zaten `element.scale` ile çarpıyor, yerel ofset önceden bölünmezse ölçek
 * büyüdükçe ikon gereğinden uzağa düşerdi.
 */
export function getElementRotateHandlePosition(
  element: InstallationElement,
  metadata: SymbolMetadata,
  zoom: number,
): PlanPoint {
  const bounds = getSymbolLocalBounds(metadata)
  const offsetLocal = ELEMENT_ROTATE_HANDLE_OFFSET_PX / zoom / element.scale
  const centerX = (bounds.min.x + bounds.max.x) / 2

  return toElementWorldPoint(element, { x: centerX, y: bounds.max.y + offsetLocal })
}

/** İmleç döndürme tutamacının erişim yarıçapında mı — yakalama alanı EKRAN pikselinde. */
export function isPointerOnElementRotateHandle(
  target: PlanPoint,
  element: InstallationElement,
  metadata: SymbolMetadata,
  zoom: number,
): boolean {
  const handlePosition = getElementRotateHandlePosition(element, metadata, zoom)
  const reachCm = ELEMENT_ROTATE_HANDLE_HIT_PX / 2 / zoom
  return getSegmentLength(target, handlePosition) <= reachCm
}

/**
 * İmleç konumundan elemanın yeni açısı — `core/areaObjectHandles.ts` →
 * `getAreaObjectAngleFromPointer` ile AYNI formül (atan2, 90° taban farkı,
 * 0-359'a indirgeme). Ham derece döner; 15°'lik adıma yakalama ÇAĞIRANIN işi.
 */
export function getElementAngleFromPointer(target: PlanPoint, center: PlanPoint): number {
  const pointerDeg = Math.atan2(target.y - center.y, target.x - center.x) * RAD_TO_DEG
  const angleDeg = pointerDeg - HANDLE_OFFSET_DEG
  return ((angleDeg % 360) + 360) % 360
}
