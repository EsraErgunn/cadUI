import { X } from 'lucide-react'

import { chromeButtonVariants } from './controls/buttonVariants'
import type { EditorSubmitNotice } from '../pages/useEditorSubmit'

const TONE_CLASS: Record<EditorSubmitNotice['tone'], string> = {
  success: 'text-canvas-overlay-success',
  error: 'text-canvas-overlay-danger',
}

type EditorNoticeBarProps = {
  notice: EditorSubmitNotice
  onDismiss: () => void
}

/**
 * Üst barın altındaki sonuç şeridi — gönderim/onay isteğinin cevabı.
 *
 * Kendi kendine kaybolmuyor: eksik evrak listesi okunacak bir metin, birkaç
 * saniyede silinen bir bildirime sığmaz. Kapatmayı kullanıcı yapar.
 *
 * `role` tona bağlı: hata dikkati KESER (`alert`), başarı kesmez (`status`) —
 * ekran okuyucu kullanıcısı başarılı bir işlem için sözü bırakmak zorunda
 * kalmasın.
 */
export function EditorNoticeBar({ notice, onDismiss }: EditorNoticeBarProps) {
  return (
    <div
      role={notice.tone === 'error' ? 'alert' : 'status'}
      className={`flex shrink-0 items-start gap-3 border-y border-canvas-overlay-edge px-4 py-1.5
                  text-sm ${TONE_CLASS[notice.tone]}`}
    >
      <div className="min-w-0 flex-1">
        <p>{notice.message}</p>
        {notice.details !== undefined && notice.details.length > 0 && (
          <ul className="mt-1 list-disc pl-5">
            {notice.details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Bildirimi kapat"
        className={chromeButtonVariants({ shape: 'icon' })}
      >
        <X size={14} strokeWidth={1.8} aria-hidden />
      </button>
    </div>
  )
}
