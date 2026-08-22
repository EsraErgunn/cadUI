import type { jsPDF } from 'jspdf'

/**
 * PDF'e gömülen yazı tipi. Sahnenin kullandığı `roboto-regular.woff`'un TTF'e
 * çevrilmiş hâli (`scripts/woffToTtf.mjs`) — aynı yazı tipi hem ekranda hem
 * kâğıtta, ikinci bir lisans/sürüm takibi yok.
 */
const FONT_URL = '/fonts/roboto-regular.ttf'
const FONT_FILE = 'Roboto-Regular.ttf'

/** SVG'deki `font-family` ile AYNI olmalı; svg2pdf yazıyı bu adla arıyor. */
export const PDF_FONT_FAMILY = 'Roboto'

/** btoa tek seferde büyük diziyi yiyemez (argüman sınırı); parça parça çevrilir. */
const CHUNK_SIZE = 0x8000

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let index = 0; index < bytes.length; index += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(index, index + CHUNK_SIZE))
  }
  return btoa(binary)
}

/**
 * Font BİR KEZ indirilir ve bellekte tutulur: PDF her alındığında 60 KB
 * yeniden çekilmesin. Modül düzeyinde söz saklanıyor, böylece art arda iki
 * dışa aktarma tek istek yapıyor.
 */
let fontPromise: Promise<string> | undefined

async function loadFontBase64(): Promise<string> {
  fontPromise ??= fetch(FONT_URL)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Yazı tipi yüklenemedi (${response.status})`)
      return toBase64(new Uint8Array(await response.arrayBuffer()))
    })
    .catch((error: unknown) => {
      // Başarısız söz saklanmasın: kullanıcı tekrar denediğinde yeniden istensin.
      fontPromise = undefined
      throw error
    })

  return fontPromise
}

/**
 * Gömülü fontu belgeye kaydeder.
 *
 * ⚠️ ŞART, isteğe bağlı değil. jsPDF'in yerleşik fontları WinAnsi kodlaması
 * kullanıyor ve `ı ğ ş İ` bu kodlamada YOK. Üstelik jsPDF hata da vermiyor —
 * ölçüldü: Türkçe metin için genişlik döndürüyor ama yanlış glif basıyor.
 * Sessiz bozulma olduğu için gömme adımı atlanamaz.
 */
export async function embedPdfFont(doc: jsPDF): Promise<void> {
  const base64 = await loadFontBase64()

  doc.addFileToVFS(FONT_FILE, base64)
  doc.addFont(FONT_FILE, PDF_FONT_FAMILY, 'normal')
  doc.setFont(PDF_FONT_FAMILY, 'normal')
}
