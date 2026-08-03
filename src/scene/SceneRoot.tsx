import { Canvas } from '@react-three/fiber'

import { ArchitectureLayer } from './ArchitectureLayer'
import { Cameras } from './Cameras'
import { DrawSurface } from './DrawSurface'
import { Grid } from './Grid'
import { SCENE_COLORS } from './sceneTheme'
import { useViewportControls } from './useViewportControls'
import { ArchitectureGhost, InstallationGhost } from '../plumbing/scene/Ghosts'
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
      {/* Her görünüm KARŞI katmanı soluk gösterir. İkisi de burada, görünüm
          anahtarının yanında: hayalet çizen katmanın parçası değil, görünümün
          bağlamı — ve ikisi de aktif katı kendi okuyor. */}
      {activeViewId === 'architecture' && (
        <>
          <DrawSurface />
          <ArchitectureLayer />
          <InstallationGhost />
        </>
      )}
      {activeViewId === 'installation' && (
        <>
          <DrawSurface />
          <ArchitectureGhost />
          <PlumbingLayer />
        </>
      )}
    </Canvas>
  )
}
