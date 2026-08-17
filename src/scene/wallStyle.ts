/**
 * Duvarın ekranda inebileceği en ince değer (px). Altına düşünce duvar YOK
 * OLUYORDU: kapsül `alphaToCoverage` ile yumuşatılıyor ve çizgi bir-iki pikselken
 * bandın tamamı "kenar" sayılıyor — örtme maskesi seyrekleşince duvar yer yer
 * siliniyor, kamera oynadıkça titriyordu.
 *
 * Boru tarafındaki `MIN_LINE_WIDTH_PX` ile aynı değer (plumbing/scene/lineStyle.ts):
 * aynı ekranda duvar ile hattın alt sınırı farklı olsaydı, uzaklaşınca biri
 * kaybolup diğeri kalırdı.
 */
const MIN_WALL_WIDTH_PX = 3

/**
 * Duvar kalınlığı EKRAN PİKSELİ cinsinden verilir, dünya birimi (`worldUnits`)
 * cinsinden DEĞİL — boruda daha önce kararlaştırılan yolun aynısı
 * (plumbing/scene/lineStyle.ts).
 *
 * Sebep: `worldUnits` shader'ı göz ışınının bir noktadan çıktığını varsayıyor
 * (perspektif). Kameramız ortografik, ışınlar paralel ve kamera 100.000 cm
 * yukarıda; fragment hesabı bu büyüklükte float32 hassasiyetini yiyor ve duvar
 * ekran KENARLARINA doğru inceliyordu. Piksel yolunda shader ekran uzayında
 * çalışır (küçük sayılar, ışın varsayımı yok), kalınlığı biz `kalınlık × zoom`
 * ile veririz — görünen boyut aynı, hata yok.
 *
 * Kapsül biçimi KAYBOLMAZ: `worldUnits`siz yolda da uçlar yuvarlak, yalnız
 * yuvarlaklık ekran uzayında hesaplanır. Ortografik tepeden bakışta ekran uzayı
 * dünyanın düzgün ölçeklenmişi olduğu için kavşaklar yine kendiliğinden dolar (K23).
 */
export function getWallLineWidthPx(thicknessCm: number, zoom: number): number {
  return Math.max(thicknessCm * zoom, MIN_WALL_WIDTH_PX)
}
