import { Canvas } from '@react-three/fiber'

import { ArchitectureLayer } from './ArchitectureLayer'
import { Cameras } from './Cameras'
import { DrawSurface } from './DrawSurface'
import { Grid } from './Grid'
import { SCENE_COLORS } from './sceneTheme'
import { useViewportControls } from './useViewportControls'
import { PlumbingLayer } from '../plumbing/scene/PlumbingLayer'
import { useUiStore } from '../store/uiStore'

/** Hook'lar <Canvas> içinde çalışmak zorunda; bu sarmalayıcı onun için var. */
function ViewportControls() {
  useViewportControls()
  return null
}

export function SceneRoot() {
  const activeViewId = useUiStore((state) => state.activeViewId)

  return (
    // TEK <Canvas>: görünümler ikinci renderer/kamera kurmaz, alt ağaç değişir.
    <Canvas orthographic dpr={[1, 2]}>
      <color attach="background" args={[SCENE_COLORS.background]} />
      <Cameras />
      <ViewportControls />
      <Grid />
      {activeViewId === 'architecture' && (
        <>
          <DrawSurface />
          <ArchitectureLayer />
        </>
      )}
      {activeViewId === 'installation' && (
        <>
          <DrawSurface />
          <PlumbingLayer />
        </>
      )}
    </Canvas>
  )
}
