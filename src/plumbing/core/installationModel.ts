import type { InstallationElementType } from './symbolMetadata'
import type { PlanPoint } from '../../core/coords'
import type { Id } from '../../core/model'

// TODO(tesisat): core/model.ts sözleşmesi (Node/Pipe/Fitting/Equipment/ServiceBox)
// yazılınca plumbingSerialize.ts içinde bu tiplerle eşleme kurulacak.

export type InstallationElement = {
  id: Id
  floorId: Id
  type: InstallationElementType
  /** Sembol origin'inin plan koordinatı (cm). */
  position: PlanPoint
  angleDeg: number
  /** 1 = metadata'daki doğal boy. Sembol başına hard-coded ölçek YOK. */
  scale: number
}

export type InstallationLineKind = 'pipe' | 'branch'

export type InstallationLinePoint = {
  id: Id
  position: PlanPoint
}

/** İki ardışık nokta arasındaki parça. İzolasyon bu seviyede toggle edilir. */
export type InstallationLineSegment = {
  id: Id
  fromPointId: Id
  toPointId: Id
  isInsulated: boolean
}

/**
 * Bir hat ucunun bağlanabileceği İKİ hedef türü: bir elemanın portu, ya da başka
 * bir hattın bir noktası (branşmanın ana hatta bağlanması gibi). Opsiyonel alanlı
 * tek tip yerine ayrık birleşim: geçersiz kombinasyonlar derlemede engellenir.
 */
export type InstallationEndpointTarget =
  | { kind: 'port'; elementId: Id; portId: string }
  | { kind: 'line'; lineId: Id; pointId: Id }

/** Hat ucunun bağlantısı. Uç serbestse kayıt YOKTUR (boş alan yerine kaydın yokluğu). */
export type InstallationConnection = {
  lineId: Id
  /** Hattın hangi ucu: ilk nokta mı son nokta mı. */
  end: 'start' | 'end'
  target: InstallationEndpointTarget
}

export type InstallationLine = {
  id: Id
  floorId: Id
  kind: InstallationLineKind
  /** Sıralı köşe listesi; en az 2 nokta. */
  points: InstallationLinePoint[]
  segments: InstallationLineSegment[]
}
