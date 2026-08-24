import { useThree } from '@react-three/fiber'
import { useEffect, useRef, type RefObject } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import type { PlanPoint } from '../core/coords'
import { getPlacementPosition } from '../core/placement'
import { MIRROR_AXIS_TOOL_ID, SELECTION_TOOL_ID } from '../core/tools'
import { snapAngleDeg } from '../core/transform'
import { getSegmentAngleDeg } from '../core/wall'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { useUiStore } from '../store/uiStore'

const LEFT_BUTTON = 0

export type MirrorAxisToolState = {
  /** Araç kapalıysa false — sahne hiçbir şey çizmez. */
  isActive: boolean
  /** Izgaraya oturmuş imleç; `useFrame` okur, her hareket render tetiklemesin. */
  cursorRef: RefObject<PlanPoint | null>
}

/**
 * Kullanıcının ÇİZDİĞİ eksene göre aynalama (kullanıcı isteği): 1. tık ekseni
 * başlatır, imleç ikinci ucu taşır, 2. tık KOPYAYI üretir ve seçim aracına
 * döner. Ölçüm aracıyla aynı iki-tık jesti, ama sonucu KALICI: tek yazım, tek
 * Ctrl+Z.
 *
 * ⚠️ İşlem TAŞIMA değil ÇOĞALTMA (kullanıcı isteği: "ilk hali silinmemeli"):
 * kaynak yerinde kalıyor, aynalanmış kopya ekleniyor ve seçim kopyaya geçiyor.
 *
 * ⚠️ Önizleme çizgisi TIKLAMADAN çıkmıyor: ilk tık ekseni başlatıyor, ondan
 * önce gösterilecek bir eksen yok. Kullanıcı da bunu fark etti — tıklamasız
 * önizleme, ilk noktayı seçmeyi imkânsız kılardı.
 *
 * ⚠️ Eksen bir NESNE DEĞİL: uygulandıktan sonra hiçbir yerde saklanmıyor.
 * Kullanıcı aynı eksene göre ikinci bir aynalama isterse yeniden çiziyor —
 * saklamak, "çizimin parçası mı değil mi" sorusunu açardı (ölçümün K80'deki
 * kararıyla aynı çizgi).
 *
 * ⚠️ Açı 15°'ye YAKALANIR (Ctrl serbest bırakır): kullanıcının istediği yatay/
 * dikey eksen elle çizilirken tam tutturulamaz, 0/90 zaten adımın içinde.
 *
 * Seçim jest boyunca KORUNUR: araç değişimi seçimi temizlemiyor ve mimari
 * hook'ların hepsi `SELECTION_TOOL_ID` beklediği için tuvale yapılan tıklama
 * seçimi değiştirmiyor.
 */
export function useMirrorAxisTool(): MirrorAxisToolState {
  const activeToolId = useUiStore((state) => state.activeToolId)
  const camera = useThree((state) => state.camera)
  const cursorRef = useRef<PlanPoint | null>(null)
  const isActive = activeToolId === MIRROR_AXIS_TOOL_ID

  useEffect(() => {
    if (!isActive || !(camera instanceof OrthographicCamera)) return undefined

    const resolvePoint = (event: DrawSurfacePointerEvent): PlanPoint => {
      if (event.ctrlKey) return event.planPoint
      return getPlacementPosition(event.planPoint, readCameraViewport(camera).zoom)
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerMove: (event) => {
        cursorRef.current = resolvePoint(event)
      },

      onPointerDown: (event: DrawSurfacePointerEvent) => {
        if (event.button !== LEFT_BUTTON) return

        // Konum pointermove'a bırakılmaz: dokunmatikte tıklamadan önce hareket
        // gelmez (ölçüm aracıyla aynı gerekçe).
        const point = resolvePoint(event)
        cursorRef.current = point

        const ui = useArchitectureUiStore.getState()
        if (!ui.mirrorAxisStart) {
          ui.setMirrorAxisStart(point)
          return
        }

        // Aynı noktaya ikinci tık eksen üretmez: yön tanımsız kalır.
        if (ui.mirrorAxisStart.x === point.x && ui.mirrorAxisStart.y === point.y) return

        const angleDeg = event.ctrlKey
          ? getSegmentAngleDeg(ui.mirrorAxisStart, point)
          : snapAngleDeg(getSegmentAngleDeg(ui.mirrorAxisStart, point))

        // KOPYA üretilir, kaynak yerinde kalır (kullanıcı isteği). Seçim kopyaya
        // geçiyor: kullanıcı aynaladığı şeyi hemen taşıyabilsin (çoğaltmayla
        // aynı sözleşme).
        const created = useCadStore.getState().duplicateSelectionWithTransform(ui.selection, {
          kind: 'mirrorLine',
          origin: ui.mirrorAxisStart,
          angleDeg,
        })
        if (created.length > 0) ui.setSelection(created)

        ui.setMirrorAxisStart(null)
        // İş bitti: kullanıcı yeniden seçim yapabilsin diye palete dönülüyor.
        useUiStore.getState().setActiveTool(SELECTION_TOOL_ID)
      },

      // Sağ tık/Esc ekseni bırakır; araçtan çıkışı ortak hook yapıyor (K84).
      onContextMenu: () => useArchitectureUiStore.getState().setMirrorAxisStart(null),
      onCancel: () => useArchitectureUiStore.getState().setMirrorAxisStart(null),
    })

    return () => {
      unsubscribe()
      // Araç değişince yarım eksen ekranda asılı kalmasın.
      useArchitectureUiStore.getState().setMirrorAxisStart(null)
      cursorRef.current = null
    }
  }, [camera, isActive])

  return { isActive, cursorRef }
}
