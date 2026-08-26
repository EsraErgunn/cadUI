import { useState } from 'react'

import { formatPolicyAmount, parsePolicyAmount, sanitizePolicyAmount } from './policySchema'
import type { PolicyEditTarget } from '../../../api/policies'
import { AdminDialog } from '../AdminDialog'
import { InfoRow } from '../InfoRow'
import { NoticeBar } from '../NoticeBar'
import { adminButtonVariants } from '../adminVariants'
import { DateField } from '../form/DateField'
import { TextField } from '../form/TextField'

const DIALOG_TITLE = 'Poliçeyi güncelle'

const ERRORS = {
  amount: 'Teminat tutarı zorunludur.',
  amountPositive: 'Teminat tutarı sıfırdan büyük olmalıdır.',
  startDate: 'Başlangıç tarihi zorunludur.',
  endDate: 'Bitiş tarihi zorunludur.',
  endBeforeStart: 'Bitiş tarihi, başlangıç tarihinden önce olamaz.',
} as const

export interface PolicyEditValues {
  amount: number
  startDate: string
  endDate: string
}

interface PolicyEditDialogProps {
  policy: PolicyEditTarget
  isSaving: boolean
  error: string | null
  onDismissError: () => void
  onSave: (values: PolicyEditValues) => void
  onClose: () => void
}

interface FieldErrors {
  amountText?: string
  startDate?: string
  endDate?: string
}

function validate(amountText: string, startDate: string, endDate: string): FieldErrors {
  const errors: FieldErrors = {}

  const amount = parsePolicyAmount(amountText)
  if (amount === null) errors.amountText = ERRORS.amount
  else if (amount <= 0) errors.amountText = ERRORS.amountPositive

  if (startDate === '') errors.startDate = ERRORS.startDate

  if (endDate === '') errors.endDate = ERRORS.endDate
  else if (startDate !== '' && endDate < startDate) errors.endDate = ERRORS.endBeforeStart

  return errors
}

/**
 * Poliçe güncelleme — YALNIZ tutar ve tarihler.
 *
 * Birim DEĞİŞTİRİLEMEZ (backend kararı): poliçe bir bağımsız bölüme ait ve
 * başka bir birime taşınmıyor. Alan yine de GÖSTERİLİYOR ama salt okunur —
 * gizlenseydi kullanıcı hangi birimi düzenlediğini göremezdi.
 *
 * Poliçe numarası ve sigorta şirketi de burada düzenlenmiyor; ikisi de salt
 * okunur satır olarak duruyor. Sunucu `PUT`'ta beş alanın HEPSİNİ yazdığı için
 * gövde okunan kayıttan tamamlanıyor (`usePolicyActions`) — yoksa gönderilmeyen
 * alanlar sunucuda silinirdi.
 */
export function PolicyEditDialog({
  policy,
  isSaving,
  error,
  onDismissError,
  onSave,
  onClose,
}: PolicyEditDialogProps) {
  const [amountText, setAmountText] = useState(() =>
    policy.amount === null ? '' : formatPolicyAmount(String(policy.amount).replace('.', ',')),
  )
  const [startDate, setStartDate] = useState(policy.startDate ?? '')
  const [endDate, setEndDate] = useState(policy.endDate ?? '')
  const [errors, setErrors] = useState<FieldErrors>({})

  const handleSave = () => {
    const nextErrors = validate(amountText, startDate, endDate)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    onSave({ amount: parsePolicyAmount(amountText) ?? 0, startDate, endDate })
  }

  return (
    <AdminDialog title={DIALOG_TITLE} onClose={onClose}>
      {error !== null && (
        <div className="mt-4">
          <NoticeBar tone="error" message={error} onDismiss={onDismissError} />
        </div>
      )}

      {/* Değiştirilemeyen üç alan: birim (sunucu taşımaya izin vermiyor),
          poliçe no ve şirket (bu ekranın kapsamı dışında). */}
      <dl className="mt-4 overflow-hidden rounded-xl border border-edge bg-surface-sunken">
        <InfoRow label="Birim" value={policy.unitNumber} />
        <InfoRow label="Poliçe No" value={policy.policyNumber} />
        <InfoRow label="Sigorta Şirketi" value={policy.insuranceCompanyName} />
      </dl>

      <div className="mt-4 grid gap-4">
        {/* Sihirbazdaki alanla aynı: `type=number` DEĞİL, tr-TR ondalık ayracı
            virgül ve sayı girdisi virgülü yutuyor. */}
        <TextField
          id="policy-edit-amount"
          label="Teminat Tutarı"
          value={amountText}
          inputMode="numeric"
          suffix="₺"
          error={errors.amountText}
          onChange={(raw) => {
            const sanitized = sanitizePolicyAmount(raw)
            if (sanitized === null) return
            setAmountText(sanitized)
            setErrors((current) => ({ ...current, amountText: undefined }))
          }}
          onBlur={() => setAmountText((current) => formatPolicyAmount(current))}
        />

        <DateField
          id="policy-edit-start"
          label="Başlangıç Tarihi"
          value={startDate}
          error={errors.startDate}
          onChange={(value) => {
            setStartDate(value)
            setErrors((current) => ({ ...current, startDate: undefined }))
          }}
        />

        <DateField
          id="policy-edit-end"
          label="Bitiş Tarihi"
          value={endDate}
          min={startDate === '' ? undefined : startDate}
          error={errors.endDate}
          onChange={(value) => {
            setEndDate(value)
            setErrors((current) => ({ ...current, endDate: undefined }))
          }}
        />
      </div>

      <div className="mt-5 flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className={adminButtonVariants({ tone: 'secondary' })}
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          aria-busy={isSaving}
          className={adminButtonVariants({ tone: 'primary' })}
        >
          {isSaving ? 'Kaydediliyor…' : 'Kaydet'}
        </button>
      </div>
    </AdminDialog>
  )
}
