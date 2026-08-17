import { getSymbolLocalBounds } from './elementPicking'
import { getTargetElementId } from './installationModel'
import type { InstallationConnection, InstallationElement, InstallationLine } from './installationModel'
import { rotatePlanOffset, svgLocalToPlanOffset } from './ports'
import type { SymbolMetadata } from './symbolMetadata'
import type { PlanPoint } from '../../core/coords'
import { getSegmentLength } from '../../core/wall'

/**
 * Elemanın boruya/porta TUTUNDUĞU yerel (SVG) nokta(lar) — döndürme
 * kapsamının kilidi bu (bkz. `PlumbingSlice.rotateElement` yorumu). Boruya/porta
 * bağlı elemanın açısı YERLEŞTİRME anında port ekseninden türer
 * (`element-attach.md` → "Sembol boruya PORT EKSENİNDEN hizalanır") ama o an
 * sonrası hiçbir yerde YENİDEN hesaplanmaz (`resolveOnLineSlide` "Açı SABİT"
 * notu) — bu yüzden elle döndürme güvenlidir, YETER Kİ tutunduğu nokta
 * DÜNYADA yerinde kalsın (`getElementAnchorOffset` bunu sağlar, çağıran
 * `element.position`'ı buna göre yeniden yazar).
 *
 * Birden fazla tutunma varsa (ör. birden fazla havalandırma ağzı bağlı bir
 * cihaz) döndürme geometrik olarak imkânsızdır — katı bir gövde iki farklı
 * sabit noktayı aynı anda koruyarak dönemez — bu durumda `null` döner, eleman
 * döndürülemez. Hem tutamacın GÖRÜNÜRLÜĞÜ hem TUTULABİLİRLİĞİ aynı bu
 * kontrolden geçer (`ElementRotateHandle.tsx` + `useElementRotateTool.ts`),
 * ayrışsalardı görünmeyen bir tutamaç ya da görünüp tutulamayan bir tutamaç
 * ortaya çıkardı.
 */
export function getElementRotateAnchorLocal(
  elementId: InstallationElement['id'],
  metadata: SymbolMetadata,
  connections: readonly InstallationConnection[],
  lines: readonly InstallationLine[],
): readonly [number, number] | null {
  const anchors: Array<readonly [number, number]> = []

  for (const line of lines) {
    for (const point of line.points) {
      if (point.inlineElementId !== elementId) continue
      const [onlyPort] = metadata.ports
      anchors.push(metadata.ports.length === 1 && onlyPort ? onlyPort.position : metadata.origin)
    }
  }

  for (const connection of connections) {
    const target = connection.target
    if (getTargetElementId(target) !== elementId) continue
    if (target.kind === 'port') {
      const port = metadata.ports.find((candidate) => candidate.id === target.portId)
      if (port) anchors.push(port.position)
    } else if (target.kind === 'outlet') {
      anchors.push(target.position)
    }
  }

  if (anchors.length > 1) return null
  // Bağlantısız (serbest) eleman: çapa kendi kökeni — döndürme konumu
  // DEĞİŞTİRMEZ, bugüne kadarki `free` davranışıyla birebir aynı.
  return anchors[0] ?? metadata.origin
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
