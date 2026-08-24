import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

import { adminDialogPanelVariants } from './adminVariants'

/** Odak tuzağının döneceği öğeler. */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

interface AdminDialogProps {
  title: string
  /** `aria-describedby` hedefi; açıklama metni `children` içinde durur. */
  describedById?: string
  /** Açılışta odaklanacak öğe. Verilmezse ilk odaklanabilir öğeye gidilir. */
  initialFocusRef?: RefObject<HTMLElement | null>
  size?: 'md' | 'lg'
  onClose: () => void
  children: ReactNode
}

/**
 * Yönetici diyaloglarının ortak kabuğu: zemin, odak tuzağı, Esc ile kapanma ve
 * kapanınca odağın tetikleyen öğeye dönmesi. Diyalog açan her ekran bunu
 * paylaşır — ikinci bir kopya çıkarmak, odak mantığının iki yerde ayrı ayrı
 * bozulması demekti.
 *
 * Açık olup olmadığını ÇAĞIRAN tutar (koşullu render): kapalıyken hiç DOM
 * üretmemek, açılış/kapanış odak mantığını mount ömrüne bağlıyor.
 *
 * **`document.body`'ye PORTAL ile basılıyor.** Diyaloglar bir formun içinden
 * açılabiliyor (gaz dağıtım firması formundaki "yeni grup" gibi) ve yerinde
 * render edilince `<form>` içinde `<form>` oluşuyordu: React bunu uyarıyor
 * ("In HTML, <form> cannot be a descendant of <form>") ve diyalogun Kaydet'i
 * DIŞTAKİ formu da gönderiyordu — kullanıcı grubu kaydetmeye çalışırken firma
 * formu doğrulama hatalarıyla doluyor, iş yapılmamış görünüyordu.
 *
 * Portal ayrıca `overflow`/`z-index` kırpılmasını da çözüyor: kabuk bir
 * kaydırma kabının içinde olsa bile diyalog tam ekran kalıyor.
 */
export function AdminDialog({
  title,
  describedById,
  initialFocusRef,
  size,
  onClose,
  children,
}: AdminDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useEffect(() => {
    const previouslyFocused = document.activeElement
    const target =
      initialFocusRef?.current ?? dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)
    target?.focus()

    return () => {
      // Odak geri verilmezse sayfanın başına düşer, klavye kullanıcısı yerini kaybeder.
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [initialFocusRef])

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      onClose()
      return
    }
    if (event.key !== 'Tab') return

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    if (focusable === undefined || focusable.length === 0) return

    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
      return
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return createPortal(
    <div
      onKeyDown={handleKeyDown}
      /*
       * Diyalogun KENDİ formu dışarıya taşmasın. Portal DOM'da ayırıyor ama
       * React olayları BİLEŞEN ağacında baloncuklandırıyor: diyalog bir formun
       * içinden açıldığında (gaz dağıtım firması formundaki "yeni grup" gibi)
       * diyalogun Kaydet'i dıştaki formun `onSubmit`'ini de tetikliyordu —
       * kullanıcı grubu kaydederken firma formu doğrulama hatalarıyla doluyor,
       * hiçbir şey olmamış gibi görünüyordu.
       */
      onSubmit={(event) => event.stopPropagation()}
      // Zemine tıklamak vazgeçmek sayılır; klavye karşılığı Esc.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedById}
        className={adminDialogPanelVariants({ size })}
      >
        <h2 id={titleId} className="text-lg font-semibold text-ink">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body,
  )
}
