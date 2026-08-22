import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import { findAreaObjectLabelAt } from './useAreaObjectLabelTool'
import type { PlanPoint } from '../core/coords'
import type { Id, PointSymbol } from '../core/model'
import {
  getPointSymbolLabelOffsetCm,
  pickPointSymbolLabelAt,
} from '../core/pointSymbolLabel'
import { getSymbolPose, getSymbolsOnFloor } from '../core/symbolPlacement'
import { ERASER_TOOL_ID, SELECTION_TOOL_ID } from '../core/tools'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const PRIMARY_BUTTON = 0

/** Etiketin üstündeyken "taşınabilir" olduğu imleçten anlaşılsın. */
const LABEL_CURSOR = 'grab'

/**
 * İmleç, bir mimari cihazın ad etiketinin üstünde mi?
 *
 * `findAreaObjectLabelAt` ile aynı sözleşme ve aynı gerekçe: etiket cihazın
 * ÇİZİMİNİN dışında duruyor, hedef çözümlemesi orayı "boşluk" sayardı ve
 * çerçeve seçimi başlardı. Diğer araç hook'ları bunu çağırıp doluysa jesti hiç
 * başlatmıyor (K44 dersi).
 */
export function findPointSymbolLabelAt(
  planPoint: PlanPoint,
  zoom: number,
): PointSymbol | undefined {
  const ui = useUiStore.getState()
  if (ui.activeToolId !== SELECTION_TOOL_ID) return undefined
  // GİZLİ etiket tutulmaz (K56): alan nesnesiyle ORTAK anahtar.
  if (!ui.isAreaObjectNamesVisible) return undefined

  const cad = useCadStore.getState()
  return pickPointSymbolLabelAt(
    planPoint,
    getSymbolsOnFloor(cad.symbols, cad.activeFloorId, cad.walls),
    (symbol) => getSymbolPose(symbol, cad.walls, cad.points),
    zoom,
  )
}

type LabelGrab = {
  symbolId: Id
  /** Basış anındaki etkin kayma; sürükleme buna göre ölçülür. */
  startOffsetCm: PlanPoint
  pointerOrigin: PlanPoint
}

/**
 * Cihaz ad etiketini sürükleme — `useAreaObjectLabelTool`'un aynısı, aynı
 * sözleşmeyle: canlı kayma `architectureUiStore`'da durur, bırakılınca TEK
 * `setPointSymbolLabelOffset` yazımı olur (tek markDirty, tek Ctrl+Z).
 *
 * Kayma ızgaraya YAKALANMAZ: etiket bir açıklama notudur, çizim geometrisi değil.
 *
 * ⚠️ Alan nesnesinin etiketi ÖNCELİKLİ: ikisi üst üste geldiğinde iki hook da
 * kendi jestini başlatır ve iki etiket birden taşınırdı. Sıra keyfî ama
 * belirli — kararın tek yerde olması yeterli.
 */
export function usePointSymbolLabelTool(): void {
  const camera = useThree((state) => state.camera)
  const domElement = useThree((state) => state.gl.domElement)

  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return undefined

    let grab: LabelGrab | undefined

    const readZoom = () => readCameraViewport(camera).zoom

    const findTarget = (planPoint: PlanPoint, zoom: number) =>
      findAreaObjectLabelAt(planPoint, zoom) ? undefined : findPointSymbolLabelAt(planPoint, zoom)

    const endDrag = () => {
      grab = undefined
      useArchitectureUiStore.getState().setDraggingPointSymbolLabel(null)
    }

    const setCursor = (isOverLabel: boolean) => {
      domElement.style.cursor = isOverLabel ? LABEL_CURSOR : ''
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerDown: (event: DrawSurfacePointerEvent) => {
        if (event.button !== PRIMARY_BUTTON) return
        // Silgi etikete DEĞMEZ: oradaki basış cihazı silmek içindir.
        if (useUiStore.getState().activeToolId === ERASER_TOOL_ID) return

        const zoom = readZoom()
        const target = findTarget(event.planPoint, zoom)
        if (!target) return

        const cad = useCadStore.getState()
        const pose = getSymbolPose(target, cad.walls, cad.points)
        if (!pose) return

        grab = {
          symbolId: target.id,
          startOffsetCm: getPointSymbolLabelOffsetCm(target, pose, zoom),
          pointerOrigin: event.planPoint,
        }
      },

      onPointerMove: (event: DrawSurfacePointerEvent) => {
        if (!grab) {
          setCursor(findTarget(event.planPoint, readZoom()) !== undefined)
          return
        }

        useArchitectureUiStore.getState().setDraggingPointSymbolLabel({
          symbolId: grab.symbolId,
          offsetCm: {
            x: grab.startOffsetCm.x + (event.planPoint.x - grab.pointerOrigin.x),
            y: grab.startOffsetCm.y + (event.planPoint.y - grab.pointerOrigin.y),
          },
        })
      },

      onPointerUp: (event: DrawSurfacePointerEvent) => {
        if (!grab || event.button !== PRIMARY_BUTTON) return

        const { symbolId } = grab
        const drag = useArchitectureUiStore.getState().draggingPointSymbolLabel
        endDrag()

        // Hiç sürüklenmediyse (yalnız etikete tıklama) store'a yazılmaz.
        if (!drag) return
        useCadStore.getState().setPointSymbolLabelOffset(symbolId, drag.offsetCm)
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
