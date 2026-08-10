import type { FloorCloneSource } from './floorClone'
import type { Id } from './model'
import { isSymbolOnFloor } from './symbolPlacement'

/**
 * Bir katta hangi tür çizim var (madde 7). İki tür AYRI tutulur çünkü rozetler
 * ayrı gösteriliyor ve kat kopyalama ikisini ayrı ayrı seçtiriyor (madde 16).
 */
export type FloorContent = {
  hasArchitecture: boolean
  hasInstallation: boolean
}

export type FloorContentSource = FloorCloneSource & {
  installationElements: readonly { floorId: Id }[]
  installationLines: readonly { floorId: Id }[]
}

/**
 * Rozet kat verisinden ANLIK üretilir (madde 7), saklanmaz: kaydedilen bir
 * "doluluk" alanı çizim değiştikçe ayrışır ve kullanıcı boş bir katı dolu
 * görürdü.
 */
export function getFloorContent(source: FloorContentSource, floorId: Id): FloorContent {
  return {
    // Nokta havuzu duvarın kendisinden önce dolar: yalnız duvara bakmak, henüz
    // kapanmamış bir çizimi "boş" gösterirdi. Sembol duvara bağlıysa katını
    // duvarından alır, bu yüzden duvar listesi de veriliyor.
    hasArchitecture:
      source.points.some((point) => point.floorId === floorId) ||
      source.walls.some((wall) => wall.floorId === floorId) ||
      source.symbols.some((symbol) => isSymbolOnFloor(symbol, floorId, source.walls)),
    hasInstallation:
      source.installationElements.some((element) => element.floorId === floorId) ||
      source.installationLines.some((line) => line.floorId === floorId),
  }
}

export function isFloorContentEmpty(content: FloorContent): boolean {
  return !content.hasArchitecture && !content.hasInstallation
}
