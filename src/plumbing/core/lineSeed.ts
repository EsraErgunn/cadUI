import type { InstallationElement, InstallationLineKind } from './installationModel'
import type { InstallationElementType, SymbolMetadata, SymbolPortDefinition } from './symbolMetadata'

/**
 * Hat çiziminin ilk tıklamasında ÖNCE yerleştirilecek eleman; yoksa null.
 *
 * - Branşman her zaman sayaçla gelir: branşman hattı sayaçtan başlar, önce sayaç
 *   konur sonra boru ondan devam eder.
 * - Boru, projede hiç servis kutusu yokken kutuyu kendisi koyar — tesisat servis
 *   kutusundan başlar ve kullanıcı "önce kutuyu ekle" diye engellenmez.
 *   Kutu zaten varsa boru serbest başlar; servis kutusu proje başına TEKTİR.
 */
export function getLineSeedElementType(
  kind: InstallationLineKind,
  hasServiceBox: boolean,
): InstallationElementType | null {
  if (kind === 'branch') return 'gasMeter'
  return hasServiceBox ? null : 'serviceBox'
}

export function hasServiceBox(elements: readonly InstallationElement[]): boolean {
  return elements.some((element) => element.type === 'serviceBox')
}

/**
 * Hattın çıkacağı port: gaz yönü gereği ÇIKIŞ portu (sayaç/servis kutusu
 * tüketime buradan besler). Çıkışı olmayan sembolde ilk port kullanılır.
 */
export function getSeedPort(metadata: SymbolMetadata): SymbolPortDefinition | null {
  return metadata.ports.find((port) => port.type === 'output') ?? metadata.ports[0] ?? null
}
