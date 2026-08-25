import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import type { InstallationLinePoint } from '../../plumbing/core/installationModel'

/**
 * İzometride bir noktanın toplam kayması: kendi kayması + önceki noktadan miras
 * kalan. WebCAD'in `getRelativeIsometricVector()` karşılığı (izometrik.md).
 *
 * İki alan neden ayrı duruyor: kullanıcı bir noktayı sürüklediğinde dalın
 * TAMAMI kaymalı, ama sonradan o dalın içindeki tek bir nokta daha
 * sürüklenebilmeli. Tek alanda toplansaydı ikisi ayırt edilemez, "yalnız bu
 * noktayı geri al" imkânsız olurdu. `izometrik_ornek.wcp`'de 54 noktanın 24'ü
 * birebir aynı miras değerini taşıyor — tek bir sürüklemenin izi.
 */
export function getPointIsometricOffsetCm(point: InstallationLinePoint): PlanPoint {
  const own = point.isometricOffsetCm
  const inherited = point.inheritedIsometricOffsetCm
  return {
    x: (own?.x ?? 0) + (inherited?.x ?? 0),
    y: (own?.y ?? 0) + (inherited?.y ?? 0),
  }
}

export function hasDefaultIsometricPosition(point: InstallationLinePoint): boolean {
  const offset = getPointIsometricOffsetCm(point)
  return offset.x === 0 && offset.y === 0
}

/**
 * Sıfır kayma alanı YAZILMAZ, silinir: `docs/sample-project.json` bit-bit
 * round-trip testi `{x:0,y:0}` gibi "yoktan var edilmiş" alanları yakalar.
 */
function withOffset(
  point: InstallationLinePoint,
  key: 'isometricOffsetCm' | 'inheritedIsometricOffsetCm',
  value: PlanPoint,
): InstallationLinePoint {
  const next = { ...point }
  if (value.x === 0 && value.y === 0) {
    delete next[key]
    return next
  }
  next[key] = value
  return next
}

function addOffset(current: PlanPoint | undefined, deltaCm: PlanPoint): PlanPoint {
  return { x: (current?.x ?? 0) + deltaCm.x, y: (current?.y ?? 0) + deltaCm.y }
}

/**
 * Sürüklemenin nokta listesine uygulanmış hâli: SÜRÜKLENEN nokta kendi
 * kaymasını, `movedPointIds` içindekiler MİRASI alır, kalanlar hiç
 * dokunulmaz.
 *
 * İki alan neden ayrı: kullanıcı bir noktayı çektiğinde dalın tamamı kayar
 * ama sonradan o dalın içindeki tek bir nokta daha çekilebilmeli. Tek alanda
 * toplansaydı ikisi ayırt edilemez, "yalnız bu noktayı geri al" imkânsız
 * olurdu (WebCAD `setIsometricVectorRel`).
 *
 * Hangi noktaların kayacağına BU FONKSİYON karar VERMEZ — karar
 * `isometricNetworkDrag.ts`'te, çünkü yayılım tek hattın içinde kalmıyor.
 *
 * Plan koordinatlarına hiç dokunulmaz — izometrikte çizimi ayıklamak plan
 * çizimini bozmamalı.
 */
export function applyIsometricOffsets(
  points: readonly InstallationLinePoint[],
  draggedPointId: Id,
  movedPointIds: ReadonlySet<Id>,
  deltaCm: PlanPoint,
): InstallationLinePoint[] {
  if (deltaCm.x === 0 && deltaCm.y === 0) return [...points]

  return points.map((point) => {
    if (point.id === draggedPointId) {
      return withOffset(point, 'isometricOffsetCm', addOffset(point.isometricOffsetCm, deltaCm))
    }
    if (!movedPointIds.has(point.id)) return point

    return withOffset(
      point,
      'inheritedIsometricOffsetCm',
      addOffset(point.inheritedIsometricOffsetCm, deltaCm),
    )
  })
}

/**
 * Yeni eklenen bir nokta, bağlandığı noktanın kaymasını devralır — yoksa
 * kaydırılmış bir dalın ucuna eklenen boru birden bire ana gövdeye geri
 * zıplardı (WebCAD `inheritIsometricPositionFrom`).
 *
 * Yalnız kendi kayması OLMAYAN noktaya uygulanır: kullanıcı zaten elle
 * yerleştirdiyse miras onu ezmemeli.
 */
export function inheritIsometricOffset(
  point: InstallationLinePoint,
  source: InstallationLinePoint,
): InstallationLinePoint {
  if (!hasDefaultIsometricPosition(point)) return point

  const inherited = getPointIsometricOffsetCm(source)
  return withOffset(point, 'inheritedIsometricOffsetCm', inherited)
}

/** "İzometrik konumları sıfırla": iki alan da temizlenir, plan çizimi etkilenmez. */
export function clearIsometricOffsets(
  points: readonly InstallationLinePoint[],
): InstallationLinePoint[] {
  return points.map((point) => {
    if (hasDefaultIsometricPosition(point)) return point
    const next = { ...point }
    delete next.isometricOffsetCm
    delete next.inheritedIsometricOffsetCm
    return next
  })
}
