import { getSymbolLocalBounds } from './elementPicking'
import type { InstallationElement } from './installationModel'
import type { SymbolMetadata } from './symbolMetadata'
import type { PlanPoint } from '../../core/coords'
import { getSegmentLength } from '../../core/wall'

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
