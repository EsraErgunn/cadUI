import { INSTALLATION_LINE_KIND_LABELS } from './elementLabels'
import type { InstallationLine } from './installationModel'
import { formatLengthMeters } from './lengthFormat'
import { isGasCarryingKind } from './lineKinds'
import type { PlanPoint } from '../../core/coords'
import { getMeasurementAnchor } from '../../core/measurement'

/** Boy ile kimliği ayıran orta nokta — eleman künyesindeki ayırıcıyla aynı. */
const LABEL_SEPARATOR = ' · '

/**
 * Hattın KİMLİĞİ: gaz taşıyan hatta anma çapı (`DN25`), deşarj hattında türünün
 * adı (`Baca`). Deşarjda `pipeTypeName` yazılıdır ama okunmaz — çapları yoktur
 * (bkz. lineKinds.ts).
 */
export function getLineIdentityLabel(line: InstallationLine): string {
  if (isGasCarryingKind(line.kind)) return line.pipeTypeName
  return INSTALLATION_LINE_KIND_LABELS[line.kind]
}

/**
 * Ölçü etiketi: `1,20 m · DN25`. Boyun yanına HANGİ BORU olduğu da yazılır
 * (kullanıcı isteği) — çap eskiden yalnız RENKTEN okunuyordu (K132) ve renk
 * ancak açıklamaya bakılarak çözülebiliyordu; ölçüyü okuyan kişi zaten
 * malzemeyi arıyor.
 *
 * Kimlik boyun SONRASINDA: etiketin ilk okunan parçası ölçü, çap onu niteliyor.
 */
export function getLineMeasurementLabel(
  line: InstallationLine,
  segmentLengthCm: number,
): string {
  return `${formatLengthMeters(segmentLengthCm)}${LABEL_SEPARATOR}${getLineIdentityLabel(line)}`
}

/**
 * Hattın özellik panelinde girilen AÇIKLAMASI, eleman ad etiketiyle aynı
 * biçimde çizilir.
 *
 * Tür adı ("Boru") etikete GİRMEZ (kullanıcı isteği): her hatta tekrarlanan
 * aynı kelime kalabalıktan başka bir şey üretmiyor, hattın ne olduğu zaten
 * renginden ve ölçü etiketindeki çapından okunuyor. Açıklaması olmayan hat da
 * etiket üretmez — yazılacak bir şey yok.
 *
 * Açıklama alanı YALNIZ `pipe` türünde var (`lineProperties.ts`); baca ve
 * havalandırmanın karşılığı yok, uydurulmaz.
 */
export function getLineDescriptionLabel(line: InstallationLine): string | null {
  return line.pipe?.description?.trim() || null
}

/**
 * Açıklama etiketinin yeri: ORTA bölümün ortası, dikinde kaydırılmış. İlk bölüm
 * seçilseydi L biçimli hatta etiket ucun dibine düşerdi; iki uç noktanın ortası
 * ise hattın dışına çıkabilir (izometrik künyesiyle aynı gerekçe).
 *
 * Kaydırma ÇAĞIRANDAN gelir ve ölçü etiketinin TERS yönünde verilir — ikisi
 * aynı tarafta olsaydı "1,20 m · DN25" ile açıklama üst üste binerdi.
 */
export function getLineLabelAnchorCm(
  positions: readonly PlanPoint[],
  offsetCm: number,
): PlanPoint | null {
  if (positions.length < 2) return null

  const segmentIndex = Math.floor((positions.length - 1) / 2)
  return getMeasurementAnchor(positions[segmentIndex], positions[segmentIndex + 1], offsetCm)
}
