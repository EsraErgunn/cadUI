import { Line } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useState } from 'react'
import { OrthographicCamera } from 'three'


import { readCameraViewport } from './cameraViewport'
import { buildGridLinePoints, padBoundsToStep, toPositionArray } from './gridGeometry'
import { GRID_ELEVATION_CM, RENDER_ORDER } from './layers'
import { SCENE_COLORS } from './sceneTheme'
import { pickGridLevel, type GridLevel } from '../core/grid'
import { getVisibleBounds, type PlanBounds } from '../core/viewport'

const MAJOR_LINE_WIDTH = 1.6

type GridSpec = {
  level: GridLevel
  bounds: PlanBounds
}

function isSameSpec(current: GridSpec | null, next: GridSpec): boolean {
  return (
    current !== null &&
    current.level.minorCm === next.level.minorCm &&
    current.bounds.minXCm === next.bounds.minXCm &&
    current.bounds.minYCm === next.bounds.minYCm &&
    current.bounds.maxXCm === next.bounds.maxXCm &&
    current.bounds.maxYCm === next.bounds.maxYCm
  )
}

export function Grid() {
  const [spec, setSpec] = useState<GridSpec | null>(null)

  // Zoom/pan kamerada yaşadığı için değişimi burada yokluyoruz. Aynı çizgi kümesi
  // çıktığında setState aynı nesneyi döndürür ve React yeniden render etmez.
  useFrame(({ camera, size }) => {
    if (!(camera instanceof OrthographicCamera)) return
    const view = readCameraViewport(camera)
    const level = pickGridLevel(view.zoom)
    // size R3F'in ResizeObserver'ından geliyor. Burada getBoundingClientRect()
    // çağırmak her karede zorunlu yeniden yerleşim (reflow) tetiklerdi.
    const bounds = padBoundsToStep(
      getVisibleBounds(view, { widthPx: size.width, heightPx: size.height }),
      level.majorCm,
    )
    setSpec((current) => (isSameSpec(current, { level, bounds }) ? current : { level, bounds }))
  })

  if (spec === null) return null

  const minorPositions = toPositionArray(
    buildGridLinePoints(spec.bounds, spec.level.minorCm, GRID_ELEVATION_CM, spec.level.majorCm),
  )
  const majorPoints = buildGridLinePoints(
    spec.bounds,
    spec.level.majorCm,
    GRID_ELEVATION_CM,
    null,
  )

  return (
    <>
      {/* Izgara görünür alana göre üretiliyor; culling kapalı olmalı yoksa
          sınırlarda kaybolur. */}
      <lineSegments frustumCulled={false} renderOrder={RENDER_ORDER.gridMinor}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[minorPositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial color={SCENE_COLORS.gridMinor} depthWrite={false} toneMapped={false} />
      </lineSegments>

      {/* Kalın çizgi: three'nin düz Line'ında linewidth çalışmaz, drei <Line> gerekir. */}
      <Line
        segments
        points={majorPoints}
        color={SCENE_COLORS.gridMajor}
        lineWidth={MAJOR_LINE_WIDTH}
        frustumCulled={false}
        renderOrder={RENDER_ORDER.gridMajor}
        depthWrite={false}
        toneMapped={false}
      />
    </>
  )
}
