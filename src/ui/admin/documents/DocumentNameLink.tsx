import { useState } from 'react'

import { getDocumentDownloadUrl } from '../../../api/documents'
import { ADMIN_CELL_LINK } from '../adminVariants'

/**
 * Tarayıcıda görüntülenebilen tipler yeni sekmede açılır, geri kalanı (.alp,
 * .dwg gibi) indirilir. Karar YALNIZ `contentType`'a bakıyor: uzantıya bakan
 * bir ayrım, uzantısı yanlış yazılmış dosyada sessizce yanlış davranırdı.
 */
const VIEWABLE_CONTENT_TYPES = ['application/pdf']

function isViewableInBrowser(contentType: string): boolean {
  return contentType.startsWith('image/') || VIEWABLE_CONTENT_TYPES.includes(contentType)
}

interface DocumentNameLinkProps {
  documentId: number
  fileName: string
  /** MIME tipi; sunucu göndermemişse indirme davranışına düşülür. */
  contentType: string | null
}

/**
 * Adres SATIRDA DEĞİL: `GET /api/docs/{id}/download` süreli (presigned) bir
 * adres üretiyor ve listedeki her satır için önden istemek hem gereksiz hem de
 * kullanıcı tabloyu açık bıraktığında süresi dolmuş adresler bırakırdı. Bu
 * yüzden adres TIKLANINCA alınıyor.
 *
 * Bağlantı değil düğme: `href`i olmayan bir `<a>` klavye ve ekran okuyucu için
 * bağlantı gibi davranmaz.
 */
export function DocumentNameLink({ documentId, fileName, contentType }: DocumentNameLinkProps) {
  const [isOpening, setIsOpening] = useState(false)
  const [hasFailed, setHasFailed] = useState(false)

  const open = async () => {
    setIsOpening(true)
    setHasFailed(false)
    try {
      const url = await getDocumentDownloadUrl(documentId)

      if (contentType !== null && isViewableInBrowser(contentType)) {
        window.open(url, '_blank', 'noopener,noreferrer')
        return
      }

      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = fileName
      anchor.click()
    } catch {
      // Sebebi satırda yazılmıyor: tablo hücresi hata metni taşıyacak yer
      // değil. Ad kırmızıya dönüp başlıkta sebebi söylüyor, kullanıcı tekrar
      // deneyebiliyor.
      setHasFailed(true)
    } finally {
      setIsOpening(false)
    }
  }

  return (
    <button
      type="button"
      onClick={() => void open()}
      disabled={isOpening}
      title={hasFailed ? 'Dosya açılamadı. Tekrar deneyin.' : undefined}
      className={`font-medium ${hasFailed ? 'text-danger' : ADMIN_CELL_LINK}`}
    >
      {fileName}
    </button>
  )
}
