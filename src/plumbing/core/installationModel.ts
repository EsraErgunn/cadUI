import type { RegulatorProperties } from './elementProperties'
import type { PipeLineProperties } from './lineProperties'
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
  /**
   * Ad etiketinin eleman konumuna göre kayması (cm). Alan YOKSA etiket
   * varsayılan yerinde (sembol kutusunun üstünde) durur — mutlak konum değil
   * kayma saklanır ki eleman taşınınca etiket kendiliğinden birlikte gelsin.
   * Hesabın tek sahibi core/elementLabel.ts.
   */
  labelOffsetCm?: PlanPoint
  /**
   * Özellik paneli alanları — TÜRÜNE göre en fazla biri dolu olur (`type`
   * hangisi olduğunu zaten söylüyor). Her tür kendi opsiyonel alanını alır,
   * bkz. elementProperties.ts.
   */
  regulator?: RegulatorProperties
}

export type InstallationLineKind =
  | 'pipe'
  | 'branch'
  | 'applianceStub'
  | 'chimney'
  | 'ventilationDuct'

export type InstallationLinePoint = {
  id: Id
  position: PlanPoint
  /**
   * Bu düğümde oturan armatür (vana, regülatör, manometre, izolasyon…). Armatür
   * hattın ÜSTÜNDE bir düğümdür, ayrı bir bağlantı kaydı değil (K-W3): bir hat
   * ucuna değil hattın ortasına oturduğu için `InstallationConnection` bunu
   * ifade edemez. Serbest duran elemanda bu alan YOKTUR.
   */
  inlineElementId?: Id
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
 * Cihazın kenarı üzerinde, kullanıcının ÇİZİM ANINDA seçtiği baca/havalandırma
 * ağzı. Metadata'da ilan edilmiş bir port değildir — bu yüzden `portId` yerine
 * konumu kendisi taşır.
 *
 * Konum sembolün YEREL koordinatında (SVG uzayı) saklanır, plan koordinatında
 * değil: cihaz taşınınca/döndürülünce ağız port'larla AYNI dönüşümden geçip
 * kendiliğinden yerinde kalır (`getPortWorldPosition`/`getPortWorldDirection`
 * bu tipi de olduğu gibi kabul eder). Plan koordinatı saklansaydı her taşımada
 * ayrıca güncellenmesi gerekir, bir yerde unutulunca ağız cihazdan kopardı.
 */
export type ApplianceOutlet = {
  elementId: Id
  /**
   * Sembol yerel koordinatı — `SymbolPortDefinition.position` ile aynı uzay.
   * Metadata'daki kardeşinin aksine `readonly` DEĞİL: bu tip store'da yaşıyor ve
   * immer draft'ı readonly tuple'ı yazılabilir taslağa çeviremiyor.
   */
  position: [number, number]
  /** Kenardan dışarı bakan birim normal (SVG yerel). */
  direction: [number, number]
}

/**
 * Bir hat ucunun bağlanabileceği hedef türleri: bir elemanın ilan edilmiş portu,
 * cihaz kenarındaki serbest deşarj ağzı, ya da başka bir hattın bir noktası
 * (branşmanın ana hatta bağlanması gibi). Opsiyonel alanlı tek tip yerine ayrık
 * birleşim: geçersiz kombinasyonlar derlemede engellenir.
 */
export type InstallationEndpointTarget =
  | { kind: 'port'; elementId: Id; portId: string }
  | ({ kind: 'outlet' } & ApplianceOutlet)
  | { kind: 'line'; lineId: Id; pointId: Id }

/**
 * Hat ucunun neye tutunduğu — HENÜZ çözülmemiş hâli. `lineSplit`, hedef borunun
 * bir parçasının ORTASI demek: kayıt yazılmadan önce o boru orada ayrılır ve
 * doğan köşeye bağlanılır. Kalıcı `InstallationEndpointTarget`'tan ayrı bir tip,
 * çünkü araç doğacak nokta id'sini önceden bilemez; çözüm store'da yapılır.
 */
export type LineEndAttachment =
  | { kind: 'port'; elementId: Id; portId: string }
  | ({ kind: 'outlet' } & ApplianceOutlet)
  | { kind: 'linePoint'; lineId: Id; pointId: Id }
  | { kind: 'lineSplit'; lineId: Id; segmentIndex: number; position: PlanPoint }

/**
 * Hat ucunun tutunduğu eleman; hatta tutunuyorsa null. Elemana bağlı UCU arayan
 * her yer (taşıma yayılımı, silme, kat temizliği, pano) bunu sorar — iki eleman
 * hedefi olduğu için `kind === 'port'` denetimi tek başına artık eksik kalır ve
 * unutulan bir yer ağzı sessizce kopuk bırakırdı.
 */
export function getTargetElementId(target: InstallationEndpointTarget): Id | null {
  if (target.kind === 'port' || target.kind === 'outlet') return target.elementId
  return null
}

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
   *
   * Gaz TAŞIMAYAN hatta (baca, havalandırma kanalı) ANLAMSIZDIR: alan yazılır
   * ama okunmaz. Genişlik türden gelir — `lineKinds.ts` → `getLineOuterWidthCm`
   * dışında bu alanı okuyan yeni kod yazma.
   */
  pipeTypeName: PipeTypeName
  /** Sıralı köşe listesi; en az 2 nokta. */
  points: InstallationLinePoint[]
  segments: InstallationLineSegment[]
  /**
   * Özellik paneli alanları — TÜRÜNE göre en fazla biri dolu olur (`kind`
   * hangisi olduğunu zaten söylüyor). Bkz. lineProperties.ts.
   */
  pipe?: PipeLineProperties
}
