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
import { IsometricLayer } from '../isometric/scene/IsometricLayer'
import { ISOMETRIC_COLORS } from '../isometric/scene/isometricTheme'
import { ArchitectureGhost, InstallationGhost } from '../plumbing/scene/Ghosts'
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
  const isIsometric = activeViewId === 'isometric'

  return (
    // TEK <Canvas>: görünümler ikinci renderer/kamera kurmaz, alt ağaç değişir.
    <Canvas orthographic dpr={[1, 2]}>
      <color
        attach="background"
        args={[isIsometric ? ISOMETRIC_COLORS.background : SCENE_COLORS.background]}
      />
      {/* Kamera ve girdi aşağıdaki Suspense sınırının DIŞINDA: alt ağaç bir an
          askıya alınırsa makeDefault geri alınıp zoom/pan sıfırlanırdı.
          İzometrik ve katı model KENDİ kameralarını kurar (biri α/β'dan
          türetilen yön, öteki perspektif + yörünge) ve o da aynı sebeple bu
          sınırın dışında. Üç kamera asla birlikte mount edilmez — hepsi
          `makeDefault` yazar, hangisinin kazandığı mount sırasına kalırdı.
          Plan düzlemine kilitli pan/zoom, ızgara ve odak isteği de o iki
          görünümde anlamsız, hepsi plan dalının içinde. */}
      {/* Zoom izleyicisi HER görünümde: ekran boyu sabit kalan her şey (ölçü
          yazısı, izometrik etiketler) `useCameraZoom`'u okuyor ve o değer bu
          tek yoklayıcıdan geliyor. Yalnız plan dalında kalsaydı izometrik
          etiketler bayat zoom'la ölçeklenirdi. Kamera türü kontrolü
          izleyicinin kendi içinde. */}
      <CameraZoomTracker />
      {isIsometric && <IsometricLayer />}
      {isSolidView && <SolidModelView />}
      {!isIsometric && !isSolidView && (
        <>
          <Cameras />
          <ViewportControls />
          {/* Hata listesindeki "göster" de plan kamerasının sözleşmesine bağlı
              (`writeCameraViewport`): izometrikte mount edilseydi kamerayı bir
              anda plan konumuna atardı. */}
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
            {/* Alt katın boru izi YOK (K130): mimarideki FloorBelowGhost'un
                aksine burada hizalamaya yaramıyordu, aktif kattaki boruyla
                karışıyordu. */}
            <ArchitectureGhost />
            <PlumbingLayer />
          </>
        )}
      </Suspense>
    </Canvas>
  )
}
