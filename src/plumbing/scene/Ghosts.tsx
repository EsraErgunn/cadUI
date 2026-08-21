import { useMemo } from 'react'

import { GhostAreaObject, GhostBeam, GhostRoomFill, GhostRoomLabel } from './ArchitectureGhostFixtures'
import { GhostPointSymbol } from './ArchitectureGhostPointSymbol'
import { GhostOpening, GhostWall } from './ArchitectureGhostWalls'
import { InstallationLines } from './InstallationLineMesh'
import { LengthLabels } from './LengthLabels'
import { SymbolInstance } from './SymbolInstance'
import { useCameraZoom } from './useCameraZoom'
import type { Room, Wall as WallData } from '../../core/model'
import { getOpeningOutline } from '../../core/opening'
import { findRoomFaces } from '../../core/room'
import { insetRoomPolygon } from '../../core/roomFill'
import { getWallSetKey } from '../../core/roomIdentity'
import { getRoomLabelAnchor } from '../../core/roomLabel'
import { getRoomDisplayName } from '../../core/roomUsage'
import { getSymbolPose, getSymbolsOnFloor } from '../../core/symbolPlacement'
import { buildPointIndex } from '../../core/wall'
import { useCadStore } from '../../store/cadStore'
import { useUiStore } from '../../store/uiStore'

/*
 * Karşı katmanın soluk izi — iki yönlü. İkisi de SceneRoot'ta mount edilir (çizen
 * katmanın içinde değil: hayalet katmanın parçası değil GÖRÜNÜMÜN bağlamıdır) ve
 * ikisi de aktif katı KENDİ okur, mount eden kat bilgisi geçirmez.
 * Yöntemleri bilerek farklı: mimari tek soluk renge boyanır ve tesisatın altında
 * durur; tesisat rengini korur, saydamlaşır ve mimarinin üstünde durur.
 * Gerekçeler: .claude/knowledge/ghost-layers.md · şekil bileşenleri
 * `ArchitectureGhostWalls.tsx` + `ArchitectureGhostFixtures.tsx`'te (200 satır
 * sınırı yüzünden ayrıldı).
 */

/**
 * Tesisat görünümündeki mimari: aktif kattaki duvarlar, kapı/pencere delikleri,
 * odalar, kirişler, alan nesneleri (merdiven/kolon/baca şaftı/kolon
 * havalandırması) ve nokta sembolleri (aydınlatma, pano, yangın söndürücü,
 * alarm cihazı, deprem sensörü, menfez, ana kesme şalteri) — `ArchitectureLayer`
 * neyi çiziyorsa hayaleti de onu çizer, yalnız tek soluk renkte.
 */
export function ArchitectureGhost() {
  const walls = useCadStore((state) => state.walls)
  const points = useCadStore((state) => state.points)
  // Havuz BİR kez indekslenir; hayalet duvar başına taransaydı O(N·P) olurdu.
  const pointIndex = buildPointIndex(points)
  const openings = useCadStore((state) => state.openings)
  const rooms = useCadStore((state) => state.rooms)
  const beams = useCadStore((state) => state.beams)
  const areaObjects = useCadStore((state) => state.areaObjects)
  const symbols = useCadStore((state) => state.symbols)
  const activeFloorId = useCadStore((state) => state.activeFloorId)
  // Oda adı görünürlüğü Room.tsx ile AYNI anahtardan okunur: kullanıcı adları
  // gizlediyse hayalette de gizli kalmalı, iki ayrı "görünür" durumu olmasın.
  const isRoomNamesVisible = useUiStore((state) => state.isRoomNamesVisible)
  // Zoom BİR kez okunur ve dağıtılır (bkz. useCameraZoom).
  const zoom = useCameraZoom()

  const floorWalls = useMemo(
    () => walls.filter((wall) => wall.floorId === activeFloorId),
    [activeFloorId, walls],
  )

  // Açıklık floorId taşımaz (K9): kat, bağlı olduğu duvardan türetilir.
  const openingGhosts = useMemo(
    () =>
      openings.flatMap((opening) => {
        const wall = floorWalls.find((candidate) => candidate.id === opening.wallId)
        if (!wall) return []

        const outline = getOpeningOutline(wall, points, opening)
        if (!outline) return []

        return [{ id: opening.id, outline, type: opening.type }]
      }),
    [floorWalls, openings, points],
  )

  // Room.tsx ile AYNI eşleştirme: yüz duvar kümesinden bulunur, eşleşmeyen
  // (henüz store'a yansımamış ara kare) yüz çizilmez. Oda kimliği React key'i
  // için taşınır — geometri değil, `Room.tsx`'teki `shapes` ile aynı gerekçe.
  const roomFillShapes = useMemo(() => {
    const faces = findRoomFaces(floorWalls, points, activeFloorId)
    const roomByWallSet = new Map<string, Room>()
    for (const room of rooms) roomByWallSet.set(getWallSetKey(room.wallIds), room)

    const thicknessById = new Map<WallData['id'], WallData['thickness']>()
    for (const wall of floorWalls) thicknessById.set(wall.id, wall.thickness)

    return faces.flatMap((face) => {
      const room = roomByWallSet.get(getWallSetKey(face.wallIds))
      if (!room) return []

      const thicknessesCm = face.wallIds.map((wallId) => thicknessById.get(wallId) ?? 0)
      const corners = insetRoomPolygon(face.corners, thicknessesCm)
      if (!corners) return []

      // Etiket çapası gerçek çevrime göre bulunur, dolgunun küçültülmüş
      // poligonuna göre DEĞİL — Room.tsx → RoomShape ile aynı gerekçe.
      return [
        {
          id: room.id,
          name: getRoomDisplayName(room.usageType),
          corners,
          labelAnchor: getRoomLabelAnchor(face.corners),
        },
      ]
    })
  }, [activeFloorId, floorWalls, points, rooms])

  const floorBeams = useMemo(
    () => beams.filter((beam) => beam.floorId === activeFloorId),
    [activeFloorId, beams],
  )
  const floorAreaObjects = useMemo(
    () => areaObjects.filter((areaObject) => areaObject.floorId === activeFloorId),
    [activeFloorId, areaObjects],
  )
  const floorSymbolPoses = useMemo(
    () =>
      getSymbolsOnFloor(symbols, activeFloorId, walls).flatMap((symbol) => {
        const pose = getSymbolPose(symbol, walls, points)
        return pose ? [{ id: symbol.id, type: symbol.type, pose }] : []
      }),
    [activeFloorId, points, symbols, walls],
  )

  return (
    <group name="architecture-ghost">
      {roomFillShapes.map((shape) => (
        <GhostRoomFill key={shape.id} corners={shape.corners} />
      ))}

      {isRoomNamesVisible &&
        roomFillShapes.map((shape) => (
          <GhostRoomLabel key={shape.id} anchor={shape.labelAnchor} name={shape.name} />
        ))}

      {floorWalls.map((wall) => (
        <GhostWall key={wall.id} wall={wall} pointIndex={pointIndex} zoom={zoom} />
      ))}

      {openingGhosts.map((opening) => (
        <GhostOpening key={opening.id} outline={opening.outline} type={opening.type} />
      ))}

      {floorBeams.map((beam) => (
        <GhostBeam key={beam.id} beam={beam} />
      ))}

      {floorSymbolPoses.map((symbol) => (
        <GhostPointSymbol key={symbol.id} type={symbol.type} pose={symbol.pose} />
      ))}

      {floorAreaObjects.map((areaObject) => (
        <GhostAreaObject key={areaObject.id} type={areaObject.type} areaObject={areaObject} />
      ))}
    </group>
  )
}

/**
 * Mimari görünümdeki tesisat. Renkler korunur, yalnız saydamlaşır (symbolLoader).
 *
 * Boru ÖLÇÜLERİ burada da yazılır (K132) ve hayalet gibi soluklaştırılMAZ:
 * hattın kendisi bağlam, ölçü ise kullanıcının mimari planda okumak istediği
 * BİLGİ — soluk yazı okunmazdı. Etiket `LengthLabels`'ın kendisidir, ikinci bir
 * uzunluk yazımı yok (tek çizim yolu, bkz. o dosyanın başı) ve "Ölçüler"
 * anahtarını iki görünümde de aynı yerden okur.
 */
export function InstallationGhost() {
  const elements = useCadStore((state) => state.installationElements)
  const activeFloorId = useCadStore((state) => state.activeFloorId)

  return (
    <group name="installation-ghost">
      {/* Hatlar da ize dahil: yalnız semboller gösterilseydi mimari görünümde
          borular kaybolur, cihazlar havada duruyormuş gibi okunurdu. */}
      <InstallationLines tone="ghost" />
      <LengthLabels />

      {elements
        .filter((element) => element.floorId === activeFloorId)
        .map((element) => (
          <SymbolInstance key={element.id} element={element} tone="ghost" />
        ))}
    </group>
  )
}
