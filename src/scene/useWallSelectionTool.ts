import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import { findSelectedAreaObjectHandle } from './useAreaObjectHandleTool'
import { findAreaObjectLabelAt } from './useAreaObjectLabelTool'
import { findSelectedBeamHandle } from './useBeamHandleTool'
import { findRoomLabelAt } from './useRoomNameTool'
import { findTextLabelAtPointer } from './useTextSelectionTool'
import { resolveWallDragDelta } from './wallDragDelta'
import {
  resolveArchitectureTarget,
  type ArchitectureTargetContext,
} from '../core/architectureHover'
import type { PlanPoint } from '../core/coords'
import type { Id } from '../core/model'
import { getSelectedIds, isItemSelected } from '../core/selection'
import { getSnapToleranceCm } from '../core/snap'
import { ERASER_TOOL_ID, SELECTION_TOOL_ID } from '../core/tools'
import { getWallMoveImpact } from '../core/wall'
import { findBlockingOpeningForMove } from '../core/wallGraph'
import { getWallNormal } from '../core/wallMove'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { findWallMoveBlocker } from '../store/architectureWallMoveValidity'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const PRIMARY_BUTTON = 0

type WallGrab = {
  /** Taşınacak duvarlar: tutulan duvar seçimin parçasıysa TÜM seçim (KK-11). */
  wallIds: Id[]
  /** Basış anındaki ham imleç noktası; öteleme buna göre ölçülür. */
  grabPoint: PlanPoint
  /** Tutulan duvarın p1'i — ızgara yapışması bu köşe üzerinden yapılır. */
  originP1: PlanPoint
  /**
   * Tutulan duvarın normali. TEK duvar sürüklenirken hareket buna kilitlenir
   * (K103). Çoklu seçimde `undefined`: bir blokta ortak normal yok, orada
   * öteleme serbest kalır.
   */
  normal: PlanPoint | undefined
}

/**
 * Duvar seçme, taşıma ve silme. Araç mantığı DrawSurface'e YAZILMAZ (kural 7).
 *
 * Aynı pointerdown'ı köşe ve açıklık hook'ları da görüyor. Duvar en ALTTAKİ
 * nesne, dolayısıyla ikisine de yol verir: hedef köşe veya açıklıksa jest hiç
 * başlamaz. Karar `resolveArchitectureTarget` ile veriliyor — vurgunun okuduğu
 * fonksiyonun aynısı, yoksa vurgu "şunu tutarsın" der basış başkasını tutar
 * (knowledge/gesture-bus-precedence.md).
 *
 * Öteleme KATIDIR: ham fark p1'e uygulanıp ızgaraya yapıştırılıyor, aynı fark
 * iki köşeye birden gidiyor. İki köşe ayrı ayrı yapıştırılsaydı duvarın boyu ve
 * açısı sürüklerken bozulurdu.
 *
 * Tek duvar sürüklenirken hareket duvarın NORMALİNE kilitlidir (K103): duvar
 * kendi ekseni boyunca kaydırılamaz, çünkü o hareket boyu da açıyı da
 * değiştirmez — yalnız köşeleri komşuların üstünde kaydırıp geometriyi bozar.
 * Aynı jestte, ötelemeyi boyunu değiştirerek karşılayamayan komşular köşeden
 * KOPARILIR ve yerinde kalır.
 */
export function useWallSelectionTool(): void {
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return undefined

    let grab: WallGrab | undefined

    const readContext = (): ArchitectureTargetContext => {
      const cad = useCadStore.getState()
      return {
        points: cad.points,
        walls: cad.walls,
        openings: cad.openings,
        symbols: cad.symbols,
        areaObjects: cad.areaObjects,
        beams: cad.beams,
        floorId: cad.activeFloorId,
        toleranceCm: getSnapToleranceCm(readCameraViewport(camera).zoom),
      }
    }

    const endDrag = () => {
      grab = undefined
      useArchitectureUiStore.getState().setDraggingWall(null)
    }

    const clearSelection = () => {
      useArchitectureUiStore.getState().clearSelection()
    }

    const handlePointerDown = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return

      // Bir önceki bırakma açıklık yüzünden REDDEDİLMİŞSE `grab` hâlâ aktif
      // (K36) — bu tıklama YENİ bir duvar tutma değil, o sürüklemenin BIRAKMA
      // denemesidir. Karar hep `onPointerUp`'ta verilir.
      if (grab) return

      const toolId = useUiStore.getState().activeToolId
      const isEraser = toolId === ERASER_TOOL_ID
      if (toolId !== SELECTION_TOOL_ID && !isEraser) return

      const context = readContext()
      // Alan nesnesi tutamacı bir duvarın üstüne denk gelebilir; o basış
      // tutamacın, yoksa aynı jestte duvar da taşınırdı (K44).
      if (findSelectedAreaObjectHandle(event.planPoint, readCameraViewport(camera).zoom)) return
      // Kirişin uç tutamacı da aynı gerekçeyle jesti sahipleniyor (K44 dersi).
      if (findSelectedBeamHandle(event.planPoint, readCameraViewport(camera).zoom)) return
      // Ad etiketi gövdenin DIŞINDA ve serbestçe taşınabiliyor: o basış etiketin.
      if (findAreaObjectLabelAt(event.planPoint, readCameraViewport(camera).zoom)) return
      // Metin de gövdesiz ve serbest: üstüne basıldıysa jest metnin (K81).
      if (findTextLabelAtPointer(event.planPoint)) return
      // Oda ad rozeti de gövdesiz ve serbest: üstüne basıldıysa jest etiketin —
      // yoksa çift tıklamak isteyen kullanıcıda çerçeve seçimi açılıyordu.
      if (findRoomLabelAt(event.planPoint)) return

      const target = resolveArchitectureTarget(event.planPoint, context)

      // Köşe ve açıklık üstte: jest onların. Boşluk da bizim değil — çerçeve
      // seçimini useSelectionTool başlatır, seçimi o temizler.
      if (!target || target.kind !== 'wall') return

      if (isEraser) {
        useCadStore.getState().deleteWall(target.wallId)
        clearSelection()
        return
      }

      const wall = context.walls.find((candidate) => candidate.id === target.wallId)
      const originP1 = context.points.find((point) => point.id === wall?.p1Id)
      const originP2 = context.points.find((point) => point.id === wall?.p2Id)
      if (!wall || !originP1 || !originP2) return

      // Shift seçime ekler/çıkarır, düz tıklama seçimi değiştirir (KK-10).
      // Zaten seçiliyse düz tıklama seçimi KORUR: yoksa çoklu seçimi taşımak için
      // basılan ilk duvar, taşıma başlamadan seçimi tek nesneye düşürürdü.
      const ui = useArchitectureUiStore.getState()
      const item = { kind: 'wall', id: wall.id } as const
      if (event.shiftKey) {
        ui.toggleSelected(item)
      } else if (!isItemSelected(ui.selection, item)) {
        ui.setSelection([item])
      }

      // Tutulan duvar seçimin parçasıysa seçimin TAMAMI taşınır; değilse yalnız o.
      // (Yukarıdaki dal seçimi zaten bu duvara indirmiş olabilir.)
      const selectedWallIds = getSelectedIds(useArchitectureUiStore.getState().selection, 'wall')
      const wallIds = selectedWallIds.includes(wall.id) ? selectedWallIds : [wall.id]
      grab = {
        wallIds,
        grabPoint: event.planPoint,
        originP1: { x: originP1.x, y: originP1.y },
        normal: wallIds.length === 1 ? getWallNormal(originP1, originP2) : undefined,
      }
    }

    const handlePointerMove = (event: DrawSurfacePointerEvent) => {
      if (!grab) return

      // Geçersiz konumda `undefined` döner: duvar son geçerli yerinde durur (K103).
      const moved = resolveWallDragDelta({
        wallIds: grab.wallIds,
        originP1: grab.originP1,
        normal: grab.normal,
        rawDxCm: event.planPoint.x - grab.grabPoint.x,
        rawDyCm: event.planPoint.y - grab.grabPoint.y,
        zoom: readCameraViewport(camera).zoom,
        isGridDisabled: event.ctrlKey,
      })
      if (!moved) return

      useArchitectureUiStore.getState().setDraggingWall({
        wallIds: grab.wallIds,
        dxCm: moved.dxCm,
        dyCm: moved.dyCm,
      })
    }

    const handlePointerUp = (event: DrawSurfacePointerEvent) => {
      if (!grab || event.button !== PRIMARY_BUTTON) return

      const { wallIds } = grab
      const isNormalConstrained = grab.normal !== undefined
      const drag = useArchitectureUiStore.getState().draggingWall

      // Sürükleme boyunca cadStore'a hiç yazılmadı: tek yazım = tek markDirty =
      // tek Ctrl+Z. Yer değişmediyse (sadece seçmek için tıklama) hiç yazılmaz.
      if (!drag || (drag.dxCm === 0 && drag.dyCm === 0)) {
        endDrag()
        return
      }

      // Taşınan HER duvarın yeni (ötelenmiş) segmenti kontrol edilir; esneyen
      // (paylaşılan köşeyi taşıyan ama SEÇİLİ olmayan) komşu duvarlar kapsam
      // dışı bırakıldı — bilinen sınır (K36).
      const cad = useCadStore.getState()
      const { segments, stationaryWalls } = getWallMoveImpact(
        wallIds,
        drag.dxCm,
        drag.dyCm,
        cad.walls,
        cad.points,
      )

      // Hedef bir açıklığın içinden geçiyor veya üstünde bitiyorsa bırakma
      // REDDEDİLİR — `grab` KORUNUR, `endDrag()` çağrılmaz. Duvar imlece
      // yapışık kalır, kullanıcı geçerli bir yere gelip TEKRAR tıklayana kadar
      // sürükleme sürer (K36).
      //
      // Kontrol İKİ YÖNLÜ (K48): taşınan duvarın KENDİ kapısı sabit bir duvarın
      // üstüne gelirse de reddedilir — eskiden yalnız ters yön bakılıyordu.
      const blocking = findBlockingOpeningForMove(
        segments,
        stationaryWalls,
        cad.points,
        cad.openings,
        cad.activeFloorId,
      )
      if (blocking) return

      // Sürükleme geçerli tutuldu; yine de sınanır, çizim jest sürerken değişmiş olabilir.
      const moveBlocker = isNormalConstrained
        ? findWallMoveBlocker(cad, wallIds[0], drag.dxCm, drag.dyCm)
        : undefined

      endDrag()
      if (moveBlocker) return

      // Taşıma da bir dönüşüm: tek duvar ile çoklu seçim aynı yoldan geçer,
      // yoksa "birden çok duvar taşındığında ne oluyor" iki yerde yanıtlanırdı.
      //
      // Kopma YALNIZ normale kilitli tek duvar sürüklemesinde (K103): çoklu
      // seçimde blok katı hareket ediyor ve ortak bir normal yok, orada
      // komşuyu koparmanın geometrik gerekçesi de yok.
      // Tek duvar KENDİNE PARALEL kayar ve uçları komşularının doğrusuna oturur
      // (K103); çoklu seçim blok olarak ötelenir, orada ortak normal yok.
      if (isNormalConstrained) {
        useCadStore.getState().offsetWall(wallIds[0], drag.dxCm, drag.dyCm)
        return
      }

      useCadStore.getState().transformSelection(
        wallIds.map((wallId) => ({ kind: 'wall', id: wallId })),
        { kind: 'translate', dxCm: drag.dxCm, dyCm: drag.dyCm },
      )
    }

    // Esc taşımayı iptal eder: duvar eski yerinde kalır çünkü store'a yazılmadı.
    const handleCancel = () => {
      endDrag()
      clearSelection()
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
    }
  }, [camera])
}
