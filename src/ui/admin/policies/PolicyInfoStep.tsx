import { policyFieldId, type PolicyErrors, type PolicyFormValues } from './policySchema'
import { DateField } from '../form/DateField'
import { TextField } from '../form/TextField'

const POLICY_NUMBER_PLACEHOLDER = 'POL-2026-....'
const AMOUNT_HINT = 'Kuruş için virgül kullanın (1.250.000,50).'

interface PolicyInfoStepProps {
  values: PolicyFormValues
  errors: PolicyErrors
  onChange: <TField extends keyof PolicyFormValues>(
    field: TField,
    value: PolicyFormValues[TField],
  ) => void
  onAmountChange: (raw: string) => void
  onAmountBlur: () => void
}

export function PolicyInfoStep({
  values,
  errors,
  onChange,
  onAmountChange,
  onAmountBlur,
}: PolicyInfoStepProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        id={policyFieldId('policyNumber')}
        label="Poliçe No"
        value={values.policyNumber}
        placeholder={POLICY_NUMBER_PLACEHOLDER}
        error={errors.policyNumber}
        onChange={(value) => onChange('policyNumber', value)}
      />

      <TextField
        id={policyFieldId('amountText')}
        label="Teminat Tutarı"
        value={values.amountText}
        // `type=number` DEĞİL: tr-TR ondalık ayracı virgül ve sayı girdisi
        // virgülü yutuyor (yeni proje formundaki aynı karar).
        inputMode="numeric"
        suffix="₺"
        hint={AMOUNT_HINT}
        error={errors.amountText}
        onChange={onAmountChange}
        onBlur={onAmountBlur}
      />

      <DateField
        id={policyFieldId('startDate')}
        label="Başlangıç Tarihi"
        value={values.startDate}
        error={errors.startDate}
        onChange={(value) => onChange('startDate', value)}
      />

      <DateField
        id={policyFieldId('endDate')}
        label="Bitiş Tarihi"
        value={values.endDate}
        // Takvimde geçersiz aralık hiç seçilemesin; doğrulama yine de yapılıyor
        // (elle yazılan tarih `min`'i dinlemiyor).
        min={values.startDate === '' ? undefined : values.startDate}
        error={errors.endDate}
        onChange={(value) => onChange('endDate', value)}
      />
    </div>
  )
}
