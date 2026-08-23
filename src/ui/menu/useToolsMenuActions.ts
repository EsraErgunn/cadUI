import { useMemo } from 'react'

import {
  DEFINE_ROOMS_ITEM_ID,
  DELETE_RISER_ITEM_ID,
  DELETE_UNIT_INSTALLATIONS_ITEM_ID,
} from './menuDefinitions'
import { getFloorRoomStops } from '../../core/roomDefinition'
import type { ViewId } from '../../core/views'
import { partitionInstallation } from '../../plumbing/core/networkPartition'
import {
  requestRiserDeletion,
  requestUnitInstallationsDeletion,
} from '../../plumbing/store/deletionActions'
import { useArchitectureUiStore } from '../../store/architectureUiStore'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'

export type ToolsMenuActions = {
  /** Şu an tıklanamayacak Araçlar maddeleri — çizimde karşılığı olmayanlar. */
  unavailableItemIds: string[]
  /** Madde Araçlar menüsüne aitse çalıştırır ve `true` döner. */
  run: (itemId: string) => boolean
}

/**
 * Araçlar > Toplu İşlemler maddelerinin mantığı. MenuBar'dan AYRI: bar
 * sunum bileşeni ve 200 satırı aşmıştı; burada olunca çizimden türeyen
 * pasiflik hesabı da tek yerde duruyor.
 *
 * Maddeler için prop YOK — üçü de saf store işi, sayfadan hiçbir şey
 * gerektirmiyor (Kaydet/İçe Aktar'ın aksine).
 */
export function useToolsMenuActions(isReadOnly: boolean): ToolsMenuActions {
  const rooms = useCadStore((state) => state.rooms)
  const walls = useCadStore((state) => state.walls)
  const points = useCadStore((state) => state.points)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  const installationElements = useCadStore((state) => state.installationElements)
  const installationLines = useCadStore((state) => state.installationLines)
  const installationConnections = useCadStore((state) => state.installationConnections)
  const floorPipeLinks = useCadStore((state) => state.floorPipeLinks)

  // Mahal sayısı çizimden TÜRETİLİYOR (Room kendi katını taşımaz), o yüzden
  // useMemo: bar her render'da yüz taraması yapmasın.
  const floorRoomCount = useMemo(
    () => getFloorRoomStops(rooms, walls, points, activeFloorId).length,
    [rooms, walls, points, activeFloorId],
  )

  /**
   * İki toplu silmenin kapsam sayıları. Bölümleme TEK kez yürütülüyor; iki
   * madde ayrı ayrı hesaplasaydı aynı graf iki kez gezilirdi.
   */
  const deletableCounts = useMemo(() => {
    const partition = partitionInstallation({
      installationElements,
      installationLines,
      installationConnections,
      floorPipeLinks,
    })
    const floorByElementId = new Map(
      installationElements.map((element) => [element.id, element.floorId]),
    )

    return {
      trunk: partition.trunk.elementIds.length + partition.trunk.lineIds.length,
      unitsOnFloor: partition.units
        .filter((unit) => floorByElementId.get(unit.boundaryElementId) === activeFloorId)
        .reduce((total, unit) => total + unit.elementIds.length + unit.lineIds.length, 0),
    }
  }, [
    installationElements,
    installationLines,
    installationConnections,
    floorPipeLinks,
    activeFloorId,
  ])

  const unavailableItemIds = useMemo(() => {
    // Üçü de çizime YAZAR: salt görüntülemede hiçbiri açılmamalı.
    if (isReadOnly) {
      return [DEFINE_ROOMS_ITEM_ID, DELETE_RISER_ITEM_ID, DELETE_UNIT_INSTALLATIONS_ITEM_ID]
    }

    /**
     * ⚠️ GÖRÜNÜM pasiflik sebebi DEĞİL (kullanıcı kararı, K149): madde her
     * görünümden tıklanabilir, tıklanınca kullanıcıyı kendi sahnesine ATAR
     * (bkz. `run`). Yanlış sahnedeyken maddeyi kapatmak, kullanıcıya "burada
     * yapılamaz" deyip nerede yapılacağını söylememekti.
     *
     * Geri alma güvenliği bozulmuyor: işlem çalıştığı anda aktif görünüm zaten
     * doğru olduğu için Ctrl+Z doğru geçmişe gider (K148'in gerekçesi).
     *
     * Pasiflik yalnız ÇİZİMDEN gelir — yapacak iş yoksa madde kapalı.
     */
    const unavailable: string[] = []
    // Katta hiç mahal yoksa gezilecek durak yok.
    if (floorRoomCount === 0) unavailable.push(DEFINE_ROOMS_ITEM_ID)
    // ⚠️ Kolon hattı TÜM katlarda aranır (düşey, kat seçimi yok); daire içi
    // yalnız AKTİF katta.
    if (deletableCounts.trunk === 0) unavailable.push(DELETE_RISER_ITEM_ID)
    if (deletableCounts.unitsOnFloor === 0) unavailable.push(DELETE_UNIT_INSTALLATIONS_ITEM_ID)

    return unavailable
  }, [isReadOnly, floorRoomCount, deletableCounts])

  /**
   * Maddeyi kendi sahnesine taşır (K149). Zaten oradaysak hiçbir şey yazılmaz:
   * gereksiz `setActiveView` seçimi temizler (K53) ve kullanıcının seçimini
   * sebepsiz düşürürdü.
   *
   * ⚠️ Geçiş işlemden ÖNCE: mahal kipinin kartı yalnız mimaride, silme
   * onayının geri alınabilirliği ise yalnız tesisatta doğru (K148).
   */
  const goToView = (viewId: ViewId) => {
    if (useUiStore.getState().activeViewId === viewId) return
    useUiStore.getState().setActiveView(viewId)
  }

  const run = (itemId: string): boolean => {
    if (itemId === DEFINE_ROOMS_ITEM_ID) {
      goToView('architecture')
      const cad = useCadStore.getState()
      const stops = getFloorRoomStops(cad.rooms, cad.walls, cad.points, cad.activeFloorId)
      const undefinedStops = stops.filter((stop) => !stop.isDefined)
      // Tanımsız kalmadıysa TÜM mahaller gezilir: gözden geçirme turu (K146).
      const queue = undefinedStops.length > 0 ? undefinedStops : stops
      useArchitectureUiStore.getState().startRoomDefinition(queue.map((stop) => stop.roomId))
      return true
    }
    if (itemId === DELETE_RISER_ITEM_ID) {
      goToView('installation')
      requestRiserDeletion()
      return true
    }
    if (itemId === DELETE_UNIT_INSTALLATIONS_ITEM_ID) {
      goToView('installation')
      requestUnitInstallationsDeletion(activeFloorId)
      return true
    }
    return false
  }

  return { unavailableItemIds, run }
}
