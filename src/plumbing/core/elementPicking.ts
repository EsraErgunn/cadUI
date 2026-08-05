import type { InstallationElement } from './installationModel'
import { svgLocalToPlanOffset } from './ports'
import type { InstallationElementType, SymbolMetadata } from './symbolMetadata'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import { isPointInRect, type PlanRect } from '../../core/selection'

const DEG_TO_RAD = Math.PI / 180

export type PlanBounds = { min: PlanPoint; max: PlanPoint }

export type SymbolMetadataLookup = (type: InstallationElementType) => SymbolMetadata

/**
 * Sembolün dönmemiş/ölçeklenmemiş plan kutusu. `metadata.bounds` SVG yerel
 * koordinatında; çevrimi ports.ts'teki tek fonksiyon yapar (kural 3). SVG'de
 * +Y aşağı olduğu için min ve max Y ekseninde YER DEĞİŞTİRİR — min/max yeniden
 * hesaplanmadan kullanılırsa kutu ters çıkar ve hiçbir nokta içeri düşmez.
 */
export function getSymbolLocalBounds(metadata: SymbolMetadata): PlanBounds {
  const corner1 = svgLocalToPlanOffset(metadata.bounds.min, metadata.origin, 1)
  const corner2 = svgLocalToPlanOffset(metadata.bounds.max, metadata.origin, 1)
  return {
    min: { x: Math.min(corner1.x, corner2.x), y: Math.min(corner1.y, corner2.y) },
    max: { x: Math.max(corner1.x, corner2.x), y: Math.max(corner1.y, corner2.y) },
  }
}

/**
 * Plan noktasını elemanın yerel eksenine taşır: öteleme → −açı döndürme → ölçeğe
 * bölme. getPortWorldPosition'ın TERSİ ve onunla aynı açı yönünü kullanır (R2).
 * Ölçeği pozitif olmayan sembol çizilmiyor demektir; tutulamaz da (null).
 */
export function toSymbolLocalPoint(
  point: PlanPoint,
  element: InstallationElement,
): PlanPoint | null {
  if (element.scale <= 0) return null

  const dx = point.x - element.position.x
  const dy = point.y - element.position.y
  const angleRad = element.angleDeg * DEG_TO_RAD
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  return {
    x: (dx * cos + dy * sin) / element.scale,
    y: (-dx * sin + dy * cos) / element.scale,
  }
}

/**
 * Tutma sınav kutusu sembolün bounds'u. Piksel hassasiyetinde SVG geometrisi
 * değil: küçük semboller (vana, manometre) uzaklaşınca tıklanamaz hale gelirdi.
 */
export function isPointInsideElement(
  point: PlanPoint,
  element: InstallationElement,
  metadata: SymbolMetadata,
  toleranceCm = 0,
): boolean {
  const local = toSymbolLocalPoint(point, element)
  if (!local) return false

  const bounds = getSymbolLocalBounds(metadata)
  // Tolerans plan cm'inde geliyor; yerel eksen ölçek kadar küçük olduğu için bölünür.
  const padding = toleranceCm / element.scale
  return (
    local.x >= bounds.min.x - padding &&
    local.x <= bounds.max.x + padding &&
    local.y >= bounds.min.y - padding &&
    local.y <= bounds.max.y + padding
  )
}

/**
 * Elemanın dönmüş/ölçeklenmiş kutusunun dünya köşeleri. `toSymbolLocalPoint`'in
 * TERSİ (ölçekle → +açı döndür → ötele) ve onunla aynı açı yönünü kullanır (R2);
 * ikisi ayrışırsa çerçeve seçimi tıklama seçiminden farklı eleman bulur.
 */
export function getElementWorldCorners(
  element: InstallationElement,
  metadata: SymbolMetadata,
): PlanPoint[] {
  const bounds = getSymbolLocalBounds(metadata)
  const angleRad = element.angleDeg * DEG_TO_RAD
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)

  return [
    { x: bounds.min.x, y: bounds.min.y },
    { x: bounds.max.x, y: bounds.min.y },
    { x: bounds.max.x, y: bounds.max.y },
    { x: bounds.min.x, y: bounds.max.y },
  ].map((corner) => {
    const scaledX = corner.x * element.scale
    const scaledY = corner.y * element.scale
    return {
      x: element.position.x + scaledX * cos - scaledY * sin,
      y: element.position.y + scaledX * sin + scaledY * cos,
    }
  })
}

/**
 * Çerçevenin TAMAMEN içinde kalan elemanlar — kesişenler seçilmez, mimari
 * taraftaki çerçeve seçimiyle aynı kural (core/selection.ts). Sınav elemanın
 * origin'i değil dört köşesi: origin çoğu sembolde port hizasında, kenarda
 * duruyor; ona bakılsaydı çerçevenin yarısı dışında kalan sembol de seçilirdi.
 */
export function getElementsInRect(
  rect: PlanRect,
  elements: readonly InstallationElement[],
  getMetadata: SymbolMetadataLookup,
): Id[] {
  return elements
    .filter((element) =>
      getElementWorldCorners(element, getMetadata(element.type)).every((corner) =>
        isPointInRect(corner, rect),
      ),
    )
    .map((element) => element.id)
}

/**
 * İmlecin altındaki eleman. Üst üste binenlerde SONUNCU kazanır — sahne diziyi
 * sırayla çiziyor, yani dizinin sonu en üstte görünen eleman.
 */
export function pickElementAt(
  point: PlanPoint,
  elements: readonly InstallationElement[],
  getMetadata: SymbolMetadataLookup,
  toleranceCm = 0,
): InstallationElement | null {
  for (let index = elements.length - 1; index >= 0; index -= 1) {
    const element = elements[index]
    if (isPointInsideElement(point, element, getMetadata(element.type), toleranceCm)) {
      return element
    }
  }
  return null
}
