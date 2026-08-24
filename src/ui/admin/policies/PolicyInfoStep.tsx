import { policyFieldId, type PolicyErrors, type PolicyFormValues } from './policySchema'
import { DateField } from '../form/DateField'
import { SelectField } from '../form/SelectField'
import { TextField } from '../form/TextField'

const POLICY_NUMBER_PLACEHOLDER = 'POL-2026-....'
const AMOUNT_HINT = 'Kuruş için virgül kullanın (1.250.000,50).'

/** Seçim kutusunda görünen birim; ad boşsa kimlikle ayırt edilir. */
export interface PolicyUnitOption {
  id: number
  label: string
}

interface PolicyInfoStepProps {
  values: PolicyFormValues
  errors: PolicyErrors
  /** Projenin birimleri (`GET /api/projects/{id}/units`). */
  units: PolicyUnitOption[]
  areUnitsPending: boolean
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
  units,
  areUnitsPending,
  onChange,
  onAmountChange,
  onAmountBlur,
}: PolicyInfoStepProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Poliçe sunucuda BİRİME bağlı (`PolicyAddDto.ProjectUnitId`), projeye
          değil — bu yüzden zorunlu ve ilk sırada. Birimi olmayan projede kutu
          boş kalır ve sebebi ipucunda yazar. */}
      <SelectField
        id={policyFieldId('projectUnitId')}
        label="Birim"
        value={values.projectUnitId === null ? '' : String(values.projectUnitId)}
        options={units.map((unit) => ({ value: String(unit.id), label: unit.label }))}
        placeholder="Seçiniz"
        isDisabled={areUnitsPending || units.length === 0}
        hint={
          !areUnitsPending && units.length === 0
            ? 'Bu projede tanımlı birim yok; poliçe bir birime bağlanmadan açılamaz.'
            : undefined
        }
        error={errors.projectUnitId}
        onChange={(value) => onChange('projectUnitId', value === '' ? null : Number(value))}
      />

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
