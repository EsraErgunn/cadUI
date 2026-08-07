import { useThree } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import type { PlanPoint } from '../core/coords'
import { pickGridLevel } from '../core/grid'
import { findBlockingOpeningInLoop, getRoomRectangleCorners } from '../core/room'
import {
  findCornerPointIdAt,
  getSnapToleranceCm,
  resolveSnap,
  type SnapKind,
} from '../core/snap'
import { ROOM_TOOL_ID } from '../core/tools'
import type { WallEnd } from '../store/architectureSlice'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const LEFT_BUTTON = 0

export type RoomToolState = {
  /** Sürüklemenin başladığı köşe; bırakılana kadar sabit. Sürükleme yoksa null. */
  origin: PlanPoint | null
  /** İmlecin snap uygulanmış konumu — dikdörtgenin karşıt köşesi. */
  cursor: PlanPoint | null
  cursorSnapKind: SnapKind | null
}

const IDLE_STATE: RoomToolState = { origin: null, cursor: null, cursorSnapKind: null }

/**
 * Dikdörtgen oda aracı: basılı tut, sürükle, bırak.
 *
 * Store'a YALNIZ bırakma anında yazar. Sürüklerken her karede duvar yazsaydı tek
 * oda çizmek onlarca geri alma adımı bırakırdı; iptal de mümkün olmazdı.
 *
 * Oda kaydını bu araç OLUŞTURMAZ: dört duvarı kapalı zincir olarak yazar, mahal
 * kapanan çevrimden kendiliğinden doğar (K31). Böylece elle çizilen odayla
 * duvarlardan doğan oda arasında fark kalmaz — ikisi de aynı yoldan geçer.
 *
 * Araç mantığı DrawSurface'e yazılmaz (kural 7).
 */
export function useRoomTool(): RoomToolState {
  const isActive = useUiStore((state) => state.activeToolId === ROOM_TOOL_ID)
  const camera = useThree((state) => state.camera)

  const originRef = useRef<PlanPoint | null>(null)
  const [state, setState] = useState<RoomToolState>(IDLE_STATE)

  const publish = useCallback(
    (origin: PlanPoint | null, cursor: PlanPoint | null, snapKind: SnapKind | null) => {
      setState({ origin, cursor, cursorSnapKind: snapKind })
    },
    [],
  )

  useEffect(() => {
    if (!isActive || !(camera instanceof OrthographicCamera)) return undefined

    const snapAt = (planPoint: PlanPoint, event: DrawSurfacePointerEvent) => {
      const { zoom } = readCameraViewport(camera)
      const cad = useCadStore.getState()
      return resolveSnap(
        planPoint,
        { points: cad.points, walls: cad.walls, floorId: cad.activeFloorId },
        {
          toleranceCm: getSnapToleranceCm(zoom),
          gridStepCm: pickGridLevel(zoom).minorCm,
          // Ctrl ızgarayı kapatır — duvar aracıyla aynı jest.
          isGridSnapEnabled: !event.ctrlKey,
        },
      )
    }

    const endDrag = () => {
      originRef.current = null
      publish(null, null, null)
    }

    const handlePointerDown = (event: DrawSurfacePointerEvent) => {
      if (event.button !== LEFT_BUTTON) return

      const snap = snapAt(event.planPoint, event)
      originRef.current = snap.point
      publish(snap.point, snap.point, snap.kind)
    }

    const handlePointerMove = (event: DrawSurfacePointerEvent) => {
      const snap = snapAt(event.planPoint, event)
      publish(originRef.current, snap.point, snap.kind)
    }

    const handlePointerUp = (event: DrawSurfacePointerEvent) => {
      const origin = originRef.current
      if (!origin || event.button !== LEFT_BUTTON) return

      const { zoom } = readCameraViewport(camera)
      const corners = getRoomRectangleCorners(origin, snapAt(event.planPoint, event).point)
      endDrag()

      // Sürüklenmemiş tek tıklama ya da çizim artığı kadar küçük dikdörtgen:
      // hiçbir şey yazılmaz.
      if (!corners) return

      const cad = useCadStore.getState()
      const context = { points: cad.points, walls: cad.walls, floorId: cad.activeFloorId }
      const toleranceCm = getSnapToleranceCm(zoom)

      // Dört kenarın HERHANGİ biri bir açıklığın içinden geçiyorsa TÜM
      // dikdörtgen reddedilir — TEK duvar yazılıp diğer üçü atlansaydı yarım
      // bir oda ortaya çıkardı. `appendWall`'daki kontrol yalnız KENDİ
      // segmentini reddediyor, zincirin tamamına karar vermiyor.
      const isBlocked = findBlockingOpeningInLoop(
        corners,
        cad.walls,
        cad.points,
        cad.openings,
        cad.activeFloorId,
      )
      if (isBlocked) return

      /*
       * Köşe var olan bir köşeye denk geliyorsa ONUN pointId'siyle bağlanır.
       * Konumla yazılsaydı aynı yerde ikinci bir Point doğar, bitişik iki oda
       * ekranda birleşik görünür ama grafta kopuk kalırdı — çevrim kapanmaz.
       *
       * Dört köşenin hepsine bakılıyor, yalnız sürüklenen ikisine değil: karşıt
       * köşelerden türeyen diğer ikisi de komşu odanın köşesine düşebilir.
       */
      const ends: WallEnd[] = corners.map((corner) => {
        const pointId = findCornerPointIdAt(corner, context, toleranceCm)
        return pointId === undefined ? { position: corner } : { pointId }
      })

      useCadStore.getState().addWallChain({ ends, isClosed: true })
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      // Sağ tık ve Esc sürüklemeyi iptal eder; store'a yazılmadığı için geri
      // alınacak bir şey de kalmaz.
      onContextMenu: endDrag,
      onCancel: endDrag,
    })

    return () => {
      unsubscribe()
      originRef.current = null
    }
  }, [camera, isActive, publish])

  // Araç kapalıyken state sıfırlanmaz, burada eleniyor: effect gövdesinde
  // setState çağırmak zincirleme render tetikler (useWallTool ile aynı desen).
  return isActive ? state : IDLE_STATE
}
