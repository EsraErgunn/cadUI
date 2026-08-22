import {
  CELL_PADDING_PT,
  coverCell,
  coverFieldRow,
  coverFieldRowIn,
  coverSectionBand,
  type CoverLine,
  type CoverPart,
  type CoverRect,
  type CoverText,
} from './coverPageCells'
import { getCoverFields, type CoverPageInfo } from './coverPageFields'
import { getDrawableArea, type PageSizePt } from './paper'

export type { CoverPageInfo }

/** Onay kutularının başlığı; künye etiketlerinden BÜYÜK. */
const APPROVAL_LABEL_SIZE_PT = 12

/** Bant yükseklikleri (punto); `getBandHeights` bunları ölçekliyor. */
const LOGO_HEIGHT_PT = 90
const SECTION_HEIGHT_PT = 22
const FIELD_ROW_HEIGHT_PT = 34
const FOOTER_HEIGHT_PT = 34
/** Kaşe bandının en az yüksekliği; kaşe + imza için gereken yer. */
const MIN_APPROVAL_HEIGHT_PT = 150
/**
 * Hücreler bu katsayıdan fazla uzamaz. Kâğıt büyüdükçe satırları da büyütmek
 * 11 puntoluk yazıyı kocaman boşluğun içinde yüzdürüyordu; artan yer KAŞE
 * bandına gidiyor — zaten elle doldurulacak, esnemesi doğal olan tek yer o.
 */
const MAX_BAND_SCALE = 1.3

/**
 * Sayfa ÜÇ dikdörtgen: (1) logo + kaşe/onay, (2) tesisat özeti + bina künyesi,
 * (3) tasarımcı/firma + pafta künyesi. Aralarında ince bir beyaz şerit var.
 *
 * DIŞ ÇERÇEVE YOK — olsaydı boşluklar çerçevenin içinde kalan gri şeritlere
 * dönerdi ve üç blok tek tablonun parçası gibi görünürdü. Boşluğun sağı solu da
 * beyaz kalsın diye sayfa kenarına kutu çizilmiyor.
 */
const GROUP_GAP_PT = 7
/** Üç dikdörtgen arasında iki boşluk. */
const GROUP_GAP_COUNT = 2

export type CoverPageLayout = {
  /** Çizilecek çerçeveler; dış çerçeve dahil. */
  rects: readonly CoverRect[]
  texts: readonly CoverText[]
  /** Başlık altı çizgileri. */
  lines: readonly CoverLine[]
  /** Logonun oturacağı kutu. Görsel yoksa çağıran buraya yazıyla düşer. */
  logo: CoverRect
}

/** `tr-TR` biçimi: gün.ay.yıl. Intl yerine elle — core'da locale'e bağlanmıyoruz. */
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}.${month}.${date.getFullYear()}`
}


type BandHeights = {
  logoPt: number
  approvalPt: number
  sectionPt: number
  fieldRowPt: number
  footerPt: number
}

/**
 * Bantları yerleştirir: sabit bantlar bir katsayıyla ölçeklenir, KALAN kaşe
 * bandına gider ve sayfa tam dolar.
 *
 * Katsayı iki yönden sınırlı. Üstten `MAX_BAND_SCALE`: büyük kâğıtta hücreleri
 * de büyütmek yazıyı boşlukta yüzdürüyordu. Alttan kaşe bandının en azı: küçük
 * kâğıtta kalan yer kaşeye yetmezse hücreler kısılır.
 */
function getBandHeights(
  areaHeightPt: number,
  sectionCount: number,
  fieldRowCount: number,
): BandHeights {
  // Öbek araları çizime girmiyor: önce düşülüyor, kalanı bantlar paylaşıyor.
  const contentHeightPt = areaHeightPt - GROUP_GAP_PT * GROUP_GAP_COUNT
  const fixedPt =
    LOGO_HEIGHT_PT +
    SECTION_HEIGHT_PT * sectionCount +
    FIELD_ROW_HEIGHT_PT * fieldRowCount +
    FOOTER_HEIGHT_PT

  const scale = Math.max(
    Math.min((contentHeightPt - MIN_APPROVAL_HEIGHT_PT) / fixedPt, MAX_BAND_SCALE),
    0,
  )

  return {
    logoPt: LOGO_HEIGHT_PT * scale,
    approvalPt: contentHeightPt - fixedPt * scale,
    sectionPt: SECTION_HEIGHT_PT * scale,
    fieldRowPt: FIELD_ROW_HEIGHT_PT * scale,
    footerPt: FOOTER_HEIGHT_PT * scale,
  }
}

/**
 * Kapak sayfasının YERLEŞİMİ: çizmez, KONUM üretir — punto cinsinden ve sol-ALT
 * köşe başlangıçlı. Çizme işi jsPDF katmanının; burası saf kalıyor (core'da DOM
 * yok, bkz. CLAUDE.md kural 1).
 *
 * Sayfa, gaz dağıtım şirketlerinin onay paftalarındaki kapak düzeninin
 * sadeleştirilmiş hâli: üstte logo, altında iki onay kutusu (solda projeyi
 * çizenin kaşesi, sağda dağıtım şirketinin onayı), sonra künye tabloları.
 *
 * ⚠️ Kutular DEĞERİ OLMASA DA çizilir. Kapak resmi bir belge: boş bırakılan
 * hücre elle doldurulur ya da "bu bilgi yok" der. Değeri olmayan satırı gizlemek
 * sayfayı her projede farklı yükseklikte gösterirdi.
 */
export function layoutCoverPage(pageSize: PageSizePt, info: CoverPageInfo): CoverPageLayout {
  const area = getDrawableArea(pageSize)

  const rects: CoverRect[] = []
  const texts: CoverText[] = []
  const lines: CoverLine[] = []

  const push = (part: CoverPart) => {
    rects.push(part.rect)
    texts.push(...part.texts)
    lines.push(...part.lines)
  }

  const {
    installationFields,
    buildingFields,
    designerFields,
    firmFields,
    designerStampLines,
    gasFirmStampLines,
  } = getCoverFields(info)

  // Künye satırları önce TANIMLANIYOR, sonra çiziliyor: bant yükseklikleri kaç
  // satır olduğunu bilmek zorunda. İki bölüm başlığı bandı var: BİNANIN ve
  // (PROJE TASARIMCISININ | FİRMANIN) yan yana.
  const band = getBandHeights(
    area.heightPt,
    2,
    installationFields.length + buildingFields.length + designerFields.length,
  )

  // Bantlar ÜSTTEN aşağı diziliyor ama PDF y ekseni yukarı büyüyor: imleç
  // sayfanın tepesinden başlayıp her bantta aşağı iniyor.
  let cursorPt = area.yPt + area.heightPt

  // 1. Logo bandı. Marka görseli zaten "StarCAD" YAZIYOR: altına bir de uygulama
  // adını basmak aynı şeyi iki kez söylerdi.
  const logoBand: CoverRect = {
    xPt: area.xPt,
    yPt: cursorPt - band.logoPt,
    widthPt: area.widthPt,
    heightPt: band.logoPt,
  }
  rects.push(logoBand)
  const logo: CoverRect = {
    xPt: logoBand.xPt + CELL_PADDING_PT,
    yPt: logoBand.yPt + CELL_PADDING_PT,
    widthPt: logoBand.widthPt - CELL_PADDING_PT * 2,
    heightPt: logoBand.heightPt - CELL_PADDING_PT * 2,
  }
  cursorPt -= band.logoPt

  // 2. Onay bandı: solda çizenin kaşesi, sağda dağıtım şirketinin onayı.
  // İkisinin de ORTASI boş (kaşe oraya basılacak), künye sağ alt köşeye iniyor.
  // Sütunlar EŞİT: kaşe/onay kutuları da tasarımcı/firma bloğu da yarı yarıya,
  // böylece sayfanın ortasındaki dikey çizgi baştan sona hizalı kalıyor.
  const designerWidthPt = area.widthPt / 2
  push(
    coverCell(
      {
        xPt: area.xPt,
        yPt: cursorPt - band.approvalPt,
        widthPt: designerWidthPt,
        heightPt: band.approvalPt,
      },
      {
        label: 'PROJE TASARIMCISININ KAŞE VE ONAYI',
        value: '',
        labelSizePt: APPROVAL_LABEL_SIZE_PT,
        hasUnderline: true,
        stampLines: designerStampLines,
      },
    ),
  )
  push(
    coverCell(
      {
        xPt: area.xPt + designerWidthPt,
        yPt: cursorPt - band.approvalPt,
        widthPt: area.widthPt - designerWidthPt,
        heightPt: band.approvalPt,
      },
      {
        label: 'GAZ DAĞITIM ŞİRKETİNİN ONAYI',
        value: '',
        labelSizePt: APPROVAL_LABEL_SIZE_PT,
        hasUnderline: true,
        stampLines: gasFirmStampLines,
      },
    ),
  )
  cursorPt -= band.approvalPt + GROUP_GAP_PT

  // 3. Tesisat özeti ve bina künyesi TEK ÖBEK. Tesisat satırı BAŞLIKSIZ:
  // tek satır, kendi bölümünü açacak kadar dolu değil.
  for (const fields of installationFields) {
    for (const part of coverFieldRow(area, cursorPt, band.fieldRowPt, fields)) push(part)
    cursorPt -= band.fieldRowPt
  }

  // 4. Bina künyesi.
  push(
    coverSectionBand(
      {
        xPt: area.xPt,
        yPt: cursorPt - band.sectionPt,
        widthPt: area.widthPt,
        heightPt: band.sectionPt,
      },
      'BİNANIN',
    ),
  )
  cursorPt -= band.sectionPt

  for (const fields of buildingFields) {
    for (const part of coverFieldRow(area, cursorPt, band.fieldRowPt, fields)) push(part)
    cursorPt -= band.fieldRowPt
  }
  cursorPt -= GROUP_GAP_PT

  // 5. Tasarımcı ve firma künyesi: İKİ SÜTUN, iki ayrı başlık. Tek başlık
  // altında birleştirilseydi hangi alanın kişiye, hangisinin firmaya ait olduğu
  // okunmazdı — referans paftada da ayrı duruyorlar.
  const designerSpan = { xPt: area.xPt, widthPt: designerWidthPt }
  const firmSpan = { xPt: area.xPt + designerWidthPt, widthPt: area.widthPt - designerWidthPt }

  push(
    coverSectionBand(
      { ...designerSpan, yPt: cursorPt - band.sectionPt, heightPt: band.sectionPt },
      'PROJE TASARIMCISININ',
    ),
  )
  push(
    coverSectionBand(
      { ...firmSpan, yPt: cursorPt - band.sectionPt, heightPt: band.sectionPt },
      'FİRMANIN',
    ),
  )
  cursorPt -= band.sectionPt

  for (const [index, fields] of designerFields.entries()) {
    for (const part of coverFieldRowIn(designerSpan, cursorPt, band.fieldRowPt, fields)) push(part)
    for (const part of coverFieldRowIn(firmSpan, cursorPt, band.fieldRowPt, firmFields[index])) {
      push(part)
    }
    cursorPt -= band.fieldRowPt
  }

  // 6. Alt şerit: paftanın kendi künyesi. Üçüncü dikdörtgenin son satırı —
  // ayrı bir blok değil, tasarımcı/firma bloğuyla birlikte okunuyor.
  for (const part of coverFieldRow(area, cursorPt, band.footerPt, [
    { label: 'PROJE ADI', value: info.projectName },
    { label: 'PROJE NO', value: info.projectNumber },
    { label: 'ÖLÇEK', value: info.scale },
    { label: 'TARİH', value: formatDate(info.printedAt) },
  ])) {
    push(part)
  }

  return { rects, texts, lines, logo }
}

