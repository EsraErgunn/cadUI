import { IsometricTube } from './IsometricTube'
import { ISOMETRIC_DISCHARGE_OPACITY, getIsometricLineColor } from './isometricTheme'
import { isDischargeKind } from '../../plumbing/core/lineKinds'
import type { IsometricLineGeometry } from '../core/isometricModel'

type IsometricPipeProps = {
  geometry: IsometricLineGeometry
  opacity: number
  onPointerDown?: () => void
}

/**
 * Tek bir tesisat hattının 3B gövdesi; renk seçimi `isometricTheme`'de.
 *
 * Baca ve havalandırma KARE kesitli ve YARI SAYDAM çizilir: sahada da kanal
 * kesitleri dikdörtgen, üstelik ikisi gaz borusundan çok daha kalın olduğu
 * için opak çizilince arkalarındaki boruları tamamen örtüyorlardı. Saydamlık
 * onları "içinden geçilen şaft" gibi okutuyor.
 */
export function IsometricPipe({ geometry, opacity, onPointerDown }: IsometricPipeProps) {
  const isDischarge = isDischargeKind(geometry.kind)

  return (
    <IsometricTube
      positions={geometry.positions}
      radiusCm={geometry.outerWidthCm / 2}
      colorHex={getIsometricLineColor(geometry)}
      opacity={isDischarge ? opacity * ISOMETRIC_DISCHARGE_OPACITY : opacity}
      profile={isDischarge ? 'square' : 'round'}
      onPointerDown={onPointerDown}
    />
  )
}
