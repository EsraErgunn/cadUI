import type { InstallationLine, InstallationLineKind } from './installationModel'
import { PIPE_TYPES } from './pipeTypes'

/**
 * Gaz TAŞIMAYAN, cihazın yanma ürününü/havasını götüren hatlar. Boru grafiğine
 * girmezler: üzerlerine armatür oturmaz, boru onları ayırmaz, çapları yoktur.
 */
export const DISCHARGE_LINE_KINDS = ['chimney', 'ventilationDuct'] as const

export type DischargeLineKind = (typeof DISCHARGE_LINE_KINDS)[number]

export function isDischargeKind(kind: InstallationLineKind): kind is DischargeLineKind {
  return (DISCHARGE_LINE_KINDS as readonly string[]).includes(kind)
}

/**
 * Gaz taşıyan hat mı? `pipeTypeName` YALNIZ bunun doğru olduğu hatlarda
 * anlamlıdır — deşarj hattında alan yazılır ama okunmaz.
 */
export function isGasCarryingKind(kind: InstallationLineKind): boolean {
  return !isDischargeKind(kind)
}

/**
 * Kanal genişliği TÜR BAŞINA SABİT: modelde alan tutulmaz, örnek başına
 * değiştirilemez (kullanıcı kararı).
 *
 * Baca 20 cm: TR'de tek cidarlı baca Ø130–200 mm aralığında; 20 cm plan
 * damgası olarak okunaklı ve en kalın borudan (DN100, 11.43 cm) net ayrılır.
 * Havalandırma 30 cm: kesiti bacadan büyüktür ve iki tür ilk bakışta yalnız
 * renkten değil GENİŞLİKTEN de ayırt edilmeli.
 */
export const DISCHARGE_WIDTH_CM: Record<DischargeLineKind, number> = {
  chimney: 20,
  ventilationDuct: 30,
}

/**
 * Hattın plandaki dış genişliği: gazda boru çapı, deşarjda tür sabiti. Tıklama
 * bandı, çizgi kalınlığı ve ölçü etiketi ofseti bu TEK kaynağı paylaşır — üçü
 * ayrı hesaplansaydı zamanla ayrışır ve kanal gövdesinden tıklanamaz olurdu.
 */
export function getLineOuterWidthCm(line: Pick<InstallationLine, 'kind' | 'pipeTypeName'>): number {
  if (isDischargeKind(line.kind)) return DISCHARGE_WIDTH_CM[line.kind]
  return PIPE_TYPES[line.pipeTypeName].outerDiameterCm
}
