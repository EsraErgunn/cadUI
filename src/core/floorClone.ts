import { createIdRemap, remapId } from './idRemap'
import type {
  Id,
  Opening,
  Point,
  PointSymbol,
  Room,
  SymbolAttachment,
  Wall,
} from './model'
import { getNextSymbolLabel } from './pointSymbol'
import { isSymbolOnFloor } from './symbolPlacement'

/**
 * Bir katın kopyalanabilir içeriği. Tesisat elemanları AYRI tutulur: talep
 * mimari ile tesisatın birlikte mi ayrı mı kopyalanacağını kullanıcıya
 * sorduruyor (KK-14), yani ikisi tek küme olamaz.
 */
export type FloorArchitecture = {
  points: Point[]
  walls: Wall[]
  openings: Opening[]
  rooms: Room[]
  symbols: PointSymbol[]
}

export type FloorCloneSource = {
  points: readonly Point[]
  walls: readonly Wall[]
  openings: readonly Opening[]
  rooms: readonly Room[]
  symbols: readonly PointSymbol[]
}

/** Katta çizim var mı? Kopya yalnız BOŞ kata aktarılır (CLAUDE.md ürün kuralı). */
export function isFloorEmpty(source: FloorCloneSource, floorId: Id): boolean {
  return (
    !source.points.some((point) => point.floorId === floorId) &&
    !source.walls.some((wall) => wall.floorId === floorId) &&
    !source.symbols.some((symbol) => isSymbolOnFloor(symbol, floorId, source.walls))
  )
}

/**
 * Oda `floorId` TAŞIMAZ; kimliği duvar id kümesidir (K31). Katı, duvarlarından
 * türetilir — kat silmedeki süzme ile aynı ölçüt.
 */
function isRoomOnFloor(room: Room, floorWallIds: ReadonlySet<Id>): boolean {
  return room.wallIds.some((wallId) => floorWallIds.has(wallId))
}

/**
 * Bir katın mimarisini boş bir kata kopyalar (KK-14, "kat çıkma").
 *
 * İKİ GEÇİŞ (knowledge/floor-clone.md): önce her nesneye eskiId→yeniId haritası,
 * sonra her referans alanı haritadan geçirilir. Naif derin kopya referansları
 * kaynağın id'lerinde bırakır ve HATA VERMEZ — alt kattaki duvar taşınınca üst
 * kattaki kapı da oynar. `remapId` haritada olmayan referansta atar.
 *
 * Remap edilen alanlar: `Wall.p1Id/p2Id`, `Opening.wallId`, `Room.wallIds`.
 * Sembol kimseye bağlı değil (kendi koordinatını taşır), yalnız yeni id ve
 * YENİ ETİKET alır — kaynağın etiketi taşınsaydı iki katta aynı ad olurdu ki
 * çakışma kuralı kat içinde tanımlı (KK-10), yani sessizce geçerdi ama
 * kullanıcı iki farklı katta "P-01" görürdü.
 *
 * `takeId` id üretimini çağırana bırakır: core store'u tanımaz.
 */
export function cloneFloorArchitecture(
  source: FloorCloneSource,
  sourceFloorId: Id,
  targetFloorId: Id,
  takeId: () => Id,
): FloorArchitecture {
  const sourcePoints = source.points.filter((point) => point.floorId === sourceFloorId)
  const sourceWalls = source.walls.filter((wall) => wall.floorId === sourceFloorId)
  const sourceWallIds = new Set(sourceWalls.map((wall) => wall.id))
  const sourceOpenings = source.openings.filter((opening) => sourceWallIds.has(opening.wallId))
  const sourceRooms = source.rooms.filter((room) => isRoomOnFloor(room, sourceWallIds))
  const sourceSymbols = source.symbols.filter((symbol) =>
    isSymbolOnFloor(symbol, sourceFloorId, source.walls),
  )

  // Köşeler ÖNCE: duvarın uçları onların yeni id'lerini isteyecek.
  const pointRemap = createIdRemap(
    sourcePoints.map((point) => point.id),
    takeId,
  )
  const points = sourcePoints.map((point) => ({
    id: remapId(pointRemap, point.id),
    floorId: targetFloorId,
    x: point.x,
    y: point.y,
  }))

  const wallRemap = createIdRemap(
    sourceWalls.map((wall) => wall.id),
    takeId,
  )
  const walls = sourceWalls.map((wall) => ({
    id: remapId(wallRemap, wall.id),
    floorId: targetFloorId,
    p1Id: remapId(pointRemap, wall.p1Id),
    p2Id: remapId(pointRemap, wall.p2Id),
    thickness: wall.thickness,
    height: wall.height,
  }))

  const openings = sourceOpenings.map((opening) => ({
    id: takeId(),
    wallId: remapId(wallRemap, opening.wallId),
    offsetCm: opening.offsetCm,
    widthCm: opening.widthCm,
    type: opening.type,
  }))

  const rooms = sourceRooms.map((room) => ({
    id: takeId(),
    wallIds: room.wallIds.map((wallId) => remapId(wallRemap, wallId)),
    name: room.name,
  }))

  // Etiketler kopya kümesine BİRER BİRER bakılarak üretilir: hepsi aynı anda
  // hesaplansaydı her sembol aynı numarayı alırdı.
  const symbols: PointSymbol[] = []
  for (const symbol of sourceSymbols) {
    /*
     * Duvara bağlı sembolün `wallId`'si REMAP'ten geçer. Geçirilmezse kopya
     * KAYNAĞIN duvarına bağlı kalır ve hata VERMEZ: çizim doğru görünür, ama
     * alt kattaki duvar taşınınca üst kattaki pano da oynar — floor-clone.md'nin
     * uyardığı sessiz tuzağın ta kendisi.
     *
     * Serbest sembol duvara bağlı değil; yalnız hedef kata taşınır.
     */
    const attachment: SymbolAttachment =
      symbol.attachment === 'wall'
        ? {
            attachment: 'wall',
            wallId: remapId(wallRemap, symbol.wallId),
            offsetCm: symbol.offsetCm,
            isMountedOnFarFace: symbol.isMountedOnFarFace,
          }
        : {
            attachment: 'free',
            floorId: targetFloorId,
            x: symbol.x,
            y: symbol.y,
            rotationDeg: symbol.rotationDeg,
          }

    symbols.push({
      id: takeId(),
      type: symbol.type,
      // Etiket kopya kümesine bakılarak üretilir; hepsi aynı anda hesaplansaydı
      // her sembol aynı numarayı alırdı. Kat kopyası için duvar listesi de
      // KOPYALANMIŞ duvarlar olmalı, kaynağınkiler değil.
      label: getNextSymbolLabel(symbols, symbol.type, targetFloorId, walls),
      note: symbol.note,
      ...attachment,
    })
  }

  return { points, walls, openings, rooms, symbols }
}
