import { Canvas } from '@react-three/fiber'

import { Cameras } from './Cameras'
import { Grid } from './Grid'
import { SCENE_COLORS } from './sceneTheme'
import { useViewportControls } from './useViewportControls'

/** Hook'lar <Canvas> içinde çalışmak zorunda; bu sarmalayıcı onun için var. */
function ViewportControls() {
  useViewportControls()
  return null
}

export function SceneRoot() {
  return (
    <Canvas orthographic dpr={[1, 2]}>
      <color attach="background" args={[SCENE_COLORS.background]} />
      <Cameras />
      <ViewportControls />
      <Grid />
    </Canvas>
  )
}
