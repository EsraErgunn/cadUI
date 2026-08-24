import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from './installationModel'
import { collectServiceBoxInstallation } from './installationReachability'
import { getLineLengthCm } from './lineGeometry'
import { collectMeterDownstreamInstallation } from './meterReport'
import type { FloorPipeLink, Id } from '../../core/model'

/**
 * BAĞIMSIZ BÖLÜMÜN SINIRI — tüm toplu işlemler bu tek karara dayanır.
 *
 * ⚠️ Şartname sınır olarak "tüketim vanası"nı yazıyor ama modelde öyle bir tür
 * YOK: vana tek tür (`valve`) ve `ValveProperties.type` serbest metin, yani
 * "bu vana tüketim vanasıdır" diyen bir işaret hiç üretilmiyor. K142'de
 * "Tüketim Vanalarını Ekle" / "DN25 Yap" maddelerinin kaldırılma gerekçesi de
 * buydu.
 *
 * Yerine SAYAÇ kullanılıyor (kullanıcı kararı): tiplendirilmiş, "1 daire = 1
 * sayaç" kuralı yazılı (`GasMeterProperties`), üstünde `unitNumber` /
 * `subscriberName` duruyor — şartnamenin "bağımsız bölüm bazında" istediği
 * sayım doğrudan buradan çıkıyor.
 *
 * Tüketim vanası kavramı bir gün eklenirse DEĞİŞECEK TEK YER burasıdır;
 * çağıranlar (silme işlemleri, sayım, onay pencereleri) olduğu gibi kalır.
 */
export function isUnitBoundaryElement(element: InstallationElement): boolean {
  return element.type === 'gasMeter'
}

/** Bir bağımsız bölümün sayacından SONRAKİ tesisatı. */
export type UnitInstallation = {
  /** Sınır elemanı — bu kümeye DAHİL DEĞİL, yalnız kimlik için taşınır. */
  boundaryElementId: Id
  elementIds: Id[]
  lineIds: Id[]
  floorIds: Id[]
}

export type InstallationPartition = {
  /** Sınır elemanları. Hiçbir toplu silme bunlara dokunmaz. */
  boundaryElementIds: Id[]
  /**
   * Servis kutusundan sınıra kadar olan her şey: kolon hattı, branşmanlar ve
   * üzerlerindeki armatürler. Sınır elemanları ve bölüm içi BURAYA GİRMEZ.
   */
  trunk: { elementIds: Id[]; lineIds: Id[] }
  units: UnitInstallation[]
}

const EMPTY_PARTITION: InstallationPartition = {
  boundaryElementIds: [],
  trunk: { elementIds: [], lineIds: [] },
  units: [],
}

export type InstallationNetworkSource = {
  installationElements: readonly InstallationElement[]
  installationLines: readonly InstallationLine[]
  installationConnections: readonly InstallationConnection[]
  floorPipeLinks: readonly FloorPipeLink[]
}

/**
 * Gaz ağını üçe ayırır: gövde (kolon + branşman), sınır (sayaçlar) ve bölüm içi.
 *
 * Üçü BİRBİRİNİ DIŞLAR ve birleşimleri servis kutusundan ulaşılan ağı verir —
 * "Kolon Hattını Sil" ile "Daire İçi Tesisatları Sil" bu yüzden birbirinin
 * tümleyeni olabiliyor, iki ayrı gezinme kuralı yazılmadı.
 *
 * ⚠️ Sayaç servis kutusundan ULAŞILAMASA da bölüm sayılır (kopuk çizim):
 * kullanıcı onun dairesini yine de temizleyebilmeli. Gövde ise TANIMI gereği
 * yalnız ulaşılabilir kümeden çıkar — köke bağlı olmayan bir boru "kolon
 * hattı" değildir.
 */
export function partitionInstallation(source: InstallationNetworkSource): InstallationPartition {
  const { installationElements, installationLines, installationConnections, floorPipeLinks } =
    source

  const boundaryElementIds = installationElements
    .filter(isUnitBoundaryElement)
    .map((element) => element.id)

  const units = boundaryElementIds.map((meterId) => {
    const downstream = collectMeterDownstreamInstallation(
      meterId,
      installationElements,
      installationLines,
      installationConnections,
      floorPipeLinks,
    )
    return {
      boundaryElementId: meterId,
      // Sayacın KENDİSİ kaskadın içinde geliyor (silme yolu onu da götürüyor);
      // burada sınır korunacağı için ayıklanıyor.
      elementIds: downstream.elementIds.filter((id) => id !== meterId),
      lineIds: downstream.lineIds,
      floorIds: downstream.floorIds,
    }
  })

  const serviceBox = installationElements.find((element) => element.type === 'serviceBox')
  if (!serviceBox) return { ...EMPTY_PARTITION, boundaryElementIds, units }

  const reachable = collectServiceBoxInstallation(
    installationElements,
    installationLines,
    installationConnections,
    floorPipeLinks,
    serviceBox.id,
  )

  const claimedElementIds = new Set<Id>([...boundaryElementIds])
  const claimedLineIds = new Set<Id>()
  for (const unit of units) {
    for (const id of unit.elementIds) claimedElementIds.add(id)
    for (const id of unit.lineIds) claimedLineIds.add(id)
  }

  return {
    boundaryElementIds,
    trunk: {
      // Servis kutusu gövdenin parçası DEĞİL: kolon hattı silinince kaynak
      // yerinde kalmalı, yoksa kullanıcı yeniden çizmeye kutudan başlayamaz.
      elementIds: reachable.elementIds.filter(
        (id) => !claimedElementIds.has(id) && id !== serviceBox.id,
      ),
      lineIds: reachable.lineIds.filter((id) => !claimedLineIds.has(id)),
    },
    units,
  }
}

/** Hat kümesinin toplam boyu (cm) — onay penceresi bunu metreye çevirip yazar. */
export function getTotalLineLengthCm(
  lines: readonly InstallationLine[],
  lineIds: readonly Id[],
): number {
  const wanted = new Set(lineIds)
  return lines.reduce(
    (totalCm, line) =>
      wanted.has(line.id)
        ? totalCm + getLineLengthCm(line.points.map((point) => point.position))
        : totalCm,
    0,
  )
}
