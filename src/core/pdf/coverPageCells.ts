import type { PageArea } from './paper'

const LABEL_SIZE_PT = 7.5
const VALUE_SIZE_PT = 11
const SECTION_SIZE_PT = 13
const STAMP_LINE_SIZE_PT = 10

export const CELL_PADDING_PT = 5
/** Etiketin hücre üstünden, değerin etiketten uzaklığı. */
const LABEL_OFFSET_PT = 10
const VALUE_OFFSET_PT = 24
/** Başlık altı çizgisinin etiketin taban çizgisinden uzaklığı. */
const UNDERLINE_GAP_PT = 5

export type CoverRect = {
  xPt: number
  yPt: number
  widthPt: number
  heightPt: number
}

export type CoverText = {
  xPt: number
  yPt: number
  sizePt: number
  text: string
  align: 'left' | 'center' | 'right'
}

export type CoverLine = { x1Pt: number; y1Pt: number; x2Pt: number; y2Pt: number }

/**
 * Bir karakterin ortalama genişliği, punto başına. Roboto'nun karışık büyük-küçük
 * metinde ölçülen değerine yakın, biraz CÖMERT tarafta.
 *
 * Gerçek genişlik ancak fontu okuyarak bilinir ve `core/` fontu göremez (DOM
 * yok, jsPDF yok). Kaba tahmin burada YETERLİ çünkü tek işi taşmayı önlemek:
 * fazla cömert olması metni gereksiz küçültür, cimri olması taşmaya izin verir —
 * ikisinden ilki daha az zarar veriyor.
 */
const CHAR_WIDTH_PER_PT = 0.55
/** Değer bu puntonun altına inmez; inecekse metin kısaltılır. */
const MIN_VALUE_SIZE_PT = 7

function estimateWidthPt(text: string, sizePt: number): number {
  return text.length * sizePt * CHAR_WIDTH_PER_PT
}

/**
 * Metni hücre genişliğine sığdırır: önce puntoyu küçültür, yetmezse kısaltır.
 *
 * ⚠️ Kapakta satır kaydırma YOK. Hücre yükseklikleri sabit ve tabloya iki satır
 * sığmıyor; taşan bir ünvan ya da adres komşu hücrenin üstüne binerdi (ölçüldü).
 * Kısaltma bilgi kaybı ama sessiz değil: sonundaki "…" değerin devamı olduğunu
 * söylüyor.
 */
export function fitTextToWidth(
  text: string,
  maxWidthPt: number,
  sizePt: number,
): { text: string; sizePt: number } {
  if (text === '' || estimateWidthPt(text, sizePt) <= maxWidthPt) return { text, sizePt }

  // Metnin tamamını taşırmadan yazabilecek punto.
  const idealSizePt = maxWidthPt / (text.length * CHAR_WIDTH_PER_PT)
  if (idealSizePt >= MIN_VALUE_SIZE_PT) return { text, sizePt: idealSizePt }

  // ⚠️ Kısaltma YALNIZ küçültme yetmediğinde. Önce iki adım da uygulanıyordu ve
  // tam sınırdaki metinler yuvarlama yüzünden hem küçültülüp hem kırpılıyordu
  // (ölçüldü: sığan bir vergi numarası "…" ile kesiliyordu).
  const maxChars = Math.floor(maxWidthPt / (MIN_VALUE_SIZE_PT * CHAR_WIDTH_PER_PT))
  return {
    text: `${text.slice(0, Math.max(maxChars - 1, 1))}…`,
    sizePt: MIN_VALUE_SIZE_PT,
  }
}

/** Bir kutu ve içine çizilecekler; kapak yerleşimi bunları biriktirerek kuruluyor. */
export type CoverPart = { rect: CoverRect; texts: CoverText[]; lines: CoverLine[] }

export type CoverField = {
  label: string
  value: string
  /**
   * Etiket puntosu. Künye hücrelerinde etiket küçük olmalı — asıl bilgi
   * ALTINDAKİ değer. Onay kutularında ise etiketin KENDİSİ başlıktır (altına
   * kaşe basılacak, yazılacak değer yok), o yüzden onlar büyük punto geçer.
   */
  labelSizePt?: number
  /** Etiketin altına çizgi; onun bir BAŞLIK olduğunu söyler. */
  hasUnderline?: boolean
  /**
   * Hücrenin SAĞ ALTINA alt alta yazılanlar. Kaşe kutusunda imzalayanın adı ve
   * firmasının ünvanı buraya gelir — kaşe için ORTASI boş kalsın diye köşeye
   * itiliyor.
   */
  stampLines?: readonly string[]
}

/**
 * Bir hücre: çerçevesi, sol üstte etiketi, altında değeri.
 * Değer boşsa YALNIZ etiket yazılır — çerçeve yine çizilir.
 */
export function coverCell(rect: CoverRect, field: CoverField): CoverPart {
  const leftPt = rect.xPt + CELL_PADDING_PT
  const rightPt = rect.xPt + rect.widthPt - CELL_PADDING_PT
  const topPt = rect.yPt + rect.heightPt
  const labelSizePt = field.labelSizePt ?? LABEL_SIZE_PT
  // Büyük etiket kutunun üst kenarına yapışmasın: iniş punto ile ölçekleniyor.
  const labelYPt = topPt - LABEL_OFFSET_PT * (labelSizePt / LABEL_SIZE_PT)

  const innerWidthPt = rect.widthPt - CELL_PADDING_PT * 2
  const label = fitTextToWidth(field.label, innerWidthPt, labelSizePt)

  const texts: CoverText[] = [
    { xPt: leftPt, yPt: labelYPt, sizePt: label.sizePt, text: label.text, align: 'left' },
  ]
  const lines: CoverLine[] = []

  if (field.hasUnderline === true) {
    lines.push({
      x1Pt: leftPt,
      y1Pt: labelYPt - UNDERLINE_GAP_PT,
      x2Pt: rightPt,
      y2Pt: labelYPt - UNDERLINE_GAP_PT,
    })
  }

  if (field.value !== '') {
    const value = fitTextToWidth(field.value, innerWidthPt, VALUE_SIZE_PT)
    texts.push({
      xPt: leftPt,
      yPt: topPt - VALUE_OFFSET_PT,
      sizePt: value.sizePt,
      text: value.text,
      align: 'left',
    })
  }

  // Kaşe satırları aşağıdan yukarı diziliyor: sonuncusu en alta oturuyor.
  const stampLines = field.stampLines ?? []
  for (const [index, line] of [...stampLines].reverse().entries()) {
    const fitted = fitTextToWidth(line, innerWidthPt, STAMP_LINE_SIZE_PT)
    texts.push({
      xPt: rightPt,
      yPt: rect.yPt + CELL_PADDING_PT + STAMP_LINE_SIZE_PT * 1.35 * index,
      sizePt: fitted.sizePt,
      text: fitted.text,
      align: 'right',
    })
  }

  return { rect, texts, lines }
}

/** Bandı eşit genişlikte hücrelere böler. */
export function coverFieldRow(
  area: PageArea,
  topPt: number,
  heightPt: number,
  fields: readonly CoverField[],
): CoverPart[] {
  return coverFieldRowIn({ xPt: area.xPt, widthPt: area.widthPt }, topPt, heightPt, fields)
}

/** Verilen yatay aralığı eşit hücrelere böler; iki sütunlu bölümler bunu kullanır. */
export function coverFieldRowIn(
  span: { xPt: number; widthPt: number },
  topPt: number,
  heightPt: number,
  fields: readonly CoverField[],
): CoverPart[] {
  const cellWidthPt = span.widthPt / fields.length
  return fields.map((field, index) =>
    coverCell(
      { xPt: span.xPt + cellWidthPt * index, yPt: topPt - heightPt, widthPt: cellWidthPt, heightPt },
      field,
    ),
  )
}

/**
 * Ortalanmış bölüm başlığı şeridi.
 *
 * Zemini BEYAZ: dolgulu denendi ve kâğıtta ağır durdu. Başlık olduğunu punto
 * farkı söylüyor (künye etiketlerinin neredeyse iki katı) — gömülü fontta kalın
 * yüz olmadığı için vurgu zaten boyuttan geliyor.
 */
export function coverSectionBand(rect: CoverRect, title: string): CoverPart {
  return {
    rect,
    texts: [
      {
        xPt: rect.xPt + rect.widthPt / 2,
        yPt: rect.yPt + rect.heightPt / 2 - SECTION_SIZE_PT * 0.35,
        sizePt: SECTION_SIZE_PT,
        text: title,
        align: 'center',
      },
    ],
    lines: [],
  }
}
