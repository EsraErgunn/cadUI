// Tip-only ve coords.ts hiçbir şey import etmiyor: döngü oluşmaz.
import type { PlanPoint } from './coords'
// installationModel.ts da `Id`'yi buradan tip-only import ediyor — döngüsel
// ama çalışma zamanında SİLİNİR (K17'deki cadStore↔plumbingSlice gerekçesiyle aynı).
import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../plumbing/core/installationModel'

/** Kalıcı id: proje bazlı artan tamsayı. Bkz. knowledge/id-scheme.md. */
export type Id = number

/**
 * Kot (`elevation`) ALANI YOK: kat yüksekliklerinden ve sıradan her gösterimde
 * türetilir (core/floorElevation.ts). Saklansaydı bir katın yüksekliği değişince
 * üstündeki bütün kotları güncellemek gerekirdi ve biri atlandığında JSON
 * sessizce tutarsız kalırdı.
 *
 * `isBasement` bir görüntü etiketi değil sıra kısıtı: bodrum katlar dizinin
 * başında (zemin katın ALTINDA) durur, kotu negatiftir ve bina yüksekliğine
 * girmez.
 */
export type Floor = {
  id: Id
  name: string
  heightCm: number
  isBasement: boolean
}

export const DEFAULT_FLOOR_NAME = 'Zemin Kat'
export const DEFAULT_FLOOR_HEIGHT_CM = 300

/** Proje açıldığında oluşan tek kat 1 numarayı alır, sayaç 2'den devam eder. */
export const DEFAULT_FLOOR_ID: Id = 1
export const FIRST_FREE_ID: Id = 2

/** Duvar köşeleri ortak bu havuzda durur; duvar kendi koordinatını taşımaz. */
export type Point = {
  id: Id
  floorId: Id
  x: number
  y: number
}

/** İki Point'i birbirine bağlar; koordinat tekrarlamaz, p1Id/p2Id ile referans verir. */
export type Wall = {
  id: Id
  floorId: Id
  p1Id: Id
  p2Id: Id
  thickness: number
  height: number
}

export type OpeningType = 'door' | 'window'

/**
 * Duvar BÖLÜNMEZ (K9): açıklık, tek parça duvarın üstünde wallId + offsetCm ile
 * duran bir "delik"tir. Duvar taşınınca kendiliğinden taşınır.
 * floorId yok — duvardan türetilir; iki yerde tutulursa zamanla ayrışır.
 * Yükseklik yok — 2B planda çizilmiyor, gerekince ayrı kararla eklenir.
 */
export type Opening = {
  id: Id
  wallId: Id
  /** Açıklığın ORTASI, duvarın p1 ucundan (K10). Kenarı DEĞİL. */
  offsetCm: number
  widthCm: number
  type: OpeningType
}

export const DEFAULT_ROOM_NAME = 'Oda'

/**
 * Duvarların çevrelediği kapalı alan. Geometri KOPYALAMAZ: sınırını oluşturan
 * duvarların id'lerini tutar, poligon her seferinde onlardan türetilir. Kopyalasaydı
 * duvar oynayınca oda yerinde donar ve hata ekranda görünmezdi.
 *
 * Kimlik `wallIds` kümesiyle korunur (K31): duvar ikiye bölününce küme bölme
 * anında güncellenir, oda aynı oda kalır ve kullanıcının verdiği ad yaşar.
 * İçinden duvar geçip oda ikiye ayrılırsa eski çevrim yok olur — iki YENİ oda
 * doğar, ikisi de varsayılan adı alır.
 *
 * floorId yok — duvardan türetilir; Opening ile aynı gerekçe (K9).
 */
export type Room = {
  id: Id
  wallIds: Id[]
  name: string
}

/**
 * Paletteki "nokta sembolü" ailesi (tutanak K-0, Desen A). Yedi araç aynı alan
 * kümesini paylaşır; aralarındaki tek fark çizilen şekildir.
 * Kolon/Kiriş/Merdiven (Desen B) ölçü taşıdığı, Baca Şaftı/Kolon Havalandırması
 * (Desen C) katlar arası eksen kimliği taşıdığı için buraya GİRMEZ.
 */
export type PointSymbolType =
  | 'mainCutoffSwitch'
  | 'panel'
  | 'lighting'
  | 'fireExtinguisher'
  | 'alarmDevice'
  | 'earthquakeSensor'
  | 'vent'

/**
 * Sembolün duvara bağlanma biçimi — referans formatla aynı model.
 *
 * Duvara bağlı sembol `floorId` ve `rotationDeg` TAŞIMAZ: ikisi de duvarından
 * türer. Pano bir duvar YÜZEYİNE monte edilir, dolayısıyla duvar nereye
 * bakıyorsa o da oraya bakar; iki yerde tutulan yön zamanla ayrışır (Opening ile
 * aynı kural, K9). Duvar taşınınca sembol kendiliğinden gelir.
 *
 * `isMountedOnFarFace` duvarın HANGİ YÜZÜNE monte edildiğini söyler — referans
 * formattaki `ccw` alanının karşılığı. Kazan dairesi/havalandırma kontrolleri
 * cihazın hangi mahale baktığını bilmek zorunda.
 *
 * Serbest sembol duvara denk gelmeyen yerleştirmedir. Araç bırakma noktasının
 * uygunluğunu DENETLEMEZ (tutanak K-6), bu yüzden serbest hâl bir hata durumu
 * değil meşru bir durumdur — aydınlatma ise referansta HER ZAMAN serbest
 * (tavana takılıyor, duvara değil).
 */
export type SymbolAttachment =
  | {
      attachment: 'wall'
      wallId: Id
      /** Duvarın p1 ucundan; Opening.offsetCm ile aynı eksen. */
      offsetCm: number
      isMountedOnFarFace: boolean
    }
  | {
      attachment: 'free'
      floorId: Id
      x: number
      y: number
      /** 0-359. Yalnız serbest sembolde anlamlı; duvara bağlıda duvar belirler. */
      rotationDeg: number
    }

export type PointSymbol = {
  id: Id
  type: PointSymbolType
  /** Tip kısaltması + sıra ("P-01"); otomatik üretilir, düzenlenebilir. */
  label: string
  /**
   * Serbest açıklama. Opsiyonel DEĞİL, boş string: `JSON.stringify` undefined
   * alanı atlar ve iki projenin JSON şekli ayrışırdı — kabul testi alan sırasına
   * dayanıyor (serialize.ts).
   */
  note: string
} & SymbolAttachment

/**
 * PointSymbol'ün (Desen A) dışında bıraktığı "ölçü taşıyan" nesneler (satır 73
 * yorumu, Desen B). Kolon kod adı bilerek `structuralColumn` — düşey gaz
 * kolonuyla (`Riser`) karışmasın (bkz. docs/kararlar.md "Terminoloji uyarısı").
 * Kiriş buraya GİRMEZ: o çizgisel (x1,y1,x2,y2), bu tip dikdörtgen alan.
 *
 * `flueShaft`/`columnVentilation` satır 73 yorumunda aslında Desen C (katlar
 * arası eksen kimliği, Riser gibi kat-bağımsız) diye ayrılmıştı — bilinçli bir
 * sadeleştirmeyle burada, basit KAT-BAŞI alan nesnesi olarak modellendi
 * (bkz. docs/kararlar.md K39/K40). O kararın ertelediği kat-bağımsız kimlik
 * ARTIK VAR ama nesneyi kattan koparmadan: `AreaObject.axisId` (K63). Nesne
 * kat başına durmaya devam ediyor, yalnız hangi düşey ekseni sürdürdüğünü
 * söylüyor.
 */
export type AreaObjectType = 'stairs' | 'structuralColumn' | 'flueShaft' | 'columnVentilation'

/**
 * Serbest, döndürülebilir dikdörtgen alan — merkez (x,y) + boyut (width,length)
 * + açı. PointSymbol'ün "free" dalına yapısal olarak en yakını ama PointSymbol'e
 * GİRMEZ: o ölçü taşımaz (bkz. satır 71-75 yorumu), bu taşır.
 */
export type AreaObject = {
  id: Id
  type: AreaObjectType
  floorId: Id
  x: number
  y: number
  widthCm: number
  lengthCm: number
  /** 0-359, x ekseninden saat yönünün tersine. */
  angleDeg: number
  /** PointSymbol.label ile aynı gerekçe: otomatik üretilir, düzenlenebilir. */
  label: string
  /**
   * Ad etiketinin nesne merkezine göre kayması (cm). Alan YOKSA etiket
   * varsayılan yerinde (kutunun üstünde) durur. Mutlak konum değil KAYMA
   * saklanır ki nesne taşınınca etiket kendiliğinden birlikte gelsin —
   * `InstallationElement.labelOffsetCm` ile birebir aynı gerekçe.
   */
  labelOffsetCm?: PlanPoint
  /**
   * Düşey eksen kimliği — YALNIZ `flueShaft` ve `columnVentilation` taşır
   * (KK-19, madde 21). Baca şaftı ve kolon havalandırması katlar arasında
   * SÜREN nesnelerdir: farklı katlardaki parçalar aynı bacanın parçasıdır ve
   * hata kontrolleri onları aynı düşey hizada arar.
   *
   * `id` bu işi göremez: id kat içinde benzersizdir ve kopya yeni id alır, yani
   * "aynı baca" bilgisi kopyalamada kaybolurdu. Kopya aynı koordinatta doğduğu
   * için geometrik olarak hizalı GÖRÜNÜR ama korunan bir kimlik olmadan, kat
   * sonradan taşınınca bağ sessizce kopardı.
   *
   * Proje genelinde benzersiz, `nextUniqueId`'den gelir (kural 6) — böylece
   * nesne id'leriyle aynı evrende, çakışması yapı gereği imkânsız.
   *
   * OPSİYONEL, çünkü alan bu karardan (K63) ÖNCE çizilmiş nesnelerde yok ve
   * `docs/sample-project.json` bit-bit turu bozulmamalı. Alanın yokluğu "bu
   * nesnenin bilinen bir düşey ekseni yok" demektir, "ekseni sıfır" değil.
   */
  axisId?: Id
}

/**
 * Kiriş — ÇİZGİSEL taşıyıcı, `AreaObject`'e girmez (o merkez+açılı dikdörtgen
 * alan). Referans formattaki `Beam{x1,y1,x2,y2,width,height}` ile aynı aile.
 *
 * Duvarın aksine ortak `Point` havuzunu KULLANMAZ, uçlarını kendi taşır. Havuza
 * girseydi duvar bakımının tamamı (sahipsiz köşe temizliği, kesişimde bölme, oda
 * çevrimi) kirişleri de görürdü — kirişe açıklık takılmıyor, oda çevirmiyor,
 * duvar gibi bölünmesi de istenmiyor.
 *
 * Yükseklik alanı YOK: duvarın `height`'ı 3B için gerekiyordu, kiriş 3B'de
 * henüz yok. Gerektiğinde ayrı karar.
 */
export type Beam = {
  id: Id
  floorId: Id
  x1: number
  y1: number
  x2: number
  y2: number
  /** Duvar `thickness` ile aynı eksen: kirişin plan üstündeki genişliği (cm). */
  thicknessCm: number
  /** PointSymbol.label ile aynı gerekçe: otomatik üretilir, düzenlenebilir. */
  label: string
}

/**
 * Dört kişi arasındaki sözleşme — izinsiz alan eklenmez.
 *
 * Tesisat üçlüsü (`installationElements/Lines/Connections`) BURADAN yönetilir
 * ama tipleri `plumbing/core/installationModel.ts`te yaşar (C'nin dosyası) —
 * orijinal Node/Pipe/Fitting/Equipment/ServiceBox adlandırması bu üçlüye
 * evrildi (fiili uygulama farklı isimlerle ilerledi, ServiceBox ayrı kökte
 * TEK nesne değil `InstallationElement` dizisinin bir üyesi; Riser henüz
 * YOK). Serileştirme `plumbing/core/plumbingSerialize.ts`te, kendi iç
 * şeklimizle — plnr.webcad.com.tr uyumu HEDEFLENMEDİ (bkz. docs/webcad-format.md).
 */
export type ProjectData = {
  nextUniqueId: Id
  activeFloorId: Id
  floors: Floor[]
  points: Point[]
  walls: Wall[]
  openings: Opening[]
  rooms: Room[]
  symbols: PointSymbol[]
  areaObjects: AreaObject[]
  beams: Beam[]
  installationElements: InstallationElement[]
  installationLines: InstallationLine[]
  installationConnections: InstallationConnection[]
}
