import { jsPDF } from 'jspdf'
import { svg2pdf } from 'svg2pdf.js'

import { embedPdfFont, PDF_FONT_FAMILY } from './planPdfFont'
import { loadPdfLogo } from './planPdfLogo'
import { layoutCoverPage, type CoverPageInfo } from '../../core/pdf/coverPage'
import type { IsometricSvg } from '../../core/pdf/isometricSvg'
import {
  fitPlanToPage,
  getDrawableArea,
  getPageSizePt,
  mmToPoints,
  planPointToPage,
  PAGE_MARGIN_MM,
  type Orientation,
  type PageArea,
  type PageSizePt,
  type PaperSizeId,
  type PdfScaleId,
} from '../../core/pdf/paper'
import type { PlanSvg } from '../../core/pdf/planSvg'
import { buildProjectMetadataXml } from '../../core/pdf/projectPayload'
import type { SitePlanSvg } from '../../core/pdf/sitePlanSvg'

const COVER_LINE_WIDTH_PT = 0.5
const INK_RGB = [31, 41, 51] as const

/** Kat planı antetinin punto büyüklüğü; kenar boşluğu şeridine (10mm) sığacak kadar küçük. */
const FLOOR_TITLE_SIZE_PT = 10

export type PlanPage = {
  svg: PlanSvg
  /** Antet metni: "Zemin Kat Planı", "1. Kat Planı" — bkz. `core/floors.ts` `getFloorPlanTitle`. */
  title: string
}

export type RenderPlanPdfInput = {
  /** Kat planı sayfaları, çıktı sırasıyla. */
  pages: readonly PlanPage[]
  paper: PaperSizeId
  orientation: Orientation
  scale: PdfScaleId
  /** Kapak sayfası; istenmediyse `undefined`. Belgenin İLK sayfası olur. */
  cover: CoverPageInfo | undefined
  /** Vaziyet planı sayfası; istenmediyse `undefined`. Kapaktan sonra gelir. */
  sitePlan: SitePlanSvg | undefined
  /**
   * İzometrik şema; istenmediyse ya da çizilecek tesisat yoksa `undefined`.
   * EN SONDA: belge önce binayı ve katları anlatır, izometrik tesisatın
   * bütününü özetleyerek kapatır.
   */
  isometric: IsometricSvg | undefined
  /**
   * Belgeye GÖMÜLECEK proje JSON'u. Dosyayı hem pafta hem proje dosyası yapan
   * şey bu — "Proje Dosyasını Aç" sayfayı okumaz, bunu geri alır.
   */
  projectJson: string
}

/**
 * jsPDF'in y ekseni SAYFANIN ÜSTÜNDEN aşağı büyür; `core/pdf/paper.ts` ise
 * PDF biçiminin kendi sol-ALT başlangıcını kullanıyor (plan +y yukarı, kâğıt +y
 * yukarı — çevirme yok). İki dünya arasındaki tek köprü burası; çekirdek tarafı
 * matematiksel olarak doğal kalsın diye çevirme çekirdeğe TAŞINMADI.
 */
function toJsPdfY(yFromBottomPt: number, pageHeightPt: number): number {
  return pageHeightPt - yFromBottomPt
}

function parseSvg(markup: string): Element {
  const document = new DOMParser().parseFromString(markup, 'image/svg+xml')
  const parseError = document.querySelector('parsererror')
  if (parseError) throw new Error('Çizim SVG olarak üretilemedi')

  return document.documentElement
}

/**
 * Belgeyi basar ve dosyayı döndürür.
 *
 * SAYFA SIRASI: kapak → vaziyet planı → kat planları → izometrik. Katların
 * sırasını çağıran belirler (`pages`) ve o sıra ZEMİNDEN YUKARI çıkar — belge
 * binayı aşağıdan yukarı gezer, çünkü tesisat da servis kutusundan yukarı
 * doğru okunur. İzometrik EN SONDA: tesisatın bütününü özetleyerek kapatıyor.
 *
 * Boş kat da basılır: sayfası boş çıkar ama SAYFASI çıkar — yoksa çıktıdaki
 * kat sayısı seçilenden az olur ve hangisinin boş olduğu anlaşılmaz.
 *
 * Künyeyi kapak taşır, kat planı sayfasında yalnız KAT ADI antet olarak durur
 * (kenar boşluğu şeridinde, çizim alanının dışında) — hangi kata bakıldığı
 * kapak sayfasına dönmeden anlaşılsın diye.
 */
export async function renderPlanPdf(input: RenderPlanPdfInput): Promise<Blob> {
  const pageSize = getPageSizePt(input.paper, input.orientation)
  const area = getDrawableArea(pageSize)

  const doc = new jsPDF({
    unit: 'pt',
    format: [pageSize.widthPt, pageSize.heightPt],
    orientation: input.orientation === 'landscape' ? 'landscape' : 'portrait',
  })

  await embedPdfFont(doc)

  // Proje verisi XMP metadata'sına gömülüyor; sayfalardan ÖNCE yazılması gerekmiyor
  // ama burada durması "belge kurulumu" adımlarını bir arada tutuyor.
  doc.addMetadata(buildProjectMetadataXml(input.projectJson), true)

  // jsPDF ilk sayfayı KENDİSİ açıyor; sayfa eklemek ikinciden itibaren.
  let hasPage = false
  const startPage = () => {
    if (hasPage) doc.addPage([pageSize.widthPt, pageSize.heightPt], input.orientation)
    hasPage = true
  }

  if (input.cover) {
    startPage()
    await drawCoverPage(doc, pageSize, input.cover)
  }

  if (input.sitePlan) {
    startPage()
    await drawFittedSvg(doc, pageSize, area, input.sitePlan)
  }

  for (const page of input.pages) {
    startPage()
    drawFloorTitle(doc, page.title)

    const fit = fitPlanToPage(page.svg.bounds, area, input.scale)

    if (page.svg.bounds) {
      // Çizimin sol-ALT köşesi; svg2pdf sol-ÜST bekliyor, yükseklik kadar yukarı alınıyor.
      const bottomLeft = planPointToPage(
        { x: page.svg.bounds.minX, y: page.svg.bounds.minY },
        fit.transform,
      )

      await svg2pdf(parseSvg(page.svg.markup), doc, {
        x: bottomLeft.xPt,
        y: toJsPdfY(bottomLeft.yPt + fit.drawingHeightPt, pageSize.heightPt),
        width: fit.drawingWidthPt,
        height: fit.drawingHeightPt,
      })
    }
  }

  if (input.isometric) {
    startPage()
    await drawFittedSvg(doc, pageSize, area, input.isometric)
  }

  return doc.output('blob')
}

/**
 * Kat planı antetini kenar boşluğu şeridine yazar (çizim alanının DIŞI,
 * sayfanın üst kenarıyla çizim alanı arasında) — ölçekli plan bundan
 * etkilenmesin diye çizim alanının kendisi büyütülmez.
 */
function drawFloorTitle(doc: jsPDF, title: string): void {
  const marginPt = mmToPoints(PAGE_MARGIN_MM)

  doc.setFont(PDF_FONT_FAMILY, 'normal')
  doc.setFontSize(FLOOR_TITLE_SIZE_PT)
  doc.setTextColor(...INK_RGB)
  doc.text(title, marginPt, marginPt * 0.65)
}

/**
 * Ölçeksiz bir SVG'yi çizim alanına sığdırır ve ORTALAR.
 *
 * Kat planında ölçek kutsaldır ve sığdırma yapılmaz (`paper.ts`); vaziyet planı
 * ile izometrik şema ise ÖLÇEKSİZDİR — biri temsilî, ötekinde izdüşüm
 * uzunlukları kısaltıyor (gerçek boy etiketten okunur). İkisi de cetvelle
 * ölçülmediği için oranı bozmadan küçültmek meşru; iki yolun ayrı durmasının
 * sebebi tam da bu ayrım.
 */
async function drawFittedSvg(
  doc: jsPDF,
  pageSize: PageSizePt,
  area: PageArea,
  svg: SitePlanSvg | IsometricSvg,
): Promise<void> {
  const scale = Math.min(area.widthPt / svg.widthCm, area.heightPt / svg.heightCm)
  const widthPt = svg.widthCm * scale
  const heightPt = svg.heightCm * scale

  await svg2pdf(parseSvg(svg.markup), doc, {
    x: area.xPt + (area.widthPt - widthPt) / 2,
    y: toJsPdfY(area.yPt + (area.heightPt + heightPt) / 2, pageSize.heightPt),
    width: widthPt,
    height: heightPt,
  })
}

/**
 * Logo YÜKLENEMEZSE kapak yine basılır: kutuya uygulama adı yazılır. Marka
 * görseli yüzünden bütün dışa aktarmayı düşürmek orantısız olurdu (künyenin
 * uçtan gelmemesiyle aynı gerekçe, bkz. useProjectSummary).
 */
async function drawCoverLogo(
  doc: jsPDF,
  pageSize: PageSizePt,
  box: { xPt: number; yPt: number; widthPt: number; heightPt: number },
  appName: string,
): Promise<void> {
  try {
    const logo = await loadPdfLogo(box.widthPt, box.heightPt)
    // Ölçek yeniden hesaplanıyor: tuval piksel sayısına yuvarlandığı için
    // en-boy oranı binde birlik kayabilir, kutuya sığdırma buradan kesinleşir.
    const scale = Math.min(box.widthPt / logo.widthPx, box.heightPt / logo.heightPx)
    const widthPt = logo.widthPx * scale
    const heightPt = logo.heightPx * scale

    doc.addImage(
      logo.canvas,
      'PNG',
      box.xPt + (box.widthPt - widthPt) / 2,
      toJsPdfY(box.yPt + (box.heightPt + heightPt) / 2, pageSize.heightPt),
      widthPt,
      heightPt,
    )
  } catch {
    doc.setFont(PDF_FONT_FAMILY, 'normal')
    doc.setFontSize(box.heightPt * 0.5)
    doc.text(
      appName,
      box.xPt + box.widthPt / 2,
      toJsPdfY(box.yPt + box.heightPt * 0.3, pageSize.heightPt),
      { align: 'center' },
    )
  }
}

async function drawCoverPage(
  doc: jsPDF,
  pageSize: PageSizePt,
  info: CoverPageInfo,
): Promise<void> {
  const layout = layoutCoverPage(pageSize, info)

  doc.setDrawColor(...INK_RGB)
  doc.setLineWidth(COVER_LINE_WIDTH_PT)
  for (const rect of layout.rects) {
    doc.rect(
      rect.xPt,
      toJsPdfY(rect.yPt + rect.heightPt, pageSize.heightPt),
      rect.widthPt,
      rect.heightPt,
    )
  }

  // Başlık altı çizgileri hücre çerçevesinden ayrı: aynı kalemle ama kutunun
  // İÇİNDE duruyorlar.
  for (const line of layout.lines) {
    doc.line(
      line.x1Pt,
      toJsPdfY(line.y1Pt, pageSize.heightPt),
      line.x2Pt,
      toJsPdfY(line.y2Pt, pageSize.heightPt),
    )
  }

  doc.setTextColor(...INK_RGB)
  for (const text of layout.texts) {
    doc.setFont(PDF_FONT_FAMILY, 'normal')
    doc.setFontSize(text.sizePt)
    doc.text(text.text, text.xPt, toJsPdfY(text.yPt, pageSize.heightPt), {
      align: text.align,
    })
  }

  await drawCoverLogo(doc, pageSize, layout.logo, info.appName)
}

