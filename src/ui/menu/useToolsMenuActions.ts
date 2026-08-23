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
export function useToolsMenuActions(
  isReadOnly: boolean,
  activeViewId: ViewId,
): ToolsMenuActions {
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

    const unavailable: string[] = []
    // Mahal MİMARİ görünümün nesnesi; başka görünümde vurgulanacak bir mahal yok.
    if (activeViewId !== 'architecture') unavailable.push(DEFINE_ROOMS_ITEM_ID)
    // Katta hiç mahal yoksa gezilecek durak yok.
    if (floorRoomCount === 0) unavailable.push(DEFINE_ROOMS_ITEM_ID)

    /**
     * ⚠️ İki silme YALNIZ TESİSAT görünümünde. Gerekçe kozmetik değil: geri
     * alma AKTİF GÖRÜNÜMÜN geçmişine gidiyor (K123, `activeViewHistory.ts`) ve
     * tesisat aynası yalnız tesisat/izometrik görünümlerde gezilir. Mimaride
     * çalıştırılsaydı Ctrl+Z tesisatı değil DUVARI geri alır, onay
     * penceresindeki "geri alınabilir" sözü yalan olurdu.
     *
     * İzometrik de dışarıda: orada aktif kat kavramı YOK (K124), daire içi
     * silmenin kapsamı tanımsız kalırdı.
     */
    if (activeViewId !== 'installation') {
      unavailable.push(DELETE_RISER_ITEM_ID, DELETE_UNIT_INSTALLATIONS_ITEM_ID)
    }
    // ⚠️ Kolon hattı TÜM katlarda aranır (düşey, kat seçimi yok); daire içi
    // yalnız AKTİF katta.
    if (deletableCounts.trunk === 0) unavailable.push(DELETE_RISER_ITEM_ID)
    if (deletableCounts.unitsOnFloor === 0) unavailable.push(DELETE_UNIT_INSTALLATIONS_ITEM_ID)

    return unavailable
  }, [isReadOnly, activeViewId, floorRoomCount, deletableCounts])

  const run = (itemId: string): boolean => {
    if (itemId === DEFINE_ROOMS_ITEM_ID) {
      const cad = useCadStore.getState()
      const stops = getFloorRoomStops(cad.rooms, cad.walls, cad.points, cad.activeFloorId)
      const undefinedStops = stops.filter((stop) => !stop.isDefined)
      // Tanımsız kalmadıysa TÜM mahaller gezilir: gözden geçirme turu (K146).
      const queue = undefinedStops.length > 0 ? undefinedStops : stops
      useArchitectureUiStore.getState().startRoomDefinition(queue.map((stop) => stop.roomId))
      return true
    }
    if (itemId === DELETE_RISER_ITEM_ID) {
      requestRiserDeletion()
      return true
    }
    if (itemId === DELETE_UNIT_INSTALLATIONS_ITEM_ID) {
      requestUnitInstallationsDeletion(activeFloorId)
      return true
    }
    return false
  }

  return { unavailableItemIds, run }
}
