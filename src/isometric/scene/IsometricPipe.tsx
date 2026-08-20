import { IsometricTube } from './IsometricTube'
import { getIsometricLineColor } from './isometricTheme'
import type { IsometricLineGeometry } from '../core/isometricModel'

type IsometricPipeProps = {
  geometry: IsometricLineGeometry
  opacity: number
  onPointerDown?: () => void
}

/** Tek bir tesisat hattının 3B gövdesi; renk seçimi `isometricTheme`'de. */
export function IsometricPipe({ geometry, opacity, onPointerDown }: IsometricPipeProps) {
  return (
    <IsometricTube
      positions={geometry.positions}
      radiusCm={geometry.outerWidthCm / 2}
      colorHex={getIsometricLineColor(geometry)}
      opacity={opacity}
      onPointerDown={onPointerDown}
    />
  )
}
