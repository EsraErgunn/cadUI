import type { Id } from './model'
import { buildFloorRoomTopology } from './roomTopology'
import { validateFloorArchitecture } from './validateArchitecture'
import { validateFloorInstallation } from './validateInstallation'
import type { ValidationIssue, ValidationSource } from './validationModel'

/**
 * Doğrulama sözleşmesi `validationModel.ts`'te yaşıyor ve buradan yeniden dışa
 * veriliyor: kural dosyaları sözleşmeyi bu dosyadan alsaydı `validate.ts`
 * onları, onlar da `validate.ts`'i import eder — döngü kurulurdu. Tüketiciler
 * için tek kapı yine burası.
 */
export * from './validationModel'

/**
 * Projenin tamamını denetler. Sıra KATA göre (dizinin kendisi = kat sırası,
 * bkz. knowledge/floor-ordering.md), kat içinde kural sırasına göre — liste
 * her çalıştırmada aynı sırada gelsin, kullanıcı satırları takip edebilsin.
 *
 * Katı olmayan (proje düzeyindeki) kural bu adımda YOK; çıkarsa döngünün
 * dışına, sonuna eklenir.
 */
export function validateProject(source: ValidationSource): ValidationIssue[] {
  return source.floors.flatMap((floor) => {
    // Topoloji kat başına BİR kez kuruluyor ve iki tarafa da veriliyor: yüz
    // taraması kuralların en pahalı adımı ve dört kural aynı sonucu okuyor.
    const topology = buildFloorRoomTopology(source.walls, source.points, source.rooms, floor.id)

    return [
      ...validateFloorArchitecture(source, floor, topology),
      ...validateFloorInstallation(source, floor, topology),
    ]
  })
}

export function countIssues(issues: readonly ValidationIssue[], floorId: Id | undefined): number {
  if (floorId === undefined) return issues.length
  return issues.filter((issue) => issue.location.floorId === floorId).length
}
