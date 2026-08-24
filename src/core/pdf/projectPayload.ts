/**
 * PDF'in İÇİNE gömülen proje verisi.
 *
 * ⚠️ Bir PDF sayfası ÇİZİMDİR, veri değil: kâğıttaki duvar bir vektör yolu,
 * boru bir çizgi. Sayfadan geri model üretmek (yolları tanıyıp duvara/boruya
 * çevirmek) ayrı ve kayıplı bir iş olurdu. Bu yüzden "Proje Dosyasını Aç"
 * sayfayı OKUMUYOR: dışa aktarırken proje JSON'u belgenin XMP metadata'sına
 * gömülüyor, açarken oradan geri alınıyor. Böylece dosya hem basılabilir bir
 * pafta hem de kayıpsız bir proje dosyası oluyor.
 *
 * ⚠️ Bunun bedeli: yalnız STARCAD'in ürettiği PDF açılabilir. Başka bir
 * programın PDF'inde bu veri yoktur ve açılmaya çalışılırsa anlaşılır bir hata
 * verilir — sessizce boş proje yüklenmez.
 */

/** Gömülü verinin sarmalandığı etiket; PDF metninde bu ada göre aranıyor. */
const PAYLOAD_TAG = 'starcad:projectData'

const PAYLOAD_PATTERN = new RegExp(`<${PAYLOAD_TAG}>([\\s\\S]*?)</${PAYLOAD_TAG}>`)

/**
 * JSON base64'e çevriliyor, ham gömülmüyor.
 *
 * İki sebep: (1) XMP bir XML paketi, ham JSON'daki `<`, `&` ve tırnaklar
 * paketi bozardı; (2) proje verisi Türkçe karakter taşıyor ve base64, kodlama
 * belirsizliğini tümüyle ortadan kaldırıyor. Bedeli ~%33 boyut, kabul edildi.
 */
export function encodeProjectPayload(json: string): string {
  return btoa(String.fromCharCode(...new TextEncoder().encode(json)))
}

export function decodeProjectPayload(payload: string): string {
  const binary = atob(payload)
  const bytes = Uint8Array.from(binary, (character) => character.codePointAt(0) ?? 0)
  return new TextDecoder().decode(bytes)
}

/** `jsPDF.addMetadata`'ya ham XML olarak verilecek paket. */
export function buildProjectMetadataXml(json: string): string {
  return `<${PAYLOAD_TAG}>${encodeProjectPayload(json)}</${PAYLOAD_TAG}>`
}

/**
 * PDF'in ham metninden gömülü proje JSON'unu çıkarır; yoksa `undefined`.
 *
 * ⚠️ Metadata akışı SIKIŞTIRILMADAN yazıldığı için düz metin araması yetiyor
 * (belge `compress` seçeneği olmadan kuruluyor, bkz. `renderPlanPdf.ts`).
 * Sıkıştırma açılırsa bu arama sessizce hiçbir şey bulamaz — ikisi birbirine
 * bağlı, biri değişirse diğeri de değişmeli.
 */
export function extractProjectJson(pdfText: string): string | undefined {
  const match = PAYLOAD_PATTERN.exec(pdfText)
  if (!match) return undefined

  try {
    return decodeProjectPayload(match[1].trim())
  } catch {
    // Bozuk base64: dosya bizim ürettiğimiz olsa bile okunamıyor demektir.
    return undefined
  }
}
