import { useState } from 'react'

import type { ExportPdfSettings } from './ExportPdfOptions'
import { PDF_FONT_FAMILY } from './planPdfFont'
import { renderPlanPdf, type PlanPage } from './renderPlanPdf'
import { resolveElementLabel, resolveSymbolAsset } from './symbolMarkup'
import type { PlanPoint } from '../../core/coords'
import { getFloorById, getFloorPlanTitle } from '../../core/floors'
import type { Floor, Id, Point, Wall } from '../../core/model'
import type { CoverPageInfo } from '../../core/pdf/coverPage'
import { getBuildingFootprint } from '../../core/pdf/footprint'
import {
  getInstallationSummary,
  type InstallationSummaryInput,
} from '../../core/pdf/installationSummary'
import { buildIsometricSvg, type IsometricSvg } from '../../core/pdf/isometricSvg'
import { getPlanBounds } from '../../core/pdf/paper'
import { buildPlanSvg } from '../../core/pdf/planSvg'
import { buildSitePlanSvg, type SitePlanSvg } from '../../core/pdf/sitePlanSvg'
import { serializeProjectDataForBackend } from '../../core/projectExportFormat'
import { getObliqueProjection } from '../../isometric/core/isometricProjection'
import type { IsometricSceneInput } from '../../isometric/core/isometricScene'
import type { ProjectSummary } from '../../pages/useProjectSummary'
import type {
  InstallationElement,
  InstallationLine,
} from '../../plumbing/core/installationModel'
import { isDischargeKind } from '../../plumbing/core/lineKinds'
import { getLineColor } from '../../plumbing/scene/lineStyle'
import { DISCHARGE_STROKE_COLORS } from '../../plumbing/scene/plumbingTheme'
import { getSymbolMetadata } from '../../plumbing/scene/symbolLoader'
import { selectProjectData, useCadStore } from '../../store/cadStore'

/** Kapaktaki logo yazısı; uygulamanın adı tek yerde. */
const APP_NAME = 'STARCAD'

/** Dosya adına giremeyecek karakterler; Windows'un yasakladıkları da dahil. */
const UNSAFE_FILE_NAME = /[\\/:*?"<>|]/g

/**
 * Proje dosyasının adı: `<proje numarası>.starcad.pdf`.
 *
 * ⚠️ Uzantı `.pdf` KALIYOR, `.starcad` DEĞİL. Dosya gerçekten bir PDF ve
 * uzantıyı değiştirmek onu işletim sistemi için başka bir tür yapıyordu: çift
 * tıklayınca görüntüleyici açılmıyor, basmak için elle yeniden adlandırmak
 * gerekiyordu. `.starcad` bu yüzden uzantı değil ADIN PARÇASI — dosyanın
 * içinde çizim verisi de olduğunu (`core/pdf/projectPayload.ts`) söylüyor ama
 * PDF davranışını bozmuyor.
 *
 * Kat adı gibi bir ek YOK: dosya, seçilen sayfalardan bağımsız olarak PROJENİN
 * TAMAMINI taşıyor; ad da projeyi adlandırıyor.
 */
export function toProjectFileName(projectNumber: string): string {
  return `${projectNumber.replaceAll(UNSAFE_FILE_NAME, '-').trim()}.starcad.pdf`
}

function downloadBlob(fileName: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName

  // Safari, DOM'da olmayan bir bağlantının click()'ini yok sayıyor
  // (ui/downloadTextFile.ts ile aynı gerekçe).
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export type ExportPdfRequest = {
  settings: ExportPdfSettings
  /** Basılacak katlar, çıktı sırasıyla (zeminden yukarı). */
  floorIds: readonly Id[]
  project: ProjectSummary
}

export type ExportPdfState = {
  isExporting: boolean
  error: string | undefined
  exportPdf: (request: ExportPdfRequest) => Promise<boolean>
}

/**
 * Vaziyet planı kesitindeki bina genişliği: ZEMİN katın plan genişliği.
 *
 * Kesit temsilî ama oranı gerçek olsun diye ölçülüyor — dar ve yüksek bir bina
 * kâğıtta da dar görünsün. Çizimi olmayan projede `undefined` döner, kesit
 * varsayılan genişliğe düşer.
 */
function getGroundFloorWidthCm(
  floors: readonly Floor[],
  points: readonly Point[],
): number | undefined {
  const groundFloor = getGroundFloor(floors)
  if (!groundFloor) return undefined

  const bounds = getPlanBounds(points.filter((point) => point.floorId === groundFloor.id))
  if (!bounds) return undefined

  const widthCm = bounds.maxX - bounds.minX
  return widthCm > 0 ? widthCm : undefined
}

/** Vaziyet planının kuşbakışı gösterdiği kat: ilk bodrum olmayan kat. */
function getGroundFloor(floors: readonly Floor[]): Floor | undefined {
  return floors.find((floor) => !floor.isBasement) ?? floors[0]
}

/**
 * Servis kutusu KATTAN bağımsız aranıyor: bina başına tek tane var ve bodrumda
 * ya da bahçe duvarında konumlanmış olabilir — zemin kata bakmakla sınırlansaydı
 * vaziyet planında görünmezdi.
 */
function findServiceBoxPosition(
  elements: readonly InstallationElement[],
): PlanPoint | undefined {
  return elements.find((element) => element.type === 'serviceBox')?.position
}

/**
 * Kapak künyesi İKİ referanstan geliyor: künye alanları proje DETAYINDAN
 * (`useProjectSummary`), tesisat özeti ÇİZİMDEN. PDF katmanı hiçbir değer
 * uydurmuyor.
 *
 * Kat sayısında detay boşsa çizimdeki kat sayısına düşülüyor — o da bir
 * referans: kullanıcının kendi çizdiği katlar.
 */
function buildCoverInfo(
  request: ExportPdfRequest,
  source: { floors: readonly Floor[] } & InstallationSummaryInput,
): CoverPageInfo {
  const { project } = request
  return {
    appName: APP_NAME,
    projectName: project.name,
    projectNumber: project.number,
    scale: request.settings.scale,
    printedAt: new Date(),
    installation: getInstallationSummary(source),
    building: {
      ...project.building,
      floorCount:
        project.building.floorCount === ''
          ? String(source.floors.length)
          : project.building.floorCount,
    },
    designer: project.designer,
    firm: project.firm,
    approval: project.approval,
  }
}

type SitePlanSource = {
  floors: readonly Floor[]
  points: readonly Point[]
  walls: readonly Wall[]
  installationElements: readonly InstallationElement[]
}

function buildSitePlan(request: ExportPdfRequest, source: SitePlanSource): SitePlanSvg {
  const groundFloor = getGroundFloor(source.floors)

  return buildSitePlanSvg({
    floors: source.floors,
    buildingWidthCm: getGroundFloorWidthCm(source.floors, source.points),
    streetName: request.project.streetName,
    doorNumber: request.project.doorNumber,
    footprint: groundFloor
      ? getBuildingFootprint({
          points: source.points,
          walls: source.walls,
          floorId: groundFloor.id,
          serviceBox: findServiceBoxPosition(source.installationElements),
        })
      : undefined,
    fontFamily: PDF_FONT_FAMILY,
  })
}

/**
 * Hat rengi. Renk kuralı sahne katmanında; `core/` onu import edemez (kural
 * 1/2), bu yüzden geri çağrımla dışarıdan veriliyor.
 *
 * Baca/havalandırma ÇAPTAN renk almaz — gaz taşımıyorlar, kendi renkleri var
 * (ekrandaki `DischargeRunMesh` ile aynı).
 *
 * Kat planı ve izometrik sayfa AYNI fonksiyonu kullanıyor: iki kopya olsaydı
 * bir boru iki sayfada iki farklı renkte çıkabilirdi.
 */
function resolveInstallationLineColor(line: InstallationLine): string {
  return isDischargeKind(line.kind)
    ? DISCHARGE_STROKE_COLORS[line.kind]
    : getLineColor(line.pipeTypeName)
}

/**
 * İzometrik şema sayfası.
 *
 * ⚠️ Açı SABİT (`ISOMETRIC_ANGLES_PAPER`, K155), store'dan gelmiyor. Eskiden
 * kullanıcının ekranda baktığı açıyla basılıyordu; "Üstten" ön ayarındayken
 * sayfa neredeyse plan görünümüne çöküyordu. Teslim edilen pafta kamera
 * durumuna bağlı olmamalı.
 *
 * Elle ayrılmış binmeler bundan ZARAR GÖRMEZ: `isometricOffsetCm` 2B EKRAN
 * kaydırması olarak saklanıyor ve sahne onu aynı açıyla dünyaya çevirip aynı
 * açıyla geri projekte ediyor — kaydırma kâğıdın kendi düzleminde birebir aynı
 * kalıyor. Değişen tek şey hangi boruların o açıda gerçekten binişmesi.
 *
 * Tesisatı olmayan projede `undefined` döner ve sayfa HİÇ basılmaz: boş bir
 * izometrik sayfa okuyucuya bir şey söylemez. (Kat planında durum farklı, orada
 * boş sayfa "bu kat boş" bilgisini taşıyor.)
 */
function buildIsometric(source: IsometricSceneInput): IsometricSvg | undefined {
  return buildIsometricSvg({
    floors: source.floors,
    installationElements: source.installationElements,
    installationLines: source.installationLines,
    installationConnections: source.installationConnections,
    floorPipeLinks: source.floorPipeLinks,
    projection: getObliqueProjection(),
    getMetadata: getSymbolMetadata,
    resolveLineColor: resolveInstallationLineColor,
    resolveSymbol: resolveSymbolAsset,
    fontFamily: PDF_FONT_FAMILY,
  })
}

/**
 * Çizimi PDF'e basar ve indirtir.
 *
 * Store'dan okuma `getState()` ile ANLIK: dışa aktarma bir jest, abone olunacak
 * bir görüntü değil. Aboneyle yazılsaydı pencere açıkken yapılan her düzenleme
 * yeniden render tetiklerdi.
 */
export function useExportPdf(): ExportPdfState {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const exportPdf = async (request: ExportPdfRequest): Promise<boolean> => {
    setIsExporting(true)
    setError(undefined)

    try {
      const state = useCadStore.getState()
      const pages: PlanPage[] = request.floorIds.map((floorId) => {
        const svg = buildPlanSvg({
          points: state.points,
          walls: state.walls,
          openings: state.openings,
          rooms: state.rooms,
          symbols: state.symbols,
          areaObjects: state.areaObjects,
          beams: state.beams,
          texts: state.texts,
          installationLines: state.installationLines,
          installationElements: state.installationElements,
          floorId,
          fontFamily: PDF_FONT_FAMILY,
          resolveLineColor: resolveInstallationLineColor,
          resolveSymbolAsset,
          resolveElementLabel,
        })

        const floor = getFloorById(state.floors, floorId)
        return { svg, title: floor ? getFloorPlanTitle(floor) : '' }
      })

      const blob = await renderPlanPdf({
        pages,
        ...request.settings,
        // Kaydedilenle AYNI kaynak (useProjectExport ile aynı gerekçe): "indirip
        // geri açınca ne kaydettiysem onu alırım" garantisi tek yerden gelsin.
        projectJson: serializeProjectDataForBackend(selectProjectData(state)),
        // Kapak ve vaziyet planı BÜTÜN projeyi anlatır: kat seçiminden
        // etkilenmezler, kat sayısı da seçilenlerin değil binanın sayısıdır.
        cover: request.settings.isCoverVisible
          ? buildCoverInfo(request, state)
          : undefined,
        sitePlan: request.settings.isSitePlanVisible
          ? buildSitePlan(request, state)
          : undefined,
        isometric: request.settings.isIsometricVisible ? buildIsometric(state) : undefined,
      })

      downloadBlob(toProjectFileName(request.project.number), blob)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'PDF oluşturulamadı')
      return false
    } finally {
      setIsExporting(false)
    }
  }

  return { isExporting, error, exportPdf }
}
