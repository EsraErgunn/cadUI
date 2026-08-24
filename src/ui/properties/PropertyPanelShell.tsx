import { Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { useUiStore } from '../../store/uiStore'

type PropertyPanelShellProps = {
  /** Erişilebilir ad: mimaride "Nesne özellikleri", tesisatta "Tesisat özellikleri". */
  label: string
  title: string
  isOpen: boolean
  onDelete: () => void
  /** Mahal gibi TÜREV nesnelerde "Sil" hiç gösterilmez (K117). Varsayılan: gösterilir. */
  isDeletable?: boolean
  /** Sil düğmesinin ÜSTÜNE giren ek eylemler (mimaride grup dönüşümü). */
  actions?: ReactNode
  children: ReactNode
}

/**
 * İki özellik panelinin (mimari + tesisat) ortak kabuğu. Seçim store'ları ayrı
 * olduğu için paneller ayrı bileşen kalıyor (K37, knowledge/property-panel.md);
 * ayrışmaması gereken şey GÖRÜNÜM, o da burada tek yerde.
 *
 * Tuvalin ÜSTÜNDE yüzen kart: yüzen çubukla (K54) aynı aile — kavis, kenarlık,
 * gölge. Eskiden ekranın sağ kenarına yapışan tam boy bir şeritti; üst bar
 * kalkınca o şerit kabuğun neresine ait olduğu okunmayan bir blok hâline geldi.
 *
 * SALT GÖRÜNTÜLEME burada TEK yerden uygulanıyor: panel açık kalır (seçilen
 * nesnenin özellikleri okunabilmeli) ama içerik `<fieldset disabled>` ile
 * sarılır ve "Sil" hiç çizilmez. Kabuk ortak olduğu için mimari ve tesisat
 * panellerinin tamamı — ve içlerindeki her alt panel — tek değişiklikle
 * kapanıyor; yirmi dosyaya `isReadOnly` prop'u dağıtmak gerekmedi.
 */
export function PropertyPanelShell({
  label,
  title,
  isOpen,
  onDelete,
  isDeletable = true,
  actions,
  children,
}: PropertyPanelShellProps) {
  const isReadOnly = useUiStore((state) => state.isEditorReadOnly)

  return (
    // Kaydıran sarmalayıcı, panelin KENDİSİ değil: kenar boşluğu burada olduğu
    // için `translate-x-full` paneli boşlukla birlikte götürüyor. Boşluk panelin
    // üstünde olsaydı kapalıyken kenardan bir şerit sızardı.
    <div
      className={`pointer-events-none absolute inset-y-0 right-0 z-10 flex p-4 transition-transform duration-200 ease-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <aside
        aria-label={label}
        aria-hidden={!isOpen}
        inert={!isOpen ? true : undefined}
        className="pointer-events-auto flex w-64 flex-col overflow-hidden rounded-2xl border border-edge bg-surface/95 shadow-lg backdrop-blur"
      >
        {/* Başlık DÜĞME değil: içeriği katlayan ok kaldırıldı (K53). Panel zaten
            seçim varken açılıp seçim bitince kapanıyor, ikinci bir aç/kapa
            durumu kullanıcıya iki farklı "kapalı" hâli öğretiyordu. */}
        <h2 className="shrink-0 border-b border-edge px-3 py-2 text-sm font-semibold text-ink">
          {title}
        </h2>

        {/* `fieldset disabled` içindeki HER form denetimini (input, select,
            button, textarea) tarayıcı düzeyinde etkisiz kılar — görsel bir
            kilit değil. `min-w-0`: fieldset'in tarayıcı varsayılanı
            `min-inline-size: min-content`, panelin dar sütununu taşırıyor. */}
        <fieldset
          disabled={isReadOnly}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto border-0 px-3 py-2"
        >
          {children}
        </fieldset>

        {!isReadOnly && actions}

        {isDeletable && !isReadOnly && (
          <div className="shrink-0 border-t border-edge px-3 py-2">
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-sm text-danger hover:bg-danger/10"
            >
              <Trash2 size={16} strokeWidth={1.8} aria-hidden />
              Sil
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
