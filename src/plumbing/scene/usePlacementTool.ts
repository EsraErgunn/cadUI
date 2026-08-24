import { useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { OrthographicCamera } from 'three'

import {
  resolvePlacement,
  type ResolvedPlacement,
  type StubPreview,
} from './placementResolution'
import { startPipeFromElement } from './startPipeAfterPlacement'
import type { PlanPoint } from '../../core/coords'
import { readCameraViewport } from '../../scene/cameraViewport'
import { subscribeDrawSurface } from '../../scene/drawSurfaceEvents'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'
import { getElementAttachMode, getPlacementPreviewTypes } from '../core/attachModes'
import type { ElementPlacement } from '../core/elementAttach'
import { getPlacementElementType } from '../core/installationTools'
import type { InstallationElementType } from '../core/symbolMetadata'
import { usePlumbingUiStore } from '../store/plumbingUiStore'

const LEFT_BUTTON = 0

/** Araç kapalıyken paylaşılan boş dizi: her render'da yeni referans üretilmesin. */
const NO_PREVIEW_TYPES: readonly InstallationElementType[] = []

export type PlacementPreviewState = {
  /** Yerleştirme aracı kapalıysa null — önizleme de çizilmez. */
  elementType: InstallationElementType | null
  /** Önizlemede çizilecek semboller; araç seçilince SABİTTİR (ana eleman + refakatçileri). */
  previewTypes: readonly InstallationElementType[]
  /**
   * `previewTypes` ile AYNI sıradaki çözülmüş yerleşim. null = geçerli hedef yok
   * (boruya yapışan eleman boru üstünde değil) → önizleme gizlenir ve tıklama da
   * bir şey koymaz. useFrame okur; her pointermove React render'ı tetiklemesin.
   */
  placementsRef: RefObject<readonly ElementPlacement[] | null>
  /** Cihazı boruya bağlayan kolun önizlemesi; kol yoksa null. */
  stubRef: RefObject<StubPreview | null>
}

/**
 * Eleman yerleştirme aracı. DrawSurface yalnız ham pointer olayı yayınlar; araç
 * mantığı CLAUDE.md kural 7 gereği burada durur.
 *
 * Elemanın nereye tutunacağı türden gelir (`core/attachModes.ts`): armatür boruya
 * oturur, sayaç boş bir uca takılır, yakıcı cihaz en yakın boruya kısa bir kolla
 * bağlanır, servis kutusu/baca serbest bırakılır. Geometrinin tamamı saf
 * `core/elementAttach.ts`'te; burada yalnız olay ve store çağrısı var.
 *
 * Yerleştirme pointerUP'ta yapılır. Böylece iki giriş yolu TEK kod yolu olur:
 * tuvale tıklama (down+up) ve palet butonundan sürükleyip tuvale bırakma
 * (down butonda, up tuvalde) — aynı jest iki kez eleman eklemez.
 */
export function usePlacementTool(): PlacementPreviewState {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const camera = useThree((state) => state.camera)
  const placementsRef = useRef<readonly ElementPlacement[] | null>(null)
  const stubRef = useRef<StubPreview | null>(null)
  const elementType = getPlacementElementType(activeToolId)
  const previewTypes = useMemo(
    () => (elementType ? getPlacementPreviewTypes(elementType) : NO_PREVIEW_TYPES),
    [elementType],
  )

  useEffect(() => {
    if (!elementType || !(camera instanceof OrthographicCamera)) return undefined

    const mode = getElementAttachMode(elementType)

    const resolve = (planPoint: PlanPoint): ResolvedPlacement | null =>
      resolvePlacement(elementType, mode, planPoint, readCameraViewport(camera).zoom)

    const write = (resolved: ResolvedPlacement | null) => {
      placementsRef.current = resolved?.placements ?? null
      stubRef.current = resolved?.mode === 'nearestLine' ? resolved.stub : null
    }

    const apply = (resolved: ResolvedPlacement) => {
      const cad = useCadStore.getState()

      if (resolved.mode === 'free') {
        const elementId = cad.addElement({
          type: elementType,
          position: resolved.placements[0].position,
        })
        // Servis kutusu konunca boru çizimi de sayaç gibi kendiliğinden başlar
        // (2026-08 ürün isteği): ilk boru zaten kutuyu kendi koyduğu için
        // kullanıcı burada elle koyduğunda da aynı akışı bulmalı. Baca/
        // havalandırma bu davranışın DIŞINDA — onlar cihazın deşarj portundan
        // ayrı bir güzergah aracıyla çizilir, bu akıştan geçmez.
        if (elementType === 'serviceBox') startPipeFromElement(elementId)
        return
      }
      if (resolved.mode === 'onLine') {
        cad.placeOnLineElements(resolved.attachment)
        return
      }
      if (resolved.mode === 'verticalArm') {
        startPipeFromElement(
          cad.placeElementAtVerticalArm(
            resolved.attachment,
            usePlumbingUiStore.getState().activePipeTypeName,
          ),
        )
        return
      }
      if (resolved.mode === 'verticalEnd') {
        cad.placeElementAtVerticalEnd(resolved.attachment)
        return
      }
      if (resolved.mode === 'nearestLine') {
        cad.placeElementWithStub(
          resolved.attachment,
          usePlumbingUiStore.getState().activePipeTypeName,
        )
        return
      }
      startPipeFromElement(cad.placeElementAtLineEnd(resolved.attachment))
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerMove: (event) => {
        write(resolve(event.planPoint))
      },

      onPointerUp: (event) => {
        if (event.button !== LEFT_BUTTON) return

        // Konum pointermove'a bırakılmaz: dokunmatikte tıklamadan önce hareket gelmez.
        const resolved = resolve(event.planPoint)
        write(resolved)
        // Geçerli hedef yoksa hiçbir şey konmaz — "boru üstünde değilken önizleme
        // yok" kuralının veri tarafındaki karşılığı.
        if (resolved) apply(resolved)
      },

      onCancel: () => {
        write(null)
      },
    })

    return () => {
      unsubscribe()
      // Araç değişince önizleme son konumunda asılı kalmasın.
      write(null)
    }
  }, [camera, elementType])

  return { elementType, previewTypes, placementsRef, stubRef }
}
