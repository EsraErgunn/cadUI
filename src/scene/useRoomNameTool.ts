import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import type { PlanPoint } from '../core/coords'
import { findRoomFaceAt, findRoomFaces } from '../core/room'
import { getWallSetKey } from '../core/roomIdentity'
import { getRoomLabelAnchor, isPointInRoomLabel } from '../core/roomLabel'
import { getSnapToleranceCm } from '../core/snap'
import { SELECTION_TOOL_ID } from '../core/tools'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const PRIMARY_BUTTON = 0

/** İki basış bu süre içinde gelirse çift tık sayılır. Tarayıcı varsayılanıyla aynı mertebe. */
const DOUBLE_CLICK_WINDOW_MS = 400

/**
 * Odanın adını çift tıkla düzenleme.
 *
 * Çift tık, ortak jest veri yolundaki `onPointerDown` akışından TÜRETİLİYOR;
 * veri yolu yalnız ham pointer olayı taşıyor ve oraya `onDoubleClick` eklemek
 * başkasının dosyasına yazmak olurdu. Ölçüt süre + mesafe: fare biraz kaysa
 * bile aynı yerde kabul edilsin diye eşik zoom'a bağlı snap toleransı.
 *
 * Araç mantığı DrawSurface'e YAZILMAZ (kural 7) — bu yüzden kendi hook'unda.
 */
export function useRoomNameTool(): void {
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return undefined

    let lastPressAtMs = 0
    let lastPressPoint: PlanPoint | undefined

    const isSecondPressOfDoubleClick = (point: PlanPoint, toleranceCm: number): boolean => {
      const now = performance.now()
      const isDouble =
        lastPressPoint !== undefined &&
        now - lastPressAtMs < DOUBLE_CLICK_WINDOW_MS &&
        Math.hypot(point.x - lastPressPoint.x, point.y - lastPressPoint.y) <= toleranceCm

      // Üçüncü tık yeni bir çiftin ilki sayılsın diye sayaç her durumda tazelenir.
      lastPressAtMs = now
      lastPressPoint = point

      return isDouble
    }

    const closeEditor = () => {
      if (useArchitectureUiStore.getState().editingRoomId !== null) {
        useArchitectureUiStore.getState().setEditingRoom(null)
      }
    }

    const handlePointerDown = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return

      const toleranceCm = getSnapToleranceCm(readCameraViewport(camera).zoom)
      if (!isSecondPressOfDoubleClick(event.planPoint, toleranceCm)) {
        // Tek tık kutunun dışına düşmüş demektir (kutunun kendi tıkı canvas'a
        // hiç gelmiyor, DOM katmanında yutuluyor).
        closeEditor()
        return
      }

      // Araç kontrolü çift tık DOĞRULANDIKTAN sonra: duvar çizerken de iki hızlı
      // tık atılıyor, ama o zaman düzenleme açılmamalı.
      if (useUiStore.getState().activeToolId !== SELECTION_TOOL_ID) return

      const cad = useCadStore.getState()
      const faces = findRoomFaces(cad.walls, cad.points, cad.activeFloorId)
      const face = findRoomFaceAt(faces, event.planPoint)
      if (!face) {
        useArchitectureUiStore.getState().setEditingRoom(null)
        return
      }

      const wallSetKey = getWallSetKey(face.wallIds)
      const room = cad.rooms.find((candidate) => getWallSetKey(candidate.wallIds) === wallSetKey)
      useArchitectureUiStore.getState().setEditingRoom(room?.id ?? null)
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerDown: handlePointerDown,
      onCancel: closeEditor,
    })

    return () => {
      unsubscribe()
      closeEditor()
    }
  }, [camera])
}

/**
 * İmleç bir oda ad rozetinin üstünde mi?
 *
 * ⚠️ Öncelik zincirine kaydedilmesi ŞART: rozet tuvalde serbest duran bir hedef
 * ve `resolveArchitectureTarget` onu tanımıyor. Kaydedilmediği sürece üstündeki
 * basış "boşluk" sayılıyor ve çerçeve (marquee) seçimi başlıyordu — kullanıcı
 * adı çift tıklamak isterken, özellikle rozetin KENARLARINDA, çizikli seçim
 * dikdörtgeni açılıyordu. Alan nesnesi ad etiketi ve metin de aynı sebeple
 * zincire eklenmişti (K44'ün tekrar eden dersi).
 *
 * Yalnız rozet GÖRÜNÜRKEN sahiplenir: `isRoomNamesVisible` kapalıyken ortada
 * tıklanacak bir şey yok ve görünmeyen bir kutu jesti yutmamalı — aynı kural
 * `findAreaObjectLabelAt`ta da var.
 */
export function findRoomLabelAt(point: PlanPoint): boolean {
  if (!useUiStore.getState().isRoomNamesVisible) return false

  const cad = useCadStore.getState()
  const faces = findRoomFaces(cad.walls, cad.points, cad.activeFloorId)

  for (const face of faces) {
    const wallSetKey = getWallSetKey(face.wallIds)
    const room = cad.rooms.find((candidate) => getWallSetKey(candidate.wallIds) === wallSetKey)
    if (!room) continue

    if (isPointInRoomLabel(point, getRoomLabelAnchor(face.corners), room.name)) return true
  }

  return false
}
