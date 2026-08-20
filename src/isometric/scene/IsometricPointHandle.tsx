import { useEffect, useState } from 'react'

import { ISOMETRIC_COLORS } from './isometricTheme'
import type { PlanPoint, ThreePosition } from '../../core/coords'

/** Tutamaç EKRAN boyunda sabit: yarıçapı borunun çapından bağımsız okunmalı. */
const HANDLE_RADIUS_PX = 5
const HANDLE_SEGMENTS = 12

type DragStart = {
  clientX: number
  clientY: number
}

type IsometricPointHandleProps = {
  position: ThreePosition
  zoom: number
  /** Sürüklendikçe (canlı önizleme için); bırakılana kadar store'a yazılmaz. */
  onDrag: (deltaCm: PlanPoint) => void
  /** Bırakıldığında — tek geçmiş adımı burada açılır. */
  onDragEnd: (deltaCm: PlanPoint) => void
}

/**
 * İzometrikte bir boru köşesinin sürükleme tutamacı. Üst üste binen dalları
 * ayırmak için: tutamacı çekince o noktadan SONRAKİ tüm köşeler birlikte gelir
 * (`applyIsometricDrag`), plan çizimi hiç değişmez.
 *
 * Ekran pikseli → cm dönüşümü doğrudan zoom'la (zoom = piksel/cm), ışın testine
 * gerek yok; ekranın y'si AŞAĞI büyüdüğü için işaret ters. Hareket PENCEREDEN
 * dinleniyor: imleç tutamacın dışına çıkınca R3F olayları kesilir ve nokta
 * parmağın altında kalırdı (etiket sürüklemesiyle aynı çözüm).
 */
export function IsometricPointHandle({
  position,
  zoom,
  onDrag,
  onDragEnd,
}: IsometricPointHandleProps) {
  const [dragStart, setDragStart] = useState<DragStart | null>(null)

  useEffect(() => {
    if (!dragStart) return undefined

    const toDeltaCm = (event: PointerEvent): PlanPoint => ({
      x: (event.clientX - dragStart.clientX) / zoom,
      y: -(event.clientY - dragStart.clientY) / zoom,
    })

    const handleMove = (event: PointerEvent) => onDrag(toDeltaCm(event))
    const handleUp = (event: PointerEvent) => {
      const committed = toDeltaCm(event)
      setDragStart(null)
      onDragEnd(committed)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  }, [dragStart, onDrag, onDragEnd, zoom])

  return (
    <mesh
      position={position}
      scale={1 / zoom}
      onPointerDown={(event) => {
        // Durdurulmazsa altındaki boru da tıklanmış sayılır ve tutamacı tutmak
        // hattın vurgusunu kapatıp tutamaçları yok ederdi.
        event.stopPropagation()
        setDragStart({ clientX: event.clientX, clientY: event.clientY })
      }}
    >
      <sphereGeometry args={[HANDLE_RADIUS_PX, HANDLE_SEGMENTS, HANDLE_SEGMENTS]} />
      <meshBasicMaterial color={ISOMETRIC_COLORS.handle} depthTest={false} />
    </mesh>
  )
}
