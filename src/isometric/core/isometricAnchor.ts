import { getPointIsometricOffsetCm } from './isometricOffset'
import type { PlanPoint } from '../../core/coords'
import { getOnLineAnchorOffset } from '../../plumbing/core/attachGeometry'
import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../../plumbing/core/installationModel'
import { getLineEndPointId } from '../../plumbing/core/lineCornerLink'
import { getPortWorldPosition, svgLocalToPlanOffset } from '../../plumbing/core/ports'
import type { SymbolMetadata } from '../../plumbing/core/symbolMetadata'

export type IsometricElementAnchor = {
  /** Bağlantı noktasının PLAN konumu — boru ucu TAM burada biter. */
  position: PlanPoint
  /**
   * Sembolün kendi (dönüşsüz, ölçekli) eksenlerinde çapa ofseti. İzometrikte
   * sembol kameraya dönük durduğu ve plan açısı UYGULANMADIĞI için
   * (`IsometricElement.tsx`) dünya ofseti kullanılamaz — sembol billboard'ın
   * içinde bu kadar geri kaydırılır ki çapası tam boru ucuna otursun.
   */
  localOffsetCm: PlanPoint
  /**
   * Tutunduğu boru NOKTASININ izometrik kayması (K169). Eleman kendi kaymasını
   * TAŞIMAZ: bir dal çekildiğinde sembolün de gelmesi gerekiyor ve kaymayı
   * ayrıca saklamak iki kaynak (boru ucu ile sembol) doğurup ayrışmalarına yol
   * açardı — türetmek her zaman tutarlı.
   */
  isometricOffsetCm: PlanPoint
}

const NO_OFFSET: PlanPoint = { x: 0, y: 0 }

function scaleOffset(offset: PlanPoint, scale: number): PlanPoint {
  return { x: offset.x * scale, y: offset.y * scale }
}

/**
 * Elemanın izometrikte boruya DEĞDİĞİ nokta. Semboller plan görünüşünde kendi
 * geometrisiyle çizildiği için port zaten yerine oturuyor; izometrikte ise
 * sembol elemanın ORİJİNİNDE billboard ediliyordu — boru ucu porta bitiyor,
 * sembol orijine oturuyor ve aradaki port ofseti kadar KAYMA kalıyordu
 * (kullanıcı bulgusu, 2026-08: "portlarla borular tam birleşsin").
 *
 * Çözüm sırası `getElementElevationCm` ve `getElementIsometricOffsetCm` ile
 * AYNI olmak zorunda: kot, kayma ve çapa farklı bağlantılardan okunsaydı sembol
 * bir eksende oturur, diğerinde kopardı.
 */
export function getElementIsometricAnchor(
  element: InstallationElement,
  metadata: SymbolMetadata,
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
): IsometricElementAnchor {
  for (const line of lines) {
    const node = line.points.find((point) => point.inlineElementId === element.id)
    // Armatür boru DÜĞÜMÜdür: çapası düğümün kendisi, sembol oraya oturur.
    if (node) {
      return {
        position: node.position,
        localOffsetCm: scaleOffset(getOnLineAnchorOffset(metadata), element.scale),
        isometricOffsetCm: getPointIsometricOffsetCm(node),
      }
    }
  }

  const connection = connections.find(
    (candidate) => candidate.target.kind === 'port' && candidate.target.elementId === element.id,
  )
  const portId = connection?.target.kind === 'port' ? connection.target.portId : undefined
  const port = metadata.ports.find((candidate) => candidate.id === portId)
  if (!port) {
    return { position: element.position, localOffsetCm: NO_OFFSET, isometricOffsetCm: NO_OFFSET }
  }

  return {
    position: getPortWorldPosition(element, port, metadata),
    localOffsetCm: svgLocalToPlanOffset(port.position, metadata.origin, element.scale),
    isometricOffsetCm: getConnectedPointOffsetCm(connection, lines),
  }
}

/** Elemanın portuna oturan boru ucunun kayması — sembol o uçla birlikte gider. */
function getConnectedPointOffsetCm(
  connection: InstallationConnection | undefined,
  lines: readonly InstallationLine[],
): PlanPoint {
  if (!connection) return NO_OFFSET

  const pointId = getLineEndPointId(lines, connection.lineId, connection.end)
  if (pointId === undefined) return NO_OFFSET

  for (const line of lines) {
    const point = line.points.find((candidate) => candidate.id === pointId)
    if (point) return getPointIsometricOffsetCm(point)
  }
  return NO_OFFSET
}
