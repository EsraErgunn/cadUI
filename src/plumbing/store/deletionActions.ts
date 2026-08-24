import { usePlumbingUiStore } from './plumbingUiStore'
import type { Id } from '../../core/model'
import { useCadStore } from '../../store/cadStore'
import { mergeElementIds } from '../core/elementSelection'
import type {
  InstallationConnection,
  InstallationElement,
  InstallationLine,
} from '../core/installationModel'
import {
  collectAdjacentInstallation,
  collectServiceBoxInstallation,
} from '../core/installationReachability'
import { collectMeterDownstreamInstallation } from '../core/meterReport'
import { getTotalLineLengthCm, partitionInstallation } from '../core/networkPartition'

/**
 * Seçim silme: klavye (Delete/Backspace, `useSelectionTool.ts`) ve panel "Sil"
 * düğmesi (`PlumbingPropertyPanel.tsx`) BURADAN geçer — tek karar noktası,
 * yoksa biri kaskad kontrolünü unuturdu.
 *
 * Seçimde servis kutusu VEYA sayaç VARSA silme hemen uygulanmaz:
 * - Servis kutusu proje başına TEKTİR ve tüm gaz tesisatının köküdür
 *   (lineSeed.ts) — silinince geride köksüz bir ağ (borular, armatürler,
 *   cihazlar) kalırdı.
 * - Sayaç kendi dalının TEK girişidir — silinince ÇIKIŞINDAN erişilen boru/
 *   armatür/cihaz ağı da köksüz kalırdı (komşu dairenin sayacına geçilmez,
 *   bkz. `core/meterReport.ts` → `collectMeterDownstreamInstallation`).
 *
 * İkisi için de onay diyaloğu (`CascadeDeleteDialog`) istenir; kullanıcı
 * onaylayınca TÜM ağ (`core/installationReachability.ts` /
 * `core/meterReport.ts`) TEK adımda gider. Ağ kat bağlantısıyla (`floorPipeLinks`,
 * kolon devamı) BAŞKA katlara uzanıyorsa oradaki devam boruları da KAPSAMA
 * girer (kullanıcı isteği, 2026-08) — kaynağı gidince o uç köksüz kalırdı.
 */
export function requestSelectionDeletion(elementIds: readonly Id[], lineIds: readonly Id[]): void {
  if (elementIds.length === 0 && lineIds.length === 0) return

  const cad = useCadStore.getState()

  const serviceBoxId = elementIds.find(
    (id) => cad.installationElements.find((element) => element.id === id)?.type === 'serviceBox',
  )
  if (serviceBoxId !== undefined) {
    const network = collectServiceBoxInstallation(
      cad.installationElements,
      cad.installationLines,
      cad.installationConnections,
      cad.floorPipeLinks,
      serviceBoxId,
    )
    usePlumbingUiStore.getState().requestCascadeDeletion({
      kind: 'serviceBox',
      elementIds: mergeElementIds(network.elementIds, elementIds),
      lineIds: mergeElementIds(network.lineIds, lineIds),
      floorIds: network.floorIds,
    })
    return
  }

  const meterId = elementIds.find(
    (id) => cad.installationElements.find((element) => element.id === id)?.type === 'gasMeter',
  )
  if (meterId !== undefined) {
    const network = collectMeterDownstreamInstallation(
      meterId,
      cad.installationElements,
      cad.installationLines,
      cad.installationConnections,
      cad.floorPipeLinks,
    )
    usePlumbingUiStore.getState().requestCascadeDeletion({
      kind: 'gasMeter',
      elementIds: mergeElementIds(network.elementIds, elementIds),
      lineIds: mergeElementIds(network.lineIds, lineIds),
      floorIds: network.floorIds,
    })
    return
  }

  // Ardışık silme (kullanıcı isteği, 2026-08): silinenlere BAĞLI olan parçalar
  // seçili kalır, böylece Delete'e basmayı sürdürmek zinciri ucundan söker.
  // Grafik silmeden ÖNCE okunur — sonrasında bağı kuran kayıtlar gitmiş olur.
  const linesBefore = cad.installationLines
  const connectionsBefore = cad.installationConnections
  const elementIdsBefore = cad.installationElements.map((element) => element.id)

  cad.removeSelection(elementIds, lineIds)

  selectSurvivingNeighbors(linesBefore, connectionsBefore, elementIdsBefore)
}

/**
 * Silme bitince, GİDENLERE komşu olup sağ kalanları seçer.
 *
 * Tohum İSTENEN seçim değil GERÇEKTEN silinen küme: `applyRemoval` fazlasını da
 * götürüyor (cihazın kolu ve bacası, hattın armatürleri, kolun refakatçi vanası).
 * İstenen seçimden yürünseydi cihaz silmede zincir hemen dururdu — cihazın tek
 * komşusu çoğu zaman kendi koludur, o da cihazla birlikte gittiği için geriye
 * seçilecek bir şey kalmazdı (kullanıcı bulgusu).
 */
function selectSurvivingNeighbors(
  linesBefore: readonly InstallationLine[],
  connectionsBefore: readonly InstallationConnection[],
  elementIdsBefore: readonly Id[],
): void {
  const ui = usePlumbingUiStore.getState()
  const cad = useCadStore.getState()

  const survivingElementIds = new Set(cad.installationElements.map((element) => element.id))
  const survivingLineIds = new Set(cad.installationLines.map((line) => line.id))

  const removedElementIds = elementIdsBefore.filter((id) => !survivingElementIds.has(id))
  const removedLineIds = linesBefore
    .map((line) => line.id)
    .filter((id) => !survivingLineIds.has(id))

  const adjacent = collectAdjacentInstallation(
    linesBefore,
    connectionsBefore,
    removedElementIds,
    removedLineIds,
  )

  const nextElementIds = adjacent.elementIds.filter((id) => survivingElementIds.has(id))
  const nextLineIds = adjacent.lineIds.filter((id) => survivingLineIds.has(id))

  if (nextElementIds.length === 0 && nextLineIds.length === 0) {
    ui.clearSelection()
    return
  }

  ui.setSelectedElements(nextElementIds)
  ui.setSelectedLines(nextLineIds)
}

/**
 * "Kolon Hattını Sil" — servis kutusundan sayaçlara kadar olan gövdeyi
 * (kolon + branşman + üstlerindeki armatürler) siler.
 *
 * ⚠️ Kapsam DAİMA TÜM KATLAR, kullanıcıya kat seçimi sorulmaz: kolon hattı
 * düşeydir, katlar arasında sürer — tek katta kesmek hattı ortasından
 * koparıp yarısını geride bırakırdı (şartname şartı).
 *
 * Sayaçlar ve bağımsız bölüm içi tesisat KALIR, uçları serbest kalır. Bu,
 * "cihaza bağlanmamış uç" uyarısı üretir ama çalışmayı engellemez (ürün
 * kuralı) — kullanıcı kolonu yeniden çizip bağlayacaktır.
 */
export function requestRiserDeletion(): void {
  const cad = useCadStore.getState()
  const partition = partitionInstallation(cad)
  const { elementIds, lineIds } = partition.trunk
  if (elementIds.length === 0 && lineIds.length === 0) return

  usePlumbingUiStore.getState().requestCascadeDeletion({
    kind: 'riserNetwork',
    elementIds,
    lineIds,
    floorIds: collectFloorIds(cad.installationLines, lineIds),
    summary: { totalLengthCm: getTotalLineLengthCm(cad.installationLines, lineIds) },
  })
}

/**
 * "Daire İçi Tesisatları Sil" — sayaçların ÇIKIŞINDAN sonraki hatları,
 * armatürleri ve cihazları siler. Kolon, branşman ve sayaçlar korunur.
 *
 * Kapsam AKTİF KAT (kullanıcı kararı): toplu işlem, kullanıcı istemeden başka
 * katlara dokunmaz. Kat SAYACIN katıdır — bir dairenin tesisatı kat
 * bağlantısıyla üst kata taşıyorsa (dubleks) o parça da gider, çünkü sayacı
 * bu kattadır ve tek başına bırakılamaz.
 */
export function requestUnitInstallationsDeletion(floorId: Id): void {
  const cad = useCadStore.getState()
  const partition = partitionInstallation(cad)

  const unitsOnFloor = partition.units.filter((unit) => {
    const meter = cad.installationElements.find(
      (element) => element.id === unit.boundaryElementId,
    )
    return meter?.floorId === floorId
  })

  const elementIds = unitsOnFloor.flatMap((unit) => unit.elementIds)
  const lineIds = unitsOnFloor.flatMap((unit) => unit.lineIds)
  if (elementIds.length === 0 && lineIds.length === 0) return

  usePlumbingUiStore.getState().requestCascadeDeletion({
    kind: 'unitInstallations',
    elementIds,
    lineIds,
    floorIds: collectFloorIds(cad.installationLines, lineIds),
    summary: {
      unitBreakdown: unitsOnFloor
        .filter((unit) => unit.elementIds.length > 0 || unit.lineIds.length > 0)
        .map((unit) => ({
          label: getUnitLabel(cad.installationElements, unit.boundaryElementId),
          elementCount: unit.elementIds.length,
          lineCount: unit.lineIds.length,
        })),
    },
  })
}

/** Kapsamın gerçekten dokunduğu katlar — diyalog "başka kata yayılıyor" uyarısını buradan verir. */
function collectFloorIds(lines: readonly InstallationLine[], lineIds: readonly Id[]): Id[] {
  const wanted = new Set(lineIds)
  return [...new Set(lines.filter((line) => wanted.has(line.id)).map((line) => line.floorId))]
}

/**
 * Bağımsız bölümün kullanıcıya görünen adı: birim no, yoksa abone adı, o da
 * yoksa genel etiket. Sayaç alanları OPSİYONEL (eski kayıtlarda hiç yok), bu
 * yüzden üç kademeli.
 */
function getUnitLabel(elements: readonly InstallationElement[], meterId: Id): string {
  const meter = elements.find((element) => element.id === meterId)
  const unitNumber = meter?.gasMeter?.unitNumber?.trim()
  if (unitNumber) return `Birim ${unitNumber}`

  const subscriberName = meter?.gasMeter?.subscriberName?.trim()
  return subscriberName || 'Bağımsız bölüm'
}
