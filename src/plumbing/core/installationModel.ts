import type { PipeTypeName } from './pipeTypes'
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

/**
 * İki ardışık nokta arasındaki parça. `isInsulated` alanı bilerek YOK: izolasyon
 * segment boolean'ı değil kendi nesnesidir (K-W4, Aşama 8).
 */
export type InstallationLineSegment = {
  id: Id
  fromPointId: Id
  toPointId: Id
}

/**
 * Bir hat ucunun bağlanabileceği İKİ hedef türü: bir elemanın portu, ya da başka
 * bir hattın bir noktası (branşmanın ana hatta bağlanması gibi). Opsiyonel alanlı
 * tek tip yerine ayrık birleşim: geçersiz kombinasyonlar derlemede engellenir.
 */
export type InstallationEndpointTarget =
  | { kind: 'port'; elementId: Id; portId: string }
  | { kind: 'line'; lineId: Id; pointId: Id }

/**
 * Hat ucunun neye tutunduğu — HENÜZ çözülmemiş hâli. `lineSplit`, hedef borunun
 * bir parçasının ORTASI demek: kayıt yazılmadan önce o boru orada ayrılır ve
 * doğan köşeye bağlanılır. Kalıcı `InstallationEndpointTarget`'tan ayrı bir tip,
 * çünkü araç doğacak nokta id'sini önceden bilemez; çözüm store'da yapılır.
 */
export type LineEndAttachment =
  | { kind: 'port'; elementId: Id; portId: string }
  | { kind: 'linePoint'; lineId: Id; pointId: Id }
  | { kind: 'lineSplit'; lineId: Id; segmentIndex: number; position: PlanPoint }

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
  /**
   * Çap hat başına tutulur; WebCAD de çapı boruya gömüyor (K-W1). Hat içinde çap
   * değişmesi gerekirse hat BÖLÜNÜR.
   */
  pipeTypeName: PipeTypeName
  /** Sıralı köşe listesi; en az 2 nokta. */
  points: InstallationLinePoint[]
  segments: InstallationLineSegment[]
}
