import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import { isGridSnapActive } from './gridSnapMode'
import { findSelectedAreaObjectHandle } from './useAreaObjectHandleTool'
import { findAreaObjectLabelAt } from './useAreaObjectLabelTool'
import { findSelectedBeamHandle } from './useBeamHandleTool'
import { findPointSymbolLabelAt } from './usePointSymbolLabelTool'
import { findTextLabelAtPointer } from './useTextSelectionTool'
import { getCollinearGuide } from '../core/collinearGuide'
import type { PlanPoint } from '../core/coords'
import { pickGridLevel } from '../core/grid'
import type { Id } from '../core/model'
import { getSnapToleranceCm, resolveSnap } from '../core/snap'
import { SELECTION_TOOL_ID } from '../core/tools'
import { getPointMoveImpact } from '../core/wall'
import { findBlockingOpeningForMove } from '../core/wallGraph'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const PRIMARY_BUTTON = 0

type DragState = {
  pointId: Id
  /** Bırakılırsa kaynatılacak hedef köşe; boşlukta bırakılırsa undefined. */
  mergeTargetId: Id | undefined
}

/**
 * Köşe sürükleme. Araç mantığı DrawSurface'e YAZILMAZ (CLAUDE.md kural 7).
 *
 * Sürükleme boyunca cadStore'a yazılmaz, geçici konum architectureUiStore'da
 * durur: movePoint sığmayan açıklıkları siliyor (K16) ve duvar bir an kısaldığında
 * açıklık geri gelmemek üzere düşerdi. Tek yazma bırakma anında olur → tek markDirty.
 */
export function usePointDragTool(): void {
  const isActive = useUiStore((state) => state.activeToolId === SELECTION_TOOL_ID)
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    if (!isActive || !(camera instanceof OrthographicCamera)) return undefined

    let drag: DragState | undefined

    const snapAt = (planPoint: PlanPoint, event: DrawSurfacePointerEvent, excludedId?: Id) => {
      const { zoom } = readCameraViewport(camera)
      const cad = useCadStore.getState()
      return resolveSnap(
        planPoint,
        {
          // Sürüklenen köşe kendi kendine yapışmasın: hariç tutulunca ona bağlı
          // duvarlar da çözülemez olur, yani taşınan duvarlar hedef sayılmaz.
          points: cad.points.filter((point) => point.id !== excludedId),
          walls: cad.walls,
          floorId: cad.activeFloorId,
        },
        {
          toleranceCm: getSnapToleranceCm(zoom),
          gridStepCm: pickGridLevel(zoom).minorCm,
          isGridSnapEnabled: isGridSnapActive(event),
          // Ctrl yakalamayı kapatınca 180° de kapanır: kullanıcı o tuşa
          // "hiçbir şeye yapışma, tam istediğim yere koy" demek için basıyor.
          collinearGuide: event.ctrlKey
            ? undefined
            : getCollinearGuide(excludedId, cad.walls, cad.points, cad.activeFloorId),
        },
      )
    }

    const endDrag = () => {
      drag = undefined
      useArchitectureUiStore.getState().setDraggingPoint(null)
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerDown: (event) => {
        if (event.button !== PRIMARY_BUTTON) return

        // Bir önceki bırakma açıklık yüzünden REDDEDİLMİŞSE `drag` hâlâ aktif
        // (K36) — bu tıklama YENİ bir köşe tutma değil, o sürüklemenin BIRAKMA
        // denemesidir. Karar hep `onPointerUp`'ta verilir; burada yalnız yeni
        // bir grab başlatılmasını engellemek yeterli, `onPointerMove` zaten
        // buton durumundan bağımsız çalışıp imleci takip ettiriyor.
        if (drag) return

        // Alan nesnesi tutamacı bir duvar köşesinin üstüne denk gelebilir; o
        // basış tutamacın, yoksa aynı jestte köşe de sürüklenirdi (K44).
        if (findSelectedAreaObjectHandle(event.planPoint, readCameraViewport(camera).zoom)) return
        // Kirişin uç tutamacı da aynı gerekçeyle jesti sahipleniyor (K44 dersi).
        if (findSelectedBeamHandle(event.planPoint, readCameraViewport(camera).zoom)) return
        // Ad etiketi gövdenin DIŞINDA ve serbestçe taşınabiliyor: o basış etiketin.
        if (findAreaObjectLabelAt(event.planPoint, readCameraViewport(camera).zoom)) return
      // Cihaz ad etiketi de gövdesinin DIŞINDA ve serbestçe taşınabiliyor (K138).
      if (findPointSymbolLabelAt(event.planPoint, readCameraViewport(camera).zoom)) return
        // Metin de gövdesiz ve serbest: üstüne basıldıysa jest metnin (K81).
        if (findTextLabelAtPointer(event.planPoint)) return

        // Tutulan köşeyi bulmak snap'in kendisidir: yalnız 'point' sayılır,
        // duvar gövdesine basmak köşe tutmaz.
        const grab = snapAt(event.planPoint, event)
        if (grab.kind !== 'point' || grab.pointId === undefined) return

        drag = { pointId: grab.pointId, mergeTargetId: undefined }
        useArchitectureUiStore.getState().setDraggingPoint({
          pointId: grab.pointId,
          position: grab.point,
        })
      },

      onPointerMove: (event) => {
        if (!drag) return

        const snap = snapAt(event.planPoint, event, drag.pointId)
        drag.mergeTargetId = snap.kind === 'point' ? snap.pointId : undefined
        useArchitectureUiStore
          .getState()
          .setDraggingPoint({ pointId: drag.pointId, position: snap.point })
      },

      onPointerUp: (event) => {
        if (!drag || event.button !== PRIMARY_BUTTON) return

        const { pointId, mergeTargetId } = drag
        const position = useArchitectureUiStore.getState().draggingPoint?.position
        if (!position) {
          endDrag()
          return
        }

        // Köşeye bağlı duvarlar bu köşeyle birlikte hareket eder; her biri
        // YENİ konuma göre kontrol edilir. Taşınan duvarların KENDİSİ listeden
        // çıkarılır — kendi eski hâllerine göre kontrol etmek anlamsız olurdu,
        // onlar zaten hareket eden taraf (K36).
        const cad = useCadStore.getState()
        const { segments, stationaryWalls } = getPointMoveImpact(
          pointId,
          position,
          cad.walls,
          cad.points,
        )

        // Hedef bir açıklığın içinden geçiyor veya üstünde bitiyorsa bırakma
        // REDDEDİLİR — `drag` state KORUNUR, `endDrag()` çağrılmaz. Köşe
        // imlece yapışık kalır, kullanıcı geçerli bir yere gelip TEKRAR
        // tıklayana kadar sürükleme sürer (K36).
        //
        // Kontrol İKİ YÖNLÜ (K48): taşınan duvarın KENDİ kapısı sabit bir
        // duvarın üstüne gelirse de reddedilir.
        const blocking = findBlockingOpeningForMove(
          segments,
          stationaryWalls,
          cad.points,
          cad.openings,
          cad.activeFloorId,
        )
        if (blocking) return

        endDrag()

        // Var olan bir köşenin üstüne bırakmak KAYNATIR. Yalnız koordinat
        // eşitlenseydi iki nokta üst üste gelir ama bağlanmazdı.
        if (mergeTargetId !== undefined) {
          useCadStore.getState().mergePoint(pointId, mergeTargetId)
          return
        }

        useCadStore.getState().movePoint(pointId, position)
      },

      // Esc sürüklemeyi iptal eder: nokta eski yerinde kalır çünkü store'a hiç yazılmadı.
      onCancel: endDrag,
    })

    return () => {
      unsubscribe()
      endDrag()
    }
  }, [camera, isActive])
}
