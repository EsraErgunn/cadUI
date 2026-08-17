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
 *
 * İKİNCİ kaynak: döndürme tutamacının `followers`'ı (`elementRotateHandle.ts`
 * → branşmandaki sayaç gibi iki porttan bağlı elemanlar) — pivotun DIŞINDA
 * kalan ucun bağlı olduğu hat noktası da AYNI haritaya, aynı zincirleme
 * yayılımla (`getLinkedLinePoints`) eklenir; iki kaynak birbirini EZMEZ, ikisi
 * aynı anda aktif olamaz (köşe sürüklemesi ve eleman döndürmesi ayrı araçlar).
 */
export function useDraggedCorners(
  lines: readonly InstallationLine[],
  connections: readonly InstallationConnection[],
): ReadonlyMap<Id, DraggedCorner> {
  const cornerDrag = usePlumbingUiStore((state) => state.draggingLineCorner)
  const rotateDrag = usePlumbingUiStore((state) => state.elementRotateDrag)
  const rotateFollowers = rotateDrag?.followers

  return useMemo(() => {
    if (!cornerDrag && (!rotateFollowers || rotateFollowers.length === 0)) return NO_DRAGGED_CORNERS

    const corners = new Map<Id, DraggedCorner>()

    if (cornerDrag) {
      for (const link of getLinkedLinePoints(lines, connections, cornerDrag.lineId, cornerDrag.pointId)) {
        corners.set(link.lineId, { pointId: link.pointId, position: cornerDrag.position })
      }
    }

    for (const follower of rotateFollowers ?? []) {
      for (const link of getLinkedLinePoints(lines, connections, follower.lineId, follower.pointId)) {
        corners.set(link.lineId, { pointId: link.pointId, position: follower.position })
      }
    }

    return corners
  }, [cornerDrag, rotateFollowers, lines, connections])
}
