import type { ReactNode } from 'react'

import { FieldError } from './FieldError'
import { FieldHint } from './FieldHint'
import { FieldWarning } from './FieldWarning'
import { errorId, hintId, warningId } from './fieldAria'
import { fieldControlVariants, fieldFrameVariants, fieldLabelVariants } from '../adminVariants'

/** `horizontal`: etiket solda sağa hizalı, girdi sağda (gaz dağıtım firma formu). */
export type FieldLayout = 'vertical' | 'horizontal'

export interface FieldFrameProps {
  /** Etiketin `htmlFor`'u ve girdinin `id`'si aynı; bağ burada kurulur. */
  id: string
  label: string
  /** Etiketin yanındaki soluk ek: "(parametrik)", "(servis kutusu)" gibi. */
  labelNote?: string
  hint?: string
  /** Engellemeyen bilgi; hatanın aksine kaydetmeyi durdurmaz. */
  warning?: string
  error?: string
  layout?: FieldLayout
  children: ReactNode
}

/**
 * Alanların ortak iskeleti: etiket → girdi → yardım metni → hata.
 * Girdiyi kendisi render ETMEZ, yalnız çevresini kurar; böylece metin, seçim,
 * tarih ve sayı alanları aynı dikey ritmi ve aynı etiket bağını paylaşır.
 */
export function FieldFrame({
  id,
  label,
  labelNote,
  hint,
  warning,
  error,
  layout,
  children,
}: FieldFrameProps) {
  return (
    <div className={fieldFrameVariants({ layout })}>
      <label htmlFor={id} className={fieldLabelVariants({ layout })}>
        {label}
        {/* Boşluk metin düğümü olarak konuyor: yalnız `ml-1` ile ayrılsaydı
            erişilebilir ad "Proje Tipi(parametrik)" diye bitişik okunurdu. */}
        {labelNote !== undefined && ' '}
        {labelNote !== undefined && (
          <span className="text-xs font-normal text-ink-muted">{labelNote}</span>
        )}
      </label>

      {/* Girdi, yardım metni ve hata TEK sütunda durur: yatay yerleşimde hata
          metni etiketin değil girdinin altına düşmeli. */}
      <div className={fieldControlVariants({ layout })}>
        {children}
        {hint !== undefined && <FieldHint id={hintId(id)}>{hint}</FieldHint>}
        {warning !== undefined && <FieldWarning id={warningId(id)}>{warning}</FieldWarning>}
        {error !== undefined && <FieldError id={errorId(id)}>{error}</FieldError>}
      </div>
    </div>
  )
}
