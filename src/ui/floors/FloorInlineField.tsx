import { useEffect, useRef, useState } from 'react'

import { FLOOR_FOCUS_RING, floorInlineFieldVariants } from './floorVariants'

type FloorInlineFieldProps = {
  value: string
  label: string
  align?: 'left' | 'right'
  widthClass: string
  suffix?: string
  error?: string
  /** `false` dönerse değer reddedilmiş demektir; alan eski değerine döner. */
  onCommit: (text: string) => boolean
}

/**
 * Tıklayınca düzenlenen alan (K166). Satırda sürekli duran bir `<input>`
 * çerçevesi yoktu; sekiz kutulu bir ızgara kat listesini elektronik tabloya
 * çeviriyordu. Alan yine gerçek bir input — dinlenme hâlinde yalnız çerçevesi
 * gizli, yani klavye ve ekran okuyucu için hiçbir şey değişmiyor.
 *
 * Taslak metin YEREL: kullanıcı yazarken her tuş vuruşunu doğrulamaya sokmak
 * "3" yazılırken (200 cm sınırının altında) alanı kırmızıya boyardı.
 */
export function FloorInlineField({
  value,
  label,
  align = 'left',
  widthClass,
  suffix,
  error,
  onCommit,
}: FloorInlineFieldProps) {
  const [draftText, setDraftText] = useState(value)
  const isEditingRef = useRef(false)

  // Dışarıdan gelen değişiklik (sıralama, geri alma) alanı tazeler — ama
  // kullanıcı o sırada yazıyorsa yazdığını silmez.
  useEffect(() => {
    if (!isEditingRef.current) setDraftText(value)
  }, [value])

  const commit = () => {
    isEditingRef.current = false
    if (draftText !== value && !onCommit(draftText)) setDraftText(value)
  }

  return (
    <span className="inline-flex items-baseline gap-1">
      <input
        value={draftText}
        aria-label={label}
        aria-invalid={error !== undefined}
        onFocus={() => {
          isEditingRef.current = true
        }}
        onChange={(event) => setDraftText(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            setDraftText(value)
            isEditingRef.current = false
            event.currentTarget.blur()
          }
          // Satır seçimi ve sıralama tuşları alana yazarken devreye girmesin.
          event.stopPropagation()
        }}
        className={`${floorInlineFieldVariants({ align })} ${widthClass} ${FLOOR_FOCUS_RING}`}
      />
      {suffix && <span className="text-xs text-ink-disabled">{suffix}</span>}
      {error && (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      )}
    </span>
  )
}
