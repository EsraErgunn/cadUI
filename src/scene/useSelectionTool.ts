import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { OrthographicCamera } from 'three'

import { readCameraViewport } from './cameraViewport'
import { subscribeDrawSurface, type DrawSurfacePointerEvent } from './drawSurfaceEvents'
import { findSelectedAreaObjectHandle } from './useAreaObjectHandleTool'
import { findAreaObjectLabelAt } from './useAreaObjectLabelTool'
import { findSelectedBeamHandle } from './useBeamHandleTool'
import { findTextLabelAtPointer } from './useTextSelectionTool'
import {
  resolveArchitectureTarget,
  type ArchitectureTargetContext,
} from '../core/architectureHover'
import type { PlanPoint } from '../core/coords'
import { isTypingTarget } from '../core/domEvents'
import { findRoomFaceAt, findRoomFaces } from '../core/room'
import { getWallSetKey } from '../core/roomIdentity'
import { getSelectionInRect, mergeSelection, pruneSelection, toPlanRect } from '../core/selection'
import { getSnapToleranceCm } from '../core/snap'
import { getSymbolsOnFloor } from '../core/symbolPlacement'
import { SELECTION_TOOL_ID } from '../core/tools'
import { useArchitectureUiStore } from '../store/architectureUiStore'
import { useCadStore } from '../store/cadStore'
import { isEditorReadOnly } from '../store/editorReadOnly'
import { useUiStore } from '../store/uiStore'

const PRIMARY_BUTTON = 0

/** Çoğaltma kopyayı kaynağın üstüne koymaz: kullanıcı ikisini ayırt edebilmeli. */
const DUPLICATE_OFFSET_CM = 50

/**
 * Çerçeve seçimi, Shift ile ekleme/çıkarma ve seçimin tamamını silme (KK-10).
 *
 * Aynı pointerdown'ı duvar/açıklık/köşe hook'ları da görüyor. Bu hook en ALTTAN
 * da alta bakar: hedef YOKSA, yani boşluğa basıldıysa jest bunundur
 * (knowledge/gesture-bus-precedence.md — karar geometriyle verilir, abone olma
 * sırasıyla değil).
 *
 * Nesne üzerindeki tek tıklama seçimi duvar/açıklık hook'larında yazılır: jesti
 * kim sahipleniyorsa seçimi de o yazar, yoksa aynı basış iki kez seçim değiştirir.
 */
export function useSelectionTool(): void {
  const camera = useThree((state) => state.camera)

  useEffect(() => {
    if (!(camera instanceof OrthographicCamera)) return undefined

    let anchor: PlanPoint | undefined
    let isAdditive = false

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

    /**
     * Noktanın düştüğü mahalin kimliği. Yüzler burada TAZE hesaplanıyor çünkü
     * `Room` geometri taşımıyor (duvarların türevi) — ve hesap yalnız tıklama
     * anında yapılıyor, hover'da değil.
     */
    const findRoomIdAt = (planPoint: PlanPoint): number | undefined => {
      const cad = useCadStore.getState()
      const faces = findRoomFaces(cad.walls, cad.points, cad.activeFloorId)
      const face = findRoomFaceAt(faces, planPoint)
      if (!face) return undefined

      // Yüz ↔ kayıt eşleşmesi TAM KÜME eşitliğiyle: Room.tsx neyi çiziyorsa
      // tıklama da onu seçmeli.
      const key = getWallSetKey(face.wallIds)
      return cad.rooms.find((room) => getWallSetKey(room.wallIds) === key)?.id
    }

    const endMarquee = () => {
      anchor = undefined
      isAdditive = false
      useArchitectureUiStore.getState().setMarquee(null)
    }

    const handlePointerDown = (event: DrawSurfacePointerEvent) => {
      if (event.button !== PRIMARY_BUTTON) return
      if (useUiStore.getState().activeToolId !== SELECTION_TOOL_ID) return

      // Nesnenin üstündeyse jest onun; çerçeve yalnız boşlukta başlar.
      if (resolveArchitectureTarget(event.planPoint, readContext())) return
      // Alan nesnesinin tutamacı gövdenin DIŞINDA duruyor (döndürme sapı
      // tepede, boyutlandırma karesi köşede taşıyor), bu yüzden hedef
      // çözümlemesi "boşluk" diyor ve çerçeve seçimi başlıyordu — tutamacı
      // sürüklerken ekrana lastik dikdörtgen çiziliyordu (K44).
      if (findSelectedAreaObjectHandle(event.planPoint, readCameraViewport(camera).zoom)) return
      // Kirişin uç tutamacı da aynı gerekçeyle jesti sahipleniyor (K44 dersi).
      if (findSelectedBeamHandle(event.planPoint, readCameraViewport(camera).zoom)) return
      // Ad etiketi gövdenin DIŞINDA ve serbestçe taşınabiliyor: o basış etiketin.
      if (findAreaObjectLabelAt(event.planPoint, readCameraViewport(camera).zoom)) return
      // Metin `resolveArchitectureTarget` zincirinde YOK (K81): oraya girseydi
      // bir notun üstüne düşen duvar seçilemez olurdu. Sonuç olarak hedef
      // çözümlemesi metnin üstünü "boşluk" sayıyor ve çerçeve seçimi başlıyordu
      // — ad etiketiyle birebir aynı tuzak, çözümü de aynı: jesti metin alır.
      if (findTextLabelAtPointer(event.planPoint)) return

      anchor = event.planPoint
      isAdditive = event.shiftKey
    }

    const handlePointerMove = (event: DrawSurfacePointerEvent) => {
      if (!anchor) return
      useArchitectureUiStore.getState().setMarquee(toPlanRect(anchor, event.planPoint))
    }

    const handlePointerUp = (event: DrawSurfacePointerEvent) => {
      if (!anchor || event.button !== PRIMARY_BUTTON) return

      const rect = toPlanRect(anchor, event.planPoint)
      const wasAdditive = isAdditive
      endMarquee()

      const ui = useArchitectureUiStore.getState()

      // Sürükleme eşiğin altındaysa bu bir çerçeve değil, boşluğa TIKLAMADIR:
      // seçim bırakılır. Eşik ekran mesafesi (snap toleransıyla aynı 10 px), yoksa
      // uzaklaşınca titrek el bile çerçeve başlatırdı.
      const slopCm = getSnapToleranceCm(readCameraViewport(camera).zoom)
      if (rect.maxX - rect.minX < slopCm && rect.maxY - rect.minY < slopCm) {
        // Boşluk BOŞ olmayabilir: duvarların çevrelediği bir alana basıldıysa o
        // basış MAHALİN (K117). Mahal `resolveArchitectureTarget` zincirine
        // GİRMİYOR — oraya girseydi hem her hover'da yüz taraması yapılırdı hem
        // de mahalin içinden çerçeve seçimi başlatmak imkânsız olurdu.
        const roomId = findRoomIdAt(event.planPoint)
        if (roomId !== undefined) {
          ui.setSelection(mergeSelection(wasAdditive ? ui.selection : [], [
            { kind: 'room', id: roomId },
          ]))
          return
        }

        if (!wasAdditive) ui.clearSelection()
        return
      }

      const cad = useCadStore.getState()
      const floorWalls = cad.walls.filter((wall) => wall.floorId === cad.activeFloorId)
      const floorSymbols = getSymbolsOnFloor(cad.symbols, cad.activeFloorId, cad.walls)
      const floorAreaObjects = cad.areaObjects.filter(
        (areaObject) => areaObject.floorId === cad.activeFloorId,
      )
      const floorBeams = cad.beams.filter((beam) => beam.floorId === cad.activeFloorId)
      const floorTexts = cad.texts.filter((text) => text.floorId === cad.activeFloorId)
      const framed = getSelectionInRect(
        rect,
        floorWalls,
        cad.openings,
        cad.points,
        floorSymbols,
        floorAreaObjects,
        floorBeams,
        floorTexts,
      )

      ui.setSelection(wasAdditive ? mergeSelection(ui.selection, framed) : framed)
    }

    // Esc yarım kalan çerçeveyi iptal eder ve seçimi bırakır.
    const handleCancel = () => {
      endMarquee()
      useArchitectureUiStore.getState().clearSelection()
    }

    /**
     * Delete seçimin TAMAMINI siler, tek adımda. Klavye drawSurfaceEvents'te
     * taşınmıyor (onCancel yalnız Esc), bu yüzden dinleyici burada.
     *
     * Tek dinleyici var: duvar ve açıklık hook'larındaki ayrı Delete kopyaları
     * kaldırıldı — birleşik seçimde ikisi birden koşsaydı aynı basış iki
     * markDirty yazardı.
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return
      // Silme ve çoğaltma çizimi DEĞİŞTİRİR; salt görüntülemede tuş yutulmaz,
      // yalnız işlem yapılmaz (tarayıcının kendi davranışı serbest kalsın).
      if (isEditorReadOnly()) return

      const ui = useArchitectureUiStore.getState()
      if (ui.selection.length === 0) return

      if (event.key === 'Delete' || event.key === 'Backspace') {
        useCadStore.getState().deleteSelection(ui.selection)
        ui.clearSelection()
        return
      }

      // Ctrl+D: çoğalt (KK-11). preventDefault şart — tarayıcının "yer imi ekle"si
      // aynı tuşta.
      if (event.key.toLowerCase() === 'd' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault()
        const created = useCadStore.getState().duplicateSelection(ui.selection, {
          dxCm: DUPLICATE_OFFSET_CM,
          dyCm: DUPLICATE_OFFSET_CM,
        })
        // Seçim KOPYAYA geçer: kullanıcı çoğalttığı şeyi hemen sürükleyebilsin.
        if (created.length > 0) ui.setSelection(created)
      }
    }

    const unsubscribe = subscribeDrawSurface({
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onCancel: handleCancel,
    })
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      unsubscribe()
      window.removeEventListener('keydown', handleKeyDown)
      endMarquee()
    }
  }, [camera])

  // Silinen nesne seçimde asılı kalmasın: özellik paneli (KK-12) sahipsiz id ile
  // boş açılır ve grup dönüşümü (KK-11) var olmayan nesneyi taşımaya çalışır.
  useEffect(
    () =>
      useCadStore.subscribe((state) => {
        const ui = useArchitectureUiStore.getState()
        if (ui.selection.length === 0) return

        const pruned = pruneSelection(
          ui.selection,
          state.walls,
          state.openings,
          state.symbols,
          state.areaObjects,
          state.beams,
          state.texts,
          state.rooms,
        )
        // pruneSelection değişiklik yoksa AYNI diziyi döndürür; kontrol bu yüzden
        // referans karşılaştırması ve her store değişiminde yeni dizi yazılmaz.
        if (pruned !== ui.selection) ui.setSelection(pruned)
      }),
    [],
  )
}
