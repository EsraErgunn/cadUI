import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useState } from 'react'

import { HANDLE_ELEVATION_CM, RENDER_ORDER } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import type { MirrorAxisToolState } from './useMirrorAxisTool'
import { planToThree, type PlanPoint } from '../core/coords'
import { snapAngleDeg } from '../core/transform'
import { getSegmentAngleDeg, getSegmentLength } from '../core/wall'
import { useArchitectureUiStore } from '../store/architectureUiStore'

/** Ölçüm çizgisiyle aynı incelik ve kesik deseni: altındaki çizimi örtmesin. */
const LINE_WIDTH_PX = 1.6
const DASH_SIZE_CM = 10
const DASH_GAP_CM = 6

/**
 * Eksen, tıklanan iki noktanın ÖTESİNE de uzatılarak çiziliyor: ayna bir doğru,
 * kullanıcının çizdiği parça yalnız onu tarif ediyor. Uzatma olmadan "şu kısa
 * çizgiye göre mi aynalanacak?" sorusu doğuyordu.
 */
const EXTENSION_RATIO = 4

/** Eksen ışın hedefi değildir; altındaki duvar seçilebilir kalmalı. */
const NO_RAYCAST = () => null

function getAxisEnds(start: PlanPoint, cursor: PlanPoint, isFreeAngle: boolean) {
  const lengthCm = getSegmentLength(start, cursor)
  if (lengthCm === 0) return undefined

  const angleDeg = isFreeAngle
    ? getSegmentAngleDeg(start, cursor)
    : snapAngleDeg(getSegmentAngleDeg(start, cursor))
  const radians = (angleDeg * Math.PI) / 180
  const reachCm = lengthCm * EXTENSION_RATIO
  const direction = { x: Math.cos(radians), y: Math.sin(radians) }

  return {
    from: { x: start.x - direction.x * reachCm, y: start.y - direction.y * reachCm },
    to: { x: start.x + direction.x * reachCm, y: start.y + direction.y * reachCm },
  }
}

/**
 * Çizilmekte olan aynalama ekseni. `useFrame` ile her karede okunuyor: imleç
 * ref'te duruyor (`MeasurementOverlay` ile aynı gerekçe), her fare hareketi
 * React render'ı tetiklemesin.
 *
 * ⚠️ Açı yakalaması BURADA da uygulanıyor, yoksa ekranda görülen eksen ile
 * uygulanan eksen ayrışırdı — hesap tek yerde olsun diye ikisi de
 * `snapAngleDeg`den geçiyor.
 */
export function MirrorAxisOverlay({ isActive, cursorRef }: MirrorAxisToolState) {
  const start = useArchitectureUiStore((state) => state.mirrorAxisStart)
  const [ends, setEnds] = useState<{ from: PlanPoint; to: PlanPoint } | undefined>(undefined)

  useFrame(() => {
    if (!isActive || !start || !cursorRef.current) {
      setEnds((current) => (current === undefined ? current : undefined))
      return
    }

    const next = getAxisEnds(start, cursorRef.current, false)
    setEnds((current) =>
      current &&
      next &&
      current.from.x === next.from.x &&
      current.from.y === next.from.y &&
      current.to.x === next.to.x &&
      current.to.y === next.to.y
        ? current
        : next,
    )
  })

  if (!isActive || !ends) return null

  return (
    <Line
      points={[
        planToThree(ends.from, HANDLE_ELEVATION_CM),
        planToThree(ends.to, HANDLE_ELEVATION_CM),
      ]}
      color={SCENE_COLORS.selection}
      lineWidth={LINE_WIDTH_PX}
      dashed
      dashSize={DASH_SIZE_CM}
      gapSize={DASH_GAP_CM}
      frustumCulled={false}
      renderOrder={RENDER_ORDER.handle}
      depthWrite={false}
      toneMapped={false}
      raycast={NO_RAYCAST}
    />
  )
}
