import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

import type { PolicyStep } from './policySchema'
import { adminButtonVariants } from '../adminVariants'

interface PolicyWizardFooterProps {
  step: PolicyStep
  isSubmitting: boolean
  onCancel: () => void
  onBack: () => void
  onNext: () => void
  onClose: () => void
}

/**
 * Gezinme düğmeleri (gereksinim 20). Kayıt ÖZET adımındaki "Bitir" ile yapılır
 * (K64), o yüzden sonuç adımında ileri/geri yok: kaydedilmiş bir poliçenin
 * adımlarına dönmek düzeltme değil, ikinci bir kayıt izlenimi verirdi.
 */
export function PolicyWizardFooter({
  step,
  isSubmitting,
  onCancel,
  onBack,
  onNext,
  onClose,
}: PolicyWizardFooterProps) {
  if (step === 'done') {
    return (
      <div className="flex justify-end border-t border-edge pt-4">
        <button type="button" onClick={onClose} className={adminButtonVariants({ tone: 'primary' })}>
          Proje Detayına Dön
        </button>
      </div>
    )
  }

  const isLastDataStep = step === 'summary'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-4">
      <button type="button" onClick={onCancel} className={adminButtonVariants({ tone: 'secondary' })}>
        Vazgeç
      </button>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={step === 'method'}
          className={adminButtonVariants({ tone: 'secondary' })}
        >
          <ArrowLeft aria-hidden className="size-4" />
          Geri
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={isSubmitting}
          className={adminButtonVariants({ tone: 'primary' })}
        >
          {isLastDataStep ? <Check aria-hidden className="size-4" /> : null}
          {isSubmitting ? 'Kaydediliyor…' : isLastDataStep ? 'Bitir' : 'İleri'}
          {isLastDataStep ? null : <ArrowRight aria-hidden className="size-4" />}
        </button>
      </div>
    </div>
  )
}
