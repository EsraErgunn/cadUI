import { useThree } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface } from './drawSurfaceEvents'
import type { PlanPoint } from '../core/coords'
import {
  appendStrokePoint,
  isStrokeHit,
  isStrokeWorthKeeping,
} from '../core/sketchStroke'
import { getSnapToleranceCm } from '../core/snap'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const PRIMARY_BUTTON = 0
const FREE_DRAW_TOOL_ID = 'freeDraw'
const ERASER_TOOL_ID = 'eraser'

/**
 * Kimlik sayacı. `takeNextId` KULLANILMIYOR: o sayaç projeye kaydediliyor
 * (kural 6) ve serbest çizim kaydedilmiyor — oradan id almak, kaydedilmeyen bir
 * nota harcanan boşluklar yüzünden proje sayacını sessizce ileri iterdi.
 */
let nextStrokeId = 1

/**
 * Serbest çizim: kalemi basılı tutarken çizgi bırakır (K163).
 *
 * ⚠️ Çizgiler PROJEYE KAYDEDİLMEZ (kullanıcı kararı) — `uiStore`'da duruyorlar.
 * İki sonucu var ve ikisi de bilinçli: sayfa yenilenince kaybolurlar, ve Ctrl+Z
 * onlara DOKUNMAZ (geri alma çizim geçmişini yönetiyor). Silmenin yolu SİLGİ.
 *
 * ⚠️ Silgi aynı hook'ta: bugün yalnız açıklık siliyor (`useOpeningTool`) ve
 * oraya yazmak başkasının dosyasına yazmak olurdu (CLAUDE.md sahiplik). İki
 * hook aynı yayına abone — kod tabanında zaten olan bir desen.
 *
 * ⚠️ Yakalama YOK: serbest çizim serbest olmalı. Izgaraya ya da duvara yapışan
 * bir kalem, "elle not al" işini yapamazdı.
 */
export function useFreehandTool(): PlanPoint[] | undefined {
  const camera = useThree((state) => state.camera)
  const activeToolId = useUiStore((state) => state.activeToolId)
  const [draft, setDraft] = useState<PlanPoint[] | undefined>(undefined)

  const isDrawing = activeToolId === FREE_DRAW_TOOL_ID
  const isErasing = activeToolId === ERASER_TOOL_ID

  useEffect(() => {
    if (!isDrawing && !isErasing) return undefined
    if (!(camera instanceof OrthographicCamera)) return undefined

    let points: PlanPoint[] | undefined
    // Silginin basılı olup olmadığını KENDİMİZ izliyoruz: yayınlanan olay ham
    // `buttons` alanını taşımıyor, yalnız `button`.
    let isEraserHeld = false

    const finish = () => {
      if (points && isStrokeWorthKeeping(points)) {
        nextStrokeId += 1
        useUiStore.getState().addSketchStroke({
          id: nextStrokeId,
          // Kat OLAY ANINDA okunuyor: kullanıcı çizerken kat değiştirmiyor ama
          // effect'e bağımlılık eklemek her kat geçişinde aboneliği söktürürdü.
          floorId: useCadStore.getState().activeFloorId,
          points,
        })
      }
      points = undefined
      setDraft(undefined)
    }

    const eraseAt = (planPoint: PlanPoint) => {
      const { sketchStrokes } = useUiStore.getState()
      const floorId = useCadStore.getState().activeFloorId
      const toleranceCm = getSnapToleranceCm(readCameraViewport(camera).zoom)
      // Sondan başa: üst üste binmiş çizgilerde EN SON çizilen silinir.
      const hit = [...sketchStrokes]
        .reverse()
        .find(
          (stroke) =>
            stroke.floorId === floorId && isStrokeHit(stroke.points, planPoint, toleranceCm),
        )
      if (hit) useUiStore.getState().removeSketchStroke(hit.id)
    }

    return subscribeDrawSurface({
      onPointerDown: (event) => {
        if (event.button !== PRIMARY_BUTTON) return
        if (isErasing) {
          isEraserHeld = true
          eraseAt(event.planPoint)
          return
        }
        points = [event.planPoint]
        setDraft(points)
      },
      onPointerMove: (event) => {
        // Silgi de SÜRÜKLENİR: basılı tutup gezdirmek birden çok çizgiyi siler,
        // tek tek tıklamak gerekmesin.
        if (isErasing) {
          if (isEraserHeld) eraseAt(event.planPoint)
          return
        }
        if (!points) return

        const next = appendStrokePoint(points, event.planPoint)
        // Seyreltme aynı diziyi döndürdüyse hiçbir şey değişmedi: yeniden
        // çizdirme.
        if (next === points) return
        points = [...next]
        setDraft(points)
      },
      onPointerUp: () => {
        if (isErasing) {
          isEraserHeld = false
          return
        }
        finish()
      },
      // Esc yarım darbeyi ATAR: store'a hiç yazılmadığı için iz kalmıyor.
      onCancel: () => {
        isEraserHeld = false
        points = undefined
        setDraft(undefined)
      },
    })
  }, [camera, isDrawing, isErasing])

  return draft
}
