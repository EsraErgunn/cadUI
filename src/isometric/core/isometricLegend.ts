import type { InstallationLine } from '../../plumbing/core/installationModel'
import { isGasCarryingKind } from '../../plumbing/core/lineKinds'
import { PIPE_TYPE_NAMES } from '../../plumbing/core/pipeTypes'
import type { PipeTypeName } from '../../plumbing/core/pipeTypes'

/**
 * Çizimde GERÇEKTEN kullanılan gaz borusu çapları, katalog sırasında.
 *
 * Neden hepsi değil: renk açıklaması dokuz satır olsaydı okunmaz bir liste
 * olurdu ve kullanıcı çiziminde olmayan renkleri arardı. Katalog sırası
 * korunuyor (`PIPE_TYPE_NAMES`) — çizim sırası kullanılsaydı aynı proje iki
 * açılışta farklı sıralanabilirdi.
 *
 * Deşarj hatları (baca, havalandırma) DIŞARIDA: onların çapı yok, rengi
 * türünden geliyor (bkz. lineKinds.ts).
 */
export function getUsedPipeTypeNames(
  lines: readonly InstallationLine[],
): PipeTypeName[] {
  const used = new Set<PipeTypeName>()
  for (const line of lines) {
    if (!isGasCarryingKind(line.kind)) continue
    used.add(line.pipeTypeName)
  }
  return PIPE_TYPE_NAMES.filter((name) => used.has(name))
}
