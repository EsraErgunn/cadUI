import type { InstallationElement } from './installationModel'
import type { SymbolMetadata, SymbolPortDefinition } from './symbolMetadata'
import { normalizeZero, type PlanPoint } from '../../core/coords'

const DEG_TO_RAD = Math.PI / 180

/**
 * SVG yerel → plan ofseti. SVG'de +Y aşağı, planda +Y yukarı; bu işaret
 * symbolLoader.ts'in geometriye uyguladığı bake ile AYNI olmalı (Risk R1).
 */
export function svgLocalToPlanOffset(
  local: readonly [number, number],
  origin: readonly [number, number],
  scale: number,
): PlanPoint {
  return {
    x: (local[0] - origin[0]) * scale,
    y: normalizeZero(-(local[1] - origin[1]) * scale),
  }
}

/**
 * Sembol yerel ofsetini eleman açısıyla döndürür. SymbolInstance.tsx'teki three
 * `rotation.y = angleDeg * DEG_TO_RAD` ile AYNI yönde döner (Risk R2) — ikisi de
 * standart CCW döndürme matrisini kullanır. Dönüşüm TEK yerde: ikinci bir kopya
 * açı işaretini ters çevirir ve port konumu sessizce şaşardı.
 */
export function rotatePlanOffset(offset: PlanPoint, angleDeg: number): PlanPoint {
  const angleRad = angleDeg * DEG_TO_RAD
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  return {
    x: normalizeZero(offset.x * cos - offset.y * sin),
    y: normalizeZero(offset.x * sin + offset.y * cos),
  }
}

/**
 * Bir portun plan koordinatı: ölçek → dönme → öteleme sırası (Bölüm 7).
 * Parametre yapısal: gaz portu (`SymbolPortDefinition`) da deşarj portu
 * (`SymbolDischargePort`) da aynı yerel uzayı kullanıyor, ikisi için ayrı bir
 * kopya yazılmaz.
 */
export function getPortWorldPosition(
  element: InstallationElement,
  port: Pick<SymbolPortDefinition, 'position'>,
  metadata: SymbolMetadata,
): PlanPoint {
  const offset = rotatePlanOffset(
    svgLocalToPlanOffset(port.position, metadata.origin, element.scale),
    element.angleDeg,
  )
  return {
    x: element.position.x + offset.x,
    y: element.position.y + offset.y,
  }
}

/**
 * Portun plandaki çıkış yönü. İşaret çevrimi konum ofsetiyle AYNI (SVG +Y aşağı,
 * plan +Y yukarı); ölçek uygulanmaz — pozitif ve tekdüze olduğu için birim
 * vektörün yönünü değiştirmez, boyunu bozmasın diye dışarıda bırakılır.
 */
export function getPortWorldDirection(
  element: Pick<InstallationElement, 'angleDeg'>,
  port: { direction: readonly [number, number] },
): PlanPoint {
  return rotatePlanOffset({ x: port.direction[0], y: -port.direction[1] }, element.angleDeg)
}

/**
 * `svgLocalToPlanOffset` + yerleştirmenin TERSİ: plan noktasını sembolün yerel
 * (SVG) uzayına geri götürür. Serbest deşarj ağzı buna dayanır — imleç planda
 * gelir, ağız yerel koordinatta saklanır.
 *
 * Sıra ileri yönün tam tersi: öteleme → −açı ile dönme → ölçek → +Y işareti.
 */
export function planToSvgLocal(
  element: Pick<InstallationElement, 'position' | 'angleDeg' | 'scale'>,
  metadata: Pick<SymbolMetadata, 'origin'>,
  point: PlanPoint,
): readonly [number, number] {
  const offset = rotatePlanOffset(
    { x: point.x - element.position.x, y: point.y - element.position.y },
    -element.angleDeg,
  )
  return [
    offset.x / element.scale + metadata.origin[0],
    -(offset.y / element.scale) + metadata.origin[1],
  ]
}
