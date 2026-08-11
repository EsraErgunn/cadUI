import { useMemo } from 'react'

import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'
import type { InstallationConnection, InstallationLine } from '../core/installationModel'
import { getLinkedLinePoints } from '../core/lineCornerLink'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

/** Bir hattın sürükleme sırasında geçici konuma taşınan köşesi. */
export type DraggedCorner = { pointId: Id; position: PlanPoint }

/** Sürükleme yokken paylaşılan boş harita: her render'da yeni Map ayırmamak için. */
const NO_DRAGGED_CORNERS: ReadonlyMap<Id, DraggedCorner> = new Map()

/**
 * Sürüklenen köşe + ONUNLA BİRLİKTE giden komşu hat uçları, hat başına
 * indekslenmiş. Kapsayıcıda BİR kez hesaplanır: her hat kendi payına düşeni
 * prop olarak alır, hepsi ayrı ayrı bağlantı listesini taramaz.
 *
 * Bir hattın iki ucu aynı köşede buluşamayacağı için (sıfır boy adım yazılmaz)
 * hat başına tek kayıt yeterli.
 */
export function useDraggedCorners(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
): ReadonlyMap<Id, DraggedCorner> {
  const drag = usePlumbingUiStore((state) => state.draggingLineCorner)

  return useMemo(() => {
    if (!drag) return NO_DRAGGED_CORNERS

    const corners = new Map<Id, DraggedCorner>()
    for (const link of getLinkedLinePoints(lines, connections, drag.lineId, drag.pointId)) {
      corners.set(link.lineId, { pointId: link.pointId, position: drag.position })
    }
    return corners
  }, [drag, lines, connections])
}
