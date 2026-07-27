import type { OrthographicCamera } from 'three'

import { CAMERA_HEIGHT_CM } from './Cameras'
import { planToThree, threeToPlan } from '../core/coords'
import type { ViewportSize, ViewportState } from '../core/viewport'


/**
 * Zoom/pan store'da DEĞİL kamerada yaşar: tekerlek/sürükleme her karede store'a
 * yazsaydı tüm ağaç 60 fps yeniden render olurdu. Bu iki fonksiyon, core'daki saf
 * ViewportState ile three kamerası arasındaki tek köprüdür.
 */
export function readCameraViewport(camera: OrthographicCamera): ViewportState {
  const plan = threeToPlan([camera.position.x, camera.position.y, camera.position.z])
  return { centerXCm: plan.x, centerYCm: plan.y, zoom: camera.zoom }
}

export function writeCameraViewport(camera: OrthographicCamera, view: ViewportState): void {
  const [x, y, z] = planToThree(
    { x: view.centerXCm, y: view.centerYCm },
    CAMERA_HEIGHT_CM,
  )
  camera.position.set(x, y, z)
  camera.zoom = view.zoom
  camera.updateProjectionMatrix()
}

export function readViewportSize(element: HTMLElement): ViewportSize {
  const rect = element.getBoundingClientRect()
  return { widthPx: rect.width, heightPx: rect.height }
}
