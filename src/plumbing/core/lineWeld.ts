import type { InstallationConnection, InstallationLine } from './installationModel'
import type { LinkedLinePoint } from './lineCornerLink'
import { isSamePoint } from './lineGeometry'
import { isLineEndConnected } from './portSnap'

type LineEnd = InstallationConnection['end']

/** Noktanın hattaki rolü: uç değilse (zincirin ortası) kaynak yapılmaz. */
function getPointEnd(line: InstallationLine, pointId: number): LineEnd | null {
  if (line.points[0]?.id === pointId) return 'start'
  if (line.points.at(-1)?.id === pointId) return 'end'
  return null
}

/**
 * Sürüklenip başka bir borunun ucuyla ÇAKIŞAN uçlar için yazılacak bağlantı
 * kayıtları (kullanıcı isteği, 2026-08: "üst üste gelen borular seçme aracıyla
 * taşıyınca bağlanabilsin").
 *
 * Köşe sürüklemesi zaten en yakın hat köşesine tam oturuyordu
 * (`findNearestLineCorner`) ama bu yalnız KONUMDU: iki uç aynı yerde durup
 * kayıtsız kaldığı için ağ hâlâ kopuktu — sonraki taşımada ayrılıyor ve
 * "bağlantısız uç" uyarısı da kapanmıyordu.
 *
 * Yalnız UÇTAN UCA kaynak yapılır: iki nokta da kendi hattının ucu olmalı,
 * taşınan uç boşta olmalı (bir elemana/hatta zaten bağlıysa dokunulmaz) ve
 * hatlar aynı katta, farklı olmalı. Taşınan kümenin KENDİ noktaları hedef
 * değildir — zincirin iki adımı birlikte gelir, kendi kendine bağlanmasınlar.
 */
export function collectWeldConnections(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
  movedPoints: readonly LinkedLinePoint[],
): InstallationConnection[] {
  const movedPointIds = new Set(movedPoints.map((point) => point.pointId))
  const welds: InstallationConnection[] = []

  for (const moved of movedPoints) {
    const line = lines.find((candidate) => candidate.id === moved.lineId)
    if (!line) continue

    const end = getPointEnd(line, moved.pointId)
    if (end === null || isLineEndConnected(connections, line.id, end)) continue

    const point = line.points.find((candidate) => candidate.id === moved.pointId)
    if (!point) continue

    for (const other of lines) {
      if (other.id === line.id || other.floorId !== line.floorId) continue

      const target = other.points.find(
        (candidate) =>
          !movedPointIds.has(candidate.id) &&
          getPointEnd(other, candidate.id) !== null &&
          isSamePoint(candidate.position, point.position),
      )
      if (!target) continue

      welds.push({
        lineId: line.id,
        end,
        target: { kind: 'line', lineId: other.id, pointId: target.id },
      })
      break
    }
  }

  return welds
}
