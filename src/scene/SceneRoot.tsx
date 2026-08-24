import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'

import { ArchitectureLayer } from './ArchitectureLayer'
import { Cameras } from './Cameras'
import { DrawSurface } from './DrawSurface'
import { FloorBelowGhost } from './FloorBelowGhost'
import { Grid } from './Grid'
import { ViewportFocus } from './ViewportFocus'
import { SCENE_COLORS } from './sceneTheme'
import { SolidModelView } from './solid/SolidModelView'
import { useCameraZoomTracker } from './useCameraZoom'
import { useViewportControls } from './useViewportControls'
import { ArchitectureGhost, InstallationGhost } from '../plumbing/scene/Ghosts'
import { InstallationBelowGhost } from '../plumbing/scene/InstallationBelowGhost'
import { PlumbingLayer } from '../plumbing/scene/PlumbingLayer'
import { useUiStore } from '../store/uiStore'

/** Hook'lar <Canvas> içinde çalışmak zorunda; bu sarmalayıcı onun için var. */
function ViewportControls() {
  useViewportControls()
  return null
}

/** Zoom'u kare başına tek kez yoklayan kaynak; aynı sebeple <Canvas> içinde. */
function CameraZoomTracker() {
  useCameraZoomTracker()
  return null
}

export function SceneRoot() {
  const activeViewId = useUiStore((state) => state.activeViewId)
  const isGridVisible = useUiStore((state) => state.isGridVisible)
  const isSolidView = activeViewId === 'solid'

  return (
    // TEK <Canvas>: görünümler ikinci renderer/kamera kurmaz, alt ağaç değişir.
    <Canvas orthographic dpr={[1, 2]}>
      <color attach="background" args={[SCENE_COLORS.background]} />
      {/* Katı model KENDİ kamerasını (perspektif + yörünge) getiriyor. Aşağıdaki
          ortografik kamerayla birlikte mount edilemez: ikisi de `makeDefault`
          ve hangisinin kazandığı mount sırasına kalırdı. Plan düzlemine kilitli
          pan/zoom, ızgara ve odak isteği de 3B'de anlamsız — hepsi bu dalın
          dışında. */}
      {isSolidView ? (
        <SolidModelView />
      ) : (
        <>
          {/* Kamera ve girdi aşağıdaki Suspense sınırının DIŞINDA: alt ağaç bir an
              askıya alınırsa makeDefault geri alınıp zoom/pan sıfırlanırdı. */}
          <Cameras />
          <ViewportControls />
          <CameraZoomTracker />
          <ViewportFocus />
          {isGridVisible && <Grid />}
        </>
      )}
      {/* Askıya alan her şey (drei <Text> → troika'nın font indirmesi) BU sınırın
          altında kalmak zorunda. Kaçarsa R3F'in <Canvas> içindeki kendi sınırı
          devreye girip <Canvas>'ın kendisini fırlatır; router'daki tek Suspense
          editörü gizler, React gizlenen ağacın effect'lerini söker ve R3F'in
          500 ms gecikmeli teardown'ı o sırada YAŞAYAN renderer'ın WebGL
          context'ini düşürür ("THREE.WebGLRenderer: Context Lost"). */}
      <Suspense fallback={null}>
        {/* Her görünüm KARŞI katmanı soluk gösterir. İkisi de burada, görünüm
            anahtarının yanında: hayalet çizen katmanın parçası değil, görünümün
            bağlamı — ve ikisi de aktif katı kendi okuyor. */}
        {activeViewId === 'architecture' && (
          <>
            <DrawSurface />
            {/* Alt kat en geride: hizalama referansı, aktif katın çizimini örtmez. */}
            <FloorBelowGhost />
            <ArchitectureLayer />
            <InstallationGhost />
          </>
        )}
        {activeViewId === 'installation' && (
          <>
            <DrawSurface />
            {/* Alt kat en geride: hizalama referansı, aktif katın çizimini örtmez
                (FloorBelowGhost ile aynı sıra kuralı). */}
            <InstallationBelowGhost />
            <ArchitectureGhost />
            <PlumbingLayer />
          </>
        )}
      </Suspense>
    </Canvas>
  )
}
