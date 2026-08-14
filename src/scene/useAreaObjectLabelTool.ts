import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import {
  getAreaObjectLabelOffsetCm,
  pickAreaObjectLabelAt,
} from '../core/areaObjectLabel'
import type { PlanPoint } from '../core/coords'
import type { AreaObject, Id } from '../core/model'
import { ERASER_TOOL_ID, SELECTION_TOOL_ID } from '../core/tools'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const PRIMARY_BUTTON = 0

/** Etiketin üstündeyken "taşınabilir" olduğu imleçten anlaşılsın. */
const LABEL_CURSOR = 'grab'

/**
 * İmleç, bir alan nesnesinin ad etiketinin üstünde mi?
 *
 * Etiket nesnenin GÖVDESİNİN DIŞINDA duruyor (kutunun üstünde, üstelik kullanıcı
 * onu istediği yere sürükleyebiliyor), dolayısıyla hedef çözümlemesi orayı
 * "boşluk" sayıyor ve çerçeve seçimi başlıyordu. Diğer araç hook'ları bunu
 * çağırıp doluysa jesti hiç başlatmıyor — alan nesnesi tutamaçlarındaki K44
 * dersinin aynısı.
 *
 * Yalnız Seçim Aracı'nda: silgiyle etiket tutulursa kullanıcı silmek isterken
 * etiketi taşır.
 */
export function findAreaObjectLabelAt(
  planPoint: PlanPoint,
  zoom: number,
): AreaObject | undefined {
  const ui = useUiStore.getState()
  if (ui.activeToolId !== SELECTION_TOOL_ID) return undefined
  // GİZLİ etiket tutulmaz (K56): görünmeyen bir şeyi sürüklemek, kullanıcıya
  // "boşluğa bastım ama seçim olmadı" hissi verirdi.
  if (!ui.isAreaObjectNamesVisible) return undefined

  const cad = useCadStore.getState()
  return pickAreaObjectLabelAt(planPoint, cad.areaObjects, cad.activeFloorId, zoom)
}

type LabelGrab = {
  areaObjectId: Id
  /** Basış anındaki etkin kayma; sürükleme buna göre ölçülür. */
  startOffsetCm: PlanPoint
  pointerOrigin: PlanPoint
}

/**
 * Ad etiketini sürükleme. Canlı kayma `architectureUiStore.draggingAreaObjectLabel`'da
 * durur, bırakılınca TEK `setAreaObjectLabelOffset` yazımı olur (tek markDirty,
 * tek Ctrl+Z) — tesisattaki etiket sürüklemesiyle aynı sözleşme.
 *
 * Kayma ızgaraya YAKALANMAZ: etiket bir açıklama notudur, çizim geometrisi değil.
 */
export function useAreaObjectLabelTool(): void {
  const camera = useThree((state) => state.camera)
  const domElement = useThree((state) => state.gl.domElement)

  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return undefined

    let grab: LabelGrab | undefined

    const readZoom = () => readCameraViewport(camera).zoom

    const endDrag = () => {
      grab = undefined
      useArchitectureUiStore.getState().setDraggingAreaObjectLabel(null)
    }

    const setCursor = (isOverLabel: boolean) => {
      domElement.style.cursor = isOverLabel ? LABEL_CURSOR : ''
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerDown: (event: DrawSurfacePointerEvent) => {
        if (event.button !== PRIMARY_BUTTON) return
        // Silgi etikete DEĞMEZ: oradaki basış nesneyi silmek içindir.
        if (useUiStore.getState().activeToolId === ERASER_TOOL_ID) return

        const zoom = readZoom()
        const target = findAreaObjectLabelAt(event.planPoint, zoom)
        if (!target) return

        grab = {
          areaObjectId: target.id,
          startOffsetCm: getAreaObjectLabelOffsetCm(target, zoom),
          pointerOrigin: event.planPoint,
        }
      },

      onPointerMove: (event: DrawSurfacePointerEvent) => {
        if (!grab) {
          setCursor(findAreaObjectLabelAt(event.planPoint, readZoom()) !== undefined)
          return
        }

        useArchitectureUiStore.getState().setDraggingAreaObjectLabel({
          areaObjectId: grab.areaObjectId,
          offsetCm: {
            x: grab.startOffsetCm.x + (event.planPoint.x - grab.pointerOrigin.x),
            y: grab.startOffsetCm.y + (event.planPoint.y - grab.pointerOrigin.y),
          },
        })
      },

      onPointerUp: (event: DrawSurfacePointerEvent) => {
        if (!grab || event.button !== PRIMARY_BUTTON) return

        const { areaObjectId } = grab
        const drag = useArchitectureUiStore.getState().draggingAreaObjectLabel
        endDrag()

        // Hiç sürüklenmediyse (yalnız etikete tıklama) store'a yazılmaz.
        if (!drag) return
        useCadStore.getState().setAreaObjectLabelOffset(areaObjectId, drag.offsetCm)
      },

      // Esc sürüklemeyi iptal eder: etiket eski yerinde kalır, store'a yazılmadı.
      onCancel: () => {
        endDrag()
        setCursor(false)
      },
    })

    return () => {
      unsubscribe()
      endDrag()
      // İmleç biçimi elle yazıldığı için elle geri alınmalı.
      setCursor(false)
    }
  }, [camera, domElement])
}
