import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import { MIN_AREA_OBJECT_SIZE_CM, type AreaObjectShape } from '../core/areaObject'
import {
  findAreaObjectHandleAt,
  getAreaObjectAngleFromPointer,
  resizeAreaObjectFromCorner,
  type AreaObjectHandleKind,
} from '../core/areaObjectHandles'
import { hasAreaObjectWallSnap, snapPointToWallFace } from '../core/areaObjectWallSnap'
import type { PlanPoint } from '../core/coords'
import type { AreaObject, Id } from '../core/model'
import { getPlacementPosition } from '../core/placement'
import { getSoleSelectedId } from '../core/selection'
import { getSnapToleranceCm } from '../core/snap'
import { SELECTION_TOOL_ID } from '../core/tools'
import { normalizeAngleDeg, snapAngleDeg } from '../core/transform'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const PRIMARY_BUTTON = 0

/**
 * Boyutlandırmada sürüklenen köşenin gideceği nokta: önce DUVAR YÜZÜ, olmazsa
 * ızgara (K139, yerleştirme/taşımayla aynı öncelik).
 *
 * Köşe yüze oturunca nesnenin KENARI da oraya oturuyor — kullanıcı kolonu
 * duvarın üstünde büyütürken kenarı duvarla hizalı kalsın diye istedi.
 */
function snapResizeTarget(type: AreaObject['type'], target: PlanPoint, zoom: number): PlanPoint {
  if (hasAreaObjectWallSnap(type)) {
    const cad = useCadStore.getState()
    const snapped = snapPointToWallFace(
      target,
      cad.walls.filter((wall) => wall.floorId === cad.activeFloorId),
      cad.points,
      getSnapToleranceCm(zoom),
    )
    if (snapped) return snapped
  }

  return getPlacementPosition(target, zoom)
}

/**
 * Tutamaç başına imleç biçimi. Döndürme için standart bir imleç yok; `grab`
 * "tut ve çevir"i en yakın anlatan yerleşik biçim. İki boyutlandırma tutamacı
 * da AYNI köşegen üzerinde (sol-üst ↔ sağ-alt), bu yüzden ikisi de `nwse`.
 */
const HANDLE_CURSORS: Record<AreaObjectHandleKind, string> = {
  rotate: 'grab',
  resizeBottomRight: 'nwse-resize',
  resizeTopLeft: 'nwse-resize',
}

/**
 * İmleç, TEK seçili alan nesnesinin tutamaçlarından birinin üstünde mi?
 *
 * Tutma alanı EKRAN pikselinde (`HANDLE_HIT_PX`), bu yüzden `zoom` geçilir —
 * dünya toleransı değil. Diğer araç hook'ları da bunu çağırır ve doluysa jesti
 * hiç başlatmaz: tutamaçlar gövdenin DIŞINA taştığı için o basış onlara
 * "boşluk" ya da "duvar" gibi görünüyor (K44).
 *
 * Tutamaçlar YALNIZ Seçim Aracı'nda ve TEK nesne seçiliyken var: çoklu seçimde
 * hangi nesnenin boyutlandırılacağı belirsiz olurdu.
 */
export function findSelectedAreaObjectHandle(
  planPoint: PlanPoint,
  zoom: number,
): { areaObject: AreaObject; kind: AreaObjectHandleKind } | undefined {
  if (useUiStore.getState().activeToolId !== SELECTION_TOOL_ID) return undefined

  const selection = useArchitectureUiStore.getState().selection
  const areaObjectId = getSoleSelectedId(selection, 'area')
  if (areaObjectId === undefined) return undefined

  const cad = useCadStore.getState()
  const areaObject = cad.areaObjects.find((candidate) => candidate.id === areaObjectId)
  if (!areaObject || areaObject.floorId !== cad.activeFloorId) return undefined

  const kind = findAreaObjectHandleAt(planPoint, areaObject.type, areaObject, zoom)
  return kind ? { areaObject, kind } : undefined
}

type HandleGrab = {
  areaObjectId: Id
  kind: AreaObjectHandleKind
  /** Basış anındaki şekil: her karede BUNDAN hesaplanır, birikmeli hata olmasın. */
  origin: AreaObjectShape
  type: AreaObject['type']
}

/**
 * Alan nesnesinin tutamaçlarıyla boyutlandırma ve döndürme (K44/K45).
 *
 * Sürükleme boyunca cadStore'a YAZILMAZ; önizleme `architectureUiStore`'da
 * durur, tek yazım bırakma anında olur — taşımayla aynı sözleşme (tek
 * markDirty, tek Ctrl+Z). Yazım K35/K36 gerekçesiyle REDDEDİLEBİLİR (sonuç bir
 * kapı/pencereyi kesiyorsa); reddedilirse nesne eski hâline döner çünkü
 * store'a hiç dokunulmamıştı.
 *
 * İmleç biçimi ve hover vurgusu da buradan yayınlanır: ikonlar DOM overlay'inde
 * (`AreaObjectHandles.tsx`) ama `pointer-events: none` — olayları tuval alıyor,
 * dolayısıyla "üstündeyim" bilgisini de tuval tarafı üretmek zorunda.
 */
export function useAreaObjectHandleTool(): void {
  const camera = useThree((state) => state.camera)
  const domElement = useThree((state) => state.gl.domElement)

  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return undefined

    let grab: HandleGrab | undefined

    const readZoom = () => readCameraViewport(camera).zoom

    const setCursor = (kind: AreaObjectHandleKind | null) => {
      domElement.style.cursor = kind ? HANDLE_CURSORS[kind] : ''
      useArchitectureUiStore.getState().setAreaObjectHandleHover(kind)
    }

    const endDrag = () => {
      grab = undefined
      useArchitectureUiStore.getState().setAreaObjectHandleDrag(null)
    }

    /** Sürüklemenin o anki önizleme şekli — hem çizim hem bırakma bunu kullanır. */
    const readShape = (event: DrawSurfacePointerEvent): AreaObjectShape | undefined => {
      // Yerel `const`: `grab` kapanış değişkeni olduğu için tür daraltması araya
      // giren çağrılarda kayboluyor, kind'ı boyutlandırmaya geçiremiyorduk.
      const current = grab
      if (!current) return undefined

      if (current.kind === 'rotate') {
        const raw = getAreaObjectAngleFromPointer(event.planPoint, {
          x: current.origin.x,
          y: current.origin.y,
        })
        // Açı KK-3'ün 15° adımına yakalanır; Ctrl bunu KAPATIR — boyutlandırmada
        // Ctrl ızgarayı kapatıyor, döndürmede hiçbir şey yapmıyordu, yani aynı
        // tuş aynı jestte iki farklı anlama geliyordu (K51).
        return {
          ...current.origin,
          angleDeg: event.ctrlKey ? normalizeAngleDeg(raw) : snapAngleDeg(raw),
        }
      }

      // Ctrl ızgarayı ve duvar yakalamasını kapatır — taşıma/yerleştirmeyle
      // aynı jest.
      const zoom = readZoom()
      const target = event.ctrlKey
        ? event.planPoint
        : snapResizeTarget(current.type, event.planPoint, zoom)

      return {
        ...current.origin,
        ...resizeAreaObjectFromCorner(
          current.type,
          current.origin,
          target,
          MIN_AREA_OBJECT_SIZE_CM,
          zoom,
          current.kind,
        ),
      }
    }

    const handlePointerDown = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return

      const hit = findSelectedAreaObjectHandle(event.planPoint, readZoom())
      if (!hit) return

      grab = {
        areaObjectId: hit.areaObject.id,
        kind: hit.kind,
        type: hit.areaObject.type,
        origin: {
          x: hit.areaObject.x,
          y: hit.areaObject.y,
          widthCm: hit.areaObject.widthCm,
          lengthCm: hit.areaObject.lengthCm,
          angleDeg: hit.areaObject.angleDeg,
        },
      }
    }

    const handlePointerMove = (event: DrawSurfacePointerEvent) => {
      if (!grab) {
        // Sürükleme yokken yalnız vurgu/imleç güncellenir.
        setCursor(findSelectedAreaObjectHandle(event.planPoint, readZoom())?.kind ?? null)
        return
      }

      const shape = readShape(event)
      if (!shape) return

      useArchitectureUiStore.getState().setAreaObjectHandleDrag({
        areaObjectId: grab.areaObjectId,
        kind: grab.kind,
        shape,
      })
    }

    const handlePointerUp = (event: DrawSurfacePointerEvent) => {
      if (!grab || event.button !== PRIMARY_BUTTON) return

      const { areaObjectId, kind } = grab
      // Yazılan şey EKRANDA GÖRÜLEN önizlemenin ta kendisi; pointerup'tan
      // yeniden hesaplanmaz. Yeniden hesaplansaydı bırakma anındaki değiştirici
      // tuş durumu kazanırdı: kullanıcı Ctrl'ü fareden ÖNCE bırakınca serbest
      // döndürdüğü nesne 15°'ye, ızgarasız boyutlandırdığı nesne ızgaraya
      // zıplardı — ekranda gördüğünden başka bir sonuç (K52).
      //
      // Hiç hareket etmediyse (yalnız tutamaca tıklama) önizleme yok, yazılmaz.
      const shape = useArchitectureUiStore.getState().areaObjectHandleDrag?.shape
      endDrag()
      if (!shape) return

      const cad = useCadStore.getState()
      if (kind === 'rotate') {
        // Açı önizlemede zaten yakalandı (ya da Ctrl ile yakalanmadı); store
        // ikinci kez yakalamasın, yoksa Ctrl'ün etkisi bırakma anında silinirdi.
        cad.rotateAreaObject(areaObjectId, shape.angleDeg, false)
        return
      }
      cad.resizeAreaObject(areaObjectId, {
        x: shape.x,
        y: shape.y,
        widthCm: shape.widthCm,
        lengthCm: shape.lengthCm,
      })
    }

    // Esc sürüklemeyi iptal eder: nesne eski hâlinde kalır, store'a yazılmadı.
    const handleCancel = () => {
      endDrag()
      setCursor(null)
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onCancel: handleCancel,
    })

    return () => {
      unsubscribe()
      endDrag()
      // İmleç biçimi elle yazıldığı için elle geri alınmalı; araç değişince
      // tuvalde "döndürme" imleci asılı kalmasın.
      setCursor(null)
    }
  }, [camera, domElement])
}
