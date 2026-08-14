import { useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import { isGridSnapActive } from './gridSnapMode'
import type { PlanPoint } from '../core/coords'
import { pickGridLevel } from '../core/grid'
import {
  getSnapToleranceCm,
  isSnapOnExistingGeometry,
  resolveSnap,
  type SnapKind,
} from '../core/snap'
import { WALL_TOOL_ID } from '../core/tools'
import type { WallEnd } from '../store/architectureSlice'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const LEFT_BUTTON = 0

export type WallToolState = {
  /** Zincirin bağlı olduğu son nokta; buradan imlece lastik çizgi uzanır. */
  anchor: PlanPoint | null
  /** İmlecin snap uygulanmış konumu; araç kapalıyken null. */
  cursor: PlanPoint | null
  cursorSnapKind: SnapKind | null
}

const IDLE_STATE: WallToolState = { anchor: null, cursor: null, cursorSnapKind: null }

/**
 * Duvar çizim aracı. DrawSurface yalnız ham pointer olayı yayınlar; araç mantığı
 * CLAUDE.md kural 7 gereği burada durur.
 *
 * Her segment tıklandığı anda store'a yazılır — duvar hemen görünsün diye. Zincir
 * yazılan duvarın uç noktasından (`p2Id`) sürer, böylece aynı köşede ikinci bir
 * Point üretilmez. Sağ tık zinciri bitirir.
 */
export function useWallTool(): WallToolState {
  const isActive = useUiStore((state) => state.activeToolId === WALL_TOOL_ID)
  const camera = useThree((state) => state.camera)

  const anchorRef = useRef<WallEnd | null>(null)
  const [state, setState] = useState<WallToolState>(IDLE_STATE)

  const publish = useCallback(
    (anchor: PlanPoint | null, cursor: PlanPoint | null, snapKind: SnapKind | null) => {
      setState({ anchor, cursor, cursorSnapKind: snapKind })
    },
    [],
  )

  useEffect(() => {
    if (!isActive || !(camera instanceof OrthographicCamera)) return undefined

    let anchorPosition: PlanPoint | null = null

    const snapAt = (planPoint: PlanPoint, event: DrawSurfacePointerEvent) => {
      const { zoom } = readCameraViewport(camera)
      const cad = useCadStore.getState()
      return resolveSnap(
        planPoint,
        { points: cad.points, walls: cad.walls, floorId: cad.activeFloorId },
        {
          toleranceCm: getSnapToleranceCm(zoom),
          gridStepCm: pickGridLevel(zoom).minorCm,
          // Ctrl basılıyken ızgara devre dışı: en küçük adım 50 cm olduğu için
          // hep açık olsaydı ara ölçüde duvar çizilemezdi.
          isGridSnapEnabled: isGridSnapActive(event),
        },
      )
    }

    const endChain = (cursor: PlanPoint | null = null, snapKind: SnapKind | null = null) => {
      anchorRef.current = null
      anchorPosition = null
      publish(null, cursor, snapKind)
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerMove: (event) => {
        const snap = snapAt(event.planPoint, event)
        publish(anchorPosition, snap.point, snap.kind)
      },

      onPointerDown: (event) => {
        // Sağ tık pointerdown'ı da tetikler; yalnız sol tuş nokta koyar.
        if (event.button !== LEFT_BUTTON) return

        const snap = snapAt(event.planPoint, event)
        const end: WallEnd =
          snap.pointId === undefined ? { position: snap.point } : { pointId: snap.pointId }

        if (anchorRef.current === null) {
          anchorRef.current = end
          anchorPosition = snap.point
          publish(anchorPosition, snap.point, snap.kind)
          return
        }

        const added = useCadStore.getState().addWall({ start: anchorRef.current, end })
        // Sıfır boy segment yazılmaz; çapa yerinde kalsın ki zincir kopmasın.
        if (!added) {
          publish(anchorPosition, snap.point, snap.kind)
          return
        }

        // Var olan bir köşeye/duvara bağlandık: şekil kapandı ya da mevcut çizime
        // değdi. Zincir burada biter, kullanıcı sağ tıklamak zorunda kalmaz.
        if (isSnapOnExistingGeometry(snap.kind)) {
          endChain(snap.point, snap.kind)
          return
        }

        anchorRef.current = { pointId: added.p2Id }
        anchorPosition = snap.point
        publish(anchorPosition, snap.point, snap.kind)
      },

      onContextMenu: () => endChain(),
      onCancel: () => endChain(),
    })

    return () => {
      unsubscribe()
      // Araç değişince yarım zincir asılı kalmasın.
      anchorRef.current = null
    }
  }, [camera, isActive, publish])

  // Araç kapalıyken state'i sıfırlamak yerine burada eleniyor: effect gövdesinde
  // setState çağırmak zincirleme render tetikler.
  return isActive ? state : IDLE_STATE
}
