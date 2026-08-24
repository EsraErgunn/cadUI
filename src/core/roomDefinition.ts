import type { PlanPoint } from './coords'
import type { Id, Point, Room, Wall } from './model'
import { findRoomFaces } from './room'
import { getWallSetKey } from './roomIdentity'
import { getRoomLabelAnchor } from './roomLabel'
import type { PlanBounds } from './viewport'

export type RoomDefinitionStop = {
  roomId: Id
  corners: PlanPoint[]
  areaCm2: number
  /** Kullanım tipi seçilmiş mi. Kuyruğa yalnız `false` olanlar girer. */
  isDefined: boolean
}

/**
 * Aynı "sıra" sayılan mahaller için y toleransı. İki mahalin ağırlık merkezi
 * bundan az farklıysa yan yana kabul edilir ve aralarında SOLDAN SAĞA sıralanır.
 *
 * Tolerans olmasaydı bir koridorun iki yanındaki odalar birkaç santimlik
 * merkez farkı yüzünden sırayla üst-alt-üst diye gezilir, kullanıcı ekranda
 * zıplayan bir kamera görürdü. Değer bir oda boyundan küçük, duvar
 * kalınlığından büyük seçildi.
 */
const ROW_BAND_CM = 100

/**
 * Odaklanırken mahalin çevresinde bırakılan pay (kenar uzunluğunun oranı).
 *
 * Bilerek CÖMERT: kullanıcı bulgusu "fazla yakın duruyor, nerede olduğumuzu
 * anlamıyoruz". Mahal ekranı doldurunca komşu duvarlar kadraj dışında kalıyor
 * ve plan tanınmaz oluyor — sorulan mahalin BAĞLAMI da görünmeli.
 */
const FOCUS_MARGIN_RATIO = 0.85
/** Çok küçük mahalde oran hiçbir şey açmaz; asgari pay santim cinsinden. */
const MIN_FOCUS_MARGIN_CM = 150

/**
 * "Mahalleri Tanımla" kipinin gezeceği duraklar: aktif kattaki, kullanım tipi
 * SEÇİLMEMİŞ mahaller.
 *
 * Geometri store'da durmadığı için (Room yalnız duvar id'si taşır) çevrim
 * duvarlardan türetiliyor — `Rooms` sahne bileşeniyle aynı eşleme (duvar kümesi
 * imzası, K31). Eşleşmeyen yüz atlanır: o, store'un henüz yakalamadığı bir ara
 * karedir, kullanıcıya "tanımsız mahal" diye gösterilmemeli.
 */
export function getRoomDefinitionQueue(
  rooms: readonly Room[],
  walls: readonly Wall[],
  points: readonly Point[],
  floorId: Id,
): RoomDefinitionStop[] {
  return getFloorRoomStops(rooms, walls, points, floorId).filter((stop) => !stop.isDefined)
}

/**
 * Aktif kattaki TÜM mahaller, okuma sırasında. Kip kartı bunu okuyor: geri
 * gidilen durak artık tanımlıysa da kamera oraya gitmeli, yoksa kart "bu mahal
 * tanımlandı" derken ekranda başka bir yer durur.
 */
export function getFloorRoomStops(
  rooms: readonly Room[],
  walls: readonly Wall[],
  points: readonly Point[],
  floorId: Id,
): RoomDefinitionStop[] {
  const roomByWallSet = new Map<string, Room>()
  for (const room of rooms) roomByWallSet.set(getWallSetKey(room.wallIds), room)

  const stops = findRoomFaces(walls, points, floorId).flatMap((face) => {
    const room = roomByWallSet.get(getWallSetKey(face.wallIds))
    if (!room) return []

    return [
      {
        roomId: room.id,
        corners: face.corners,
        areaCm2: face.areaCm2,
        isDefined: room.usageType !== undefined,
      },
    ]
  })

  return sortByReadingOrder(stops)
}

/**
 * Okuma sırası: ÜSTTEN ALTA, sonra SOLDAN SAĞA. Ekranda yukarısı plan +Y
 * olduğu için y AZALAN sıralanıyor.
 *
 * Sıra id'den gelseydi kullanıcı kamerayı çizimin bir ucundan öbürüne savrulur
 * hâlde izlerdi — id'ler çizim sırasına göre artıyor, konuma göre değil.
 */
function sortByReadingOrder(stops: readonly RoomDefinitionStop[]): RoomDefinitionStop[] {
  const anchors = new Map<Id, PlanPoint>()
  for (const stop of stops) anchors.set(stop.roomId, getRoomLabelAnchor(stop.corners))

  return [...stops].sort((left, right) => {
    const leftAnchor = anchors.get(left.roomId) as PlanPoint
    const rightAnchor = anchors.get(right.roomId) as PlanPoint

    if (Math.abs(leftAnchor.y - rightAnchor.y) > ROW_BAND_CM) return rightAnchor.y - leftAnchor.y
    return leftAnchor.x - rightAnchor.x
  })
}

/**
 * Mahali ekrana sığdıracak kamera sınırları — çevresinde pay bırakır ki
 * kullanıcı mahalin komşularını da görsün ve nerede olduğunu kaybetmesin.
 *
 * Pay ORANSAL: sabit santim verilseydi büyük salonda görünmez, şaftta ekranı
 * yutardı. Çok küçük mahaller için asgari bir taban var.
 */
export function getRoomFocusBounds(corners: readonly PlanPoint[]): PlanBounds {
  const xs = corners.map((corner) => corner.x)
  const ys = corners.map((corner) => corner.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const marginX = Math.max(MIN_FOCUS_MARGIN_CM, (maxX - minX) * FOCUS_MARGIN_RATIO)
  const marginY = Math.max(MIN_FOCUS_MARGIN_CM, (maxY - minY) * FOCUS_MARGIN_RATIO)

  return {
    minXCm: minX - marginX,
    minYCm: minY - marginY,
    maxXCm: maxX + marginX,
    maxYCm: maxY + marginY,
  }
}
