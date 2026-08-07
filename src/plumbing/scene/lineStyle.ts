import { PIPE_TYPES, type PipeTypeName } from '../core/pipeTypes'

/**
 * Uzaklaşınca hat kıl gibi incelmesin: ekrandaki kalınlık bu değerin altına
 * inmez. Yakınlaşınca çizgi gerçek boru kalınlığına döner, yani plan fiziksel
 * olarak doğru okunur.
 */
const MIN_LINE_WIDTH_PX = 3

/**
 * Çizgi kalınlığı EKRAN PİKSELİ cinsinden verilir, dünya birimi (`worldUnits`)
 * cinsinden DEĞİL. Sebep bir tuzak: `worldUnits` shader'ı göz ışınının bir
 * noktadan çıktığını varsayıyor (perspektif). Kameramız ortografik, ışınlar
 * paralel ve kamera 100.000 cm yukarıda; fragment hesabı bu büyüklükte float32
 * hassasiyetini yiyor. Sonuç: hat ekran KENARLARINA doğru inceliyordu. Duvarda
 * (20 cm) görünmüyor, 3.37 cm'lik boruda görünüyor.
 *
 * Piksel yolunda shader ekran uzayında çalışır (küçük sayılar, ışın varsayımı
 * yok) ve kalınlığı biz `çap × zoom` ile veririz — görünen boyut aynı, hata yok.
 *
 * Yerleşmiş hat ile çizim önizlemesi AYNI fonksiyondan geçer: çizilirken ince,
 * bitince kalın görünen bir hat kullanıcıya kalınlık değişti sanısı verirdi.
 */
export function getLineWidthPx(pipeTypeName: PipeTypeName, zoom: number): number {
  return Math.max(PIPE_TYPES[pipeTypeName].outerDiameterCm * zoom, MIN_LINE_WIDTH_PX)
}

/** Uç işaretleri dünya ölçüsünde konumlanır; çizgiyle aynı kalınlığı cm'ye çevirir. */
export function toWidthCm(widthPx: number, zoom: number): number {
  return zoom > 0 ? widthPx / zoom : widthPx
}

/** Renk ÇAPTAN gelir (K-W2); katalogdaki her çapın rengi tanımlı. */
export function getLineColor(pipeTypeName: PipeTypeName): string {
  return PIPE_TYPES[pipeTypeName].colorHex
}
