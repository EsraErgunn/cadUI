import logoUrl from '../../assets/brand/starcad.image.png'

/**
 * Baskıda 1 punto başına düşen piksel. 3× gözle ayırt edilemeyecek kadar keskin;
 * daha fazlası yalnız dosyayı şişirir.
 */
const PIXELS_PER_POINT = 3

export type PdfLogo = {
  /** jsPDF'in `addImage`'ine verilecek kaynak; kutu boyutuna göre ölçeklenmiş. */
  canvas: HTMLCanvasElement
  widthPx: number
  heightPx: number
}

/**
 * Görsel BİR KEZ yüklenir ve bellekte tutulur (fontla aynı gerekçe): art arda
 * iki dışa aktarma tek istek yapıyor. Ölçekleme ayrı, çünkü kutu boyutu
 * kâğıda/yöne göre değişiyor.
 */
let imagePromise: Promise<HTMLImageElement> | undefined

function loadLogoImage(): Promise<HTMLImageElement> {
  imagePromise ??= new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => {
      // Başarısız söz saklanmasın: kullanıcı tekrar denediğinde yeniden istensin.
      imagePromise = undefined
      reject(new Error('Logo yüklenemedi'))
    })
    image.src = logoUrl
  })

  return imagePromise
}

/**
 * Kapaktaki StarCAD logosu, verilen kutuya sığacak şekilde ÖLÇEKLENMİŞ hâlde.
 *
 * Belgenin geri kalanı vektör; logo RASTER ve bu bilinçli — uygulamanın marka
 * varlığı bu görsel, giriş ekranı ve kenar çubuğu da markayı aynı yerden
 * alıyor. PDF için ikinci bir SVG çizmek markayı iki yerde tutmak olurdu.
 *
 * ⚠️ Kaynak görsel 1536×1024 ve ~2 MB. Kutuya sığdırılmış hâli yaklaşık 400
 * punto genişliğinde, yani ham görsel gereğinden yaklaşık dört kat büyük.
 * Doğrudan gömülseydi HER PDF 2 MB ağırlaşırdı; bu yüzden önce bir tuvale
 * çizilip küçültülüyor.
 *
 * ⚠️ Görselin zemini SAYDAM (PNG colortype 6) ve tuvale çizilirken saydam
 * kalıyor — jsPDF alfayı kâğıtta beyaza düşürüyor, kapak zaten beyaz. Kutuya
 * renkli bir zemin konursa logonun etrafı beyaz görünür.
 */
export async function loadPdfLogo(boxWidthPt: number, boxHeightPt: number): Promise<PdfLogo> {
  const image = await loadLogoImage()

  const fit = Math.min(boxWidthPt / image.naturalWidth, boxHeightPt / image.naturalHeight)
  // Kaynaktan BÜYÜTME yok: 1'i aşan ölçek yalnız bulanık piksel üretir.
  const scale = Math.min(fit * PIXELS_PER_POINT, 1)

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(Math.round(image.naturalWidth * scale), 1)
  canvas.height = Math.max(Math.round(image.naturalHeight * scale), 1)

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Logo ölçeklenemedi')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  return { canvas, widthPx: canvas.width, heightPx: canvas.height }
}
