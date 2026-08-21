import { Eye } from 'lucide-react'

const TITLE = 'Salt görüntüleme'
const DESCRIPTION = 'Bu proje üzerinde değişiklik yapamazsınız.'

/**
 * Salt görüntüleme şeridi.
 *
 * Neden var: düğmelerin ve araç paletinin yokluğu tek başına "bozuk" hissi
 * verir — kullanıcı neyin eksik olduğunu değil, uygulamanın çalışmadığını
 * düşünür. Şerit sebebi söylüyor.
 *
 * Tuvalin ÜSTÜNDE yüzüyor ve `canvas-overlay` token'larını kullanıyor: yüzen
 * çubuk ve özellik paneliyle aynı aile (K54). `pointer-events-none` şart —
 * şeridin altındaki tuval hâlâ kaydırılıp yakınlaştırılabilmeli.
 */
export function ReadOnlyNotice() {
  return (
    <div
      role="status"
      className="pointer-events-none absolute left-1/2 top-4 z-10 flex -translate-x-1/2
                 items-center gap-2 rounded-full border border-edge bg-surface/95 px-4 py-2
                 shadow-lg backdrop-blur"
    >
      <Eye size={16} strokeWidth={1.8} aria-hidden className="shrink-0 text-ink-muted" />
      <span className="text-sm font-semibold text-ink">{TITLE}</span>
      <span className="text-sm text-ink-muted">{DESCRIPTION}</span>
    </div>
  )
}
