import { INSTALLATION_LINE_KIND_LABELS } from '../../plumbing/core/elementLabels'
import type { InstallationLine } from '../../plumbing/core/installationModel'
import { DISCHARGE_LINE_KINDS, isDischargeKind } from '../../plumbing/core/lineKinds'
import type { DischargeLineKind } from '../../plumbing/core/lineKinds'
import { PIPE_TYPE_NAMES } from '../../plumbing/core/pipeTypes'
import type { PipeTypeName } from '../../plumbing/core/pipeTypes'

/**
 * Açıklamanın bir satırı: yalnız KİMLİK. Dış çap ve toplam boy kullanıcı
 * isteğiyle KALDIRILDI (K166) — açıklamanın tek işi "bu renk ne demek"; ölçü
 * bilgisi çizim ekranlarında, borunun kendi ölçü etiketinde okunuyor.
 *
 * Renk BURADA YOK: gaz borusunun rengi katalogdan, deşarj hattınınki sahne
 * temasından geliyor ve `core/` sahneyi import edemez — rengi çizen taraf
 * `rowId`'den çözer.
 */
export type IsometricLegendRow = {
  rowId: PipeTypeName | DischargeLineKind
  label: string
}

/**
 * Çizimde GERÇEKTEN kullanılan hat türleri, katalog sırasında.
 *
 * Neden hepsi değil: renk açıklaması dokuz satır olsaydı okunmaz bir liste
 * olurdu ve kullanıcı çiziminde olmayan renkleri arardı. Katalog sırası
 * korunuyor — çizim sırası kullanılsaydı aynı proje iki açılışta farklı
 * sıralanabilirdi.
 *
 * Deşarj hatları (baca, havalandırma) gaz çaplarından SONRA gelir: paftanın
 * konusu gaz hattı, onlar ona eşlik eden ikinci sınıf bilgi. Çapları yok,
 * kimlikleri türlerinin adı (bkz. lineKinds.ts).
 */
export function getIsometricLegendRows(
  lines: readonly InstallationLine[],
): IsometricLegendRow[] {
  const usedTypeNames = new Set<PipeTypeName>()
  const usedDischargeKinds = new Set<DischargeLineKind>()

  for (const line of lines) {
    if (isDischargeKind(line.kind)) {
      usedDischargeKinds.add(line.kind)
      continue
    }
    // Kalan her tür gaz taşıyor (kol ve branşman dahil): hepsinin çapı var.
    usedTypeNames.add(line.pipeTypeName)
  }

  return [
    ...PIPE_TYPE_NAMES.filter((typeName) => usedTypeNames.has(typeName)).map((typeName) => ({
      rowId: typeName,
      label: typeName,
    })),
    ...DISCHARGE_LINE_KINDS.filter((kind) => usedDischargeKinds.has(kind)).map((kind) => ({
      rowId: kind,
      label: INSTALLATION_LINE_KIND_LABELS[kind],
    })),
  ]
}
