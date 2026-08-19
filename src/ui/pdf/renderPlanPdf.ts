import { jsPDF } from 'jspdf'
import { svg2pdf } from 'svg2pdf.js'

import { embedPdfFont, PDF_FONT_FAMILY } from './planPdfFont'
import { loadPdfLogo } from './planPdfLogo'
import { layoutCoverPage, type CoverPageInfo } from '../../core/pdf/coverPage'
import {
  fitPlanToPage,
  getDrawableArea,
  getPageSizePt,
  planPointToPage,
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

export type RenderPlanPdfInput = {
  /** Kat planı sayfaları, çıktı sırasıyla. */
  pages: readonly PlanSvg[]
  paper: PaperSizeId
  orientation: Orientation
  scale: PdfScaleId
  /** Kapak sayfası; istenmediyse `undefined`. Belgenin İLK sayfası olur. */
  cover: CoverPageInfo | undefined
  /** Vaziyet planı sayfası; istenmediyse `undefined`. Kapaktan sonra gelir. */
  sitePlan: SitePlanSvg | undefined
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
 * SAYFA SIRASI: kapak → vaziyet planı → kat planları. Katların sırasını çağıran
 * belirler (`pages`) ve o sıra ZEMİNDEN YUKARI çıkar — belge binayı aşağıdan
 * yukarı gezer, çünkü tesisat da servis kutusundan yukarı doğru okunur.
 *
 * Boş kat da basılır: sayfası boş çıkar ama SAYFASI çıkar — yoksa çıktıdaki
 * kat sayısı seçilenden az olur ve hangisinin boş olduğu anlaşılmaz.
 *
 * Sayfalarda ANTET YOK: künyeyi kapak taşıyor, kat planı yalnız çizim.
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

  for (const svg of input.pages) {
    startPage()

    const fit = fitPlanToPage(svg.bounds, area, input.scale)

    if (svg.bounds) {
      // Çizimin sol-ALT köşesi; svg2pdf sol-ÜST bekliyor, yükseklik kadar yukarı alınıyor.
      const bottomLeft = planPointToPage(
        { x: svg.bounds.minX, y: svg.bounds.minY },
        fit.transform,
      )

      await svg2pdf(parseSvg(svg.markup), doc, {
        x: bottomLeft.xPt,
        y: toJsPdfY(bottomLeft.yPt + fit.drawingHeightPt, pageSize.heightPt),
        width: fit.drawingWidthPt,
        height: fit.drawingHeightPt,
      })
    }
  }

  return doc.output('blob')
}

/**
 * Ölçeksiz bir SVG'yi çizim alanına sığdırır ve ORTALAR.
 *
 * Kat planında ölçek kutsaldır ve sığdırma yapılmaz (`paper.ts`); vaziyet planı
 * ise şematiktir, cetvelle ölçülmez — bu yüzden burada oranı bozmadan
 * küçültmek meşru. İki yolun ayrı durmasının sebebi tam da bu ayrım.
 */
async function drawFittedSvg(
  doc: jsPDF,
  pageSize: PageSizePt,
  area: PageArea,
  svg: SitePlanSvg,
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

