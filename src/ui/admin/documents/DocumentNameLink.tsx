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
  fileName: string
  contentType: string
  /** Dosyanın adresi; kaynağı olmayan kayıtta `null`. */
  url: string | null
}

export function DocumentNameLink({ fileName, contentType, url }: DocumentNameLinkProps) {
  // Adres yoksa bağlantı da yok: tıklanınca hiçbir şey yapmayan (ya da 404'e
  // giden) bir bağlantı, düz metinden daha yanıltıcı olurdu.
  if (url === null) return <span className="font-medium text-ink">{fileName}</span>

  if (isViewableInBrowser(contentType)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`font-medium ${ADMIN_CELL_LINK}`}
      >
        {fileName}
      </a>
    )
  }

  return (
    <a href={url} download={fileName} className={`font-medium ${ADMIN_CELL_LINK}`}>
      {fileName}
    </a>
  )
}
