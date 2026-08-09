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

/** Bir portun plan koordinatı: ölçek → dönme → öteleme sırası (Bölüm 7). */
export function getPortWorldPosition(
  element: InstallationElement,
  port: SymbolPortDefinition,
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
