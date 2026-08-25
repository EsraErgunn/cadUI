/**
 * Desteklenen biçimler — SUNUCUNUN kabul ettiği kadar.
 *
 * Gereksinim 8 yedi biçim sayıyordu (`.jpg .jpeg .png .gif .bmp .pdf .alp`) ve
 * ekran onları kabul ediyordu; sunucu ise yalnız PDF alıyor
 * (`DocUploadRules.AllowedContentTypes = ["application/pdf"]`). Kullanıcı PDF
 * dışında bir dosya seçebiliyor, "Kaydet"e basınca sunucudan
 * "Yalnızca PDF yüklenebilir." hatası alıyordu — yani seçim en baştan boşunaydı.
 *
 * Liste sunucuya daraltıldı. Backend yedi biçimi desteklemeye başlarsa yalnız
 * bu dizi büyür; `accept` niteliği, ipucu metni ve doğrulama ondan türüyor.
 */
export const ACCEPTED_DOCUMENT_EXTENSIONS = ['.pdf'] as const

const BYTES_PER_MEGABYTE = 1024 * 1024
export const MAX_DOCUMENT_SIZE_MB = 10
export const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * BYTES_PER_MEGABYTE

/** Sunucunun metniyle BİREBİR: iki taraf aynı cümleyi kursun, kullanıcı
    reddin nereden geldiğine göre farklı bir açıklama okumasın. */
export const UNSUPPORTED_FORMAT_MESSAGE = 'Yalnızca PDF yüklenebilir.'
export const OVERSIZE_FILE_MESSAGE = "Dosya boyutu 10MB'ı aşamaz."

/**
 * `<input accept>` değeri. Tarayıcının dosya seçicisini daraltır ama TEK
 * denetim değildir: sürükle-bırak `accept`'i dinlemez ve kullanıcı seçicide
 * "tüm dosyalar"a geçebilir — asıl denetim `validateDocumentFile`.
 *
 * Hem MIME hem uzantı yazılı: bazı işletim sistemlerinde seçici yalnız MIME'ı,
 * bazılarında yalnız uzantıyı dikkate alıyor.
 */
export const DOCUMENT_ACCEPT_ATTRIBUTE = 'application/pdf,.pdf'

function extensionOf(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex === -1 ? '' : fileName.slice(dotIndex).toLowerCase()
}

/**
 * Biçim kontrolü UZANTIDAN yapılıyor, MIME'dan değil: tarayıcı `File.type`'ı
 * bazı dosyalarda boş bırakabiliyor ve MIME'a bakan bir denetim geçerli bir
 * PDF'i reddedebilirdi. Sunucu ayrıca kendi denetimini `ContentType` üzerinden
 * yapıyor — buradaki kontrol onun yerine geçmiyor, kullanıcıya erken haber
 * veriyor.
 */
export function validateDocumentFile(file: File): string | null {
  const extension = extensionOf(file.name)
  const isAccepted = ACCEPTED_DOCUMENT_EXTENSIONS.some((candidate) => candidate === extension)
  if (!isAccepted) return UNSUPPORTED_FORMAT_MESSAGE

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) return OVERSIZE_FILE_MESSAGE

  return null
}

export interface RejectedFile {
  fileName: string
  message: string
}

export interface FilePartition {
  accepted: File[]
  rejected: RejectedFile[]
}

/**
 * Aynı anda birden çok dosya seçilebiliyor (gereksinim 8); biri geçersizse
 * yalnız O dosya elenir. Reddedilen dosya listeye HİÇ girmez: yüklenemeyeceği
 * belli olan bir satırı listede tutmak, kullanıcıya "Kaydet"e basınca çözülecek
 * bir sorun varmış izlenimi verirdi.
 */
export function partitionDocumentFiles(files: File[]): FilePartition {
  const partition: FilePartition = { accepted: [], rejected: [] }

  for (const file of files) {
    const message = validateDocumentFile(file)
    if (message === null) {
      partition.accepted.push(file)
      continue
    }
    partition.rejected.push({ fileName: file.name, message })
  }

  return partition
}
