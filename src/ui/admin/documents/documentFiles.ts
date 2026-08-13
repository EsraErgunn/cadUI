/** Yükleme alanında yazılı olan desteklenen biçimler (gereksinim 8). */
export const ACCEPTED_DOCUMENT_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.pdf',
  '.alp',
] as const

const BYTES_PER_MEGABYTE = 1024 * 1024
export const MAX_DOCUMENT_SIZE_MB = 10
export const MAX_DOCUMENT_SIZE_BYTES = MAX_DOCUMENT_SIZE_MB * BYTES_PER_MEGABYTE

export const UNSUPPORTED_FORMAT_MESSAGE = 'Desteklenmeyen dosya formatı.'
export const OVERSIZE_FILE_MESSAGE = "Dosya boyutu 10MB'ı aşamaz."

/**
 * `<input accept>` değeri. Tarayıcının dosya seçicisini daraltır ama TEK
 * denetim değildir: sürükle-bırak `accept`'i dinlemez ve kullanıcı seçicide
 * "tüm dosyalar"a geçebilir — asıl denetim `validateDocumentFile`.
 */
export const DOCUMENT_ACCEPT_ATTRIBUTE = ACCEPTED_DOCUMENT_EXTENSIONS.join(',')

function extensionOf(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.')
  return dotIndex === -1 ? '' : fileName.slice(dotIndex).toLowerCase()
}

/**
 * Biçim kontrolü UZANTIDAN: tarayıcı `File.type`'ı bazı biçimlerde (`.alp`,
 * `.bmp`) boş bırakıyor, MIME'a bakan bir denetim geçerli dosyayı reddederdi.
 * Listeye alınan dosyanın MIME'ı ayrıca `contentType` olarak taşınıyor.
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
