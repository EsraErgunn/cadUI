import type { ThreePosition } from '../../core/coords'
import type { Id } from '../../core/model'
import type { InstallationLineKind } from '../../plumbing/core/installationModel'
import type { PipeTypeName } from '../../plumbing/core/pipeTypes'

/**
 * İzometrik sahnenin TÜRETİLMİŞ verisi. Store'a KONMAZ, kaydedilmez — her
 * çizimde projeden yeniden üretilir (sahne state'in türevidir kuralı).
 */
export type IsometricLineGeometry = {
  lineId: Id
  kind: InstallationLineKind
  /** Gaz taşımayan hatta anlamsız; renk seçimi yapan taraf `kind`'a bakar. */
  pipeTypeName: PipeTypeName
  outerWidthCm: number
  /** Köşe sırası korunur; kot ve izometrik kaydırma UYGULANMIŞ hâlde. */
  positions: ThreePosition[]
  pointIds: Id[]
}

export type IsometricElementPlacement = {
  elementId: Id
  position: ThreePosition
}

/** Alt kattaki bir boru ucunu üst kattakine bağlayan düşey parça. */
export type IsometricFloorLinkGeometry = {
  linkId: Id
  from: ThreePosition
  to: ThreePosition
}

export type IsometricBounds = {
  min: ThreePosition
  max: ThreePosition
  center: ThreePosition
  /** En uzun kenar — kamera mesafesi ve ortografik çerçeve buradan ölçeklenir. */
  sizeCm: number
}

export type IsometricSceneData = {
  lines: IsometricLineGeometry[]
  elements: IsometricElementPlacement[]
  floorLinks: IsometricFloorLinkGeometry[]
  /** Çizim tamamen boşsa `null` — kamera o zaman varsayılan çerçevede kalır. */
  bounds: IsometricBounds | null
}
