import { policyFieldId, type PolicyErrors, type PolicyFormValues } from './policySchema'
import { DateField } from '../form/DateField'
import { SelectField } from '../form/SelectField'
import { TextField } from '../form/TextField'

const POLICY_NUMBER_PLACEHOLDER = 'POL-2026-....'
const AMOUNT_HINT = 'Kuruş için virgül kullanın (1.250.000,50).'

/** Dolu birimin etiketine eklenen açıklama; seçenek listede görünür ama seçilemez. */
const TAKEN_UNIT_SUFFIX = ' — poliçesi var'

const NO_UNITS_HINT = 'Bu projede tanımlı birim yok; poliçe bir birime bağlanmadan açılamaz.'
const ALL_UNITS_TAKEN_HINT =
  'Bu projedeki her birimin yürürlükte bir poliçesi var. Yeni poliçe açmak için önce mevcut poliçeyi iptal edin.'
const SOME_UNITS_TAKEN_HINT =
  'Poliçesi olan birimler seçilemez; bir birimde aynı anda tek poliçe bulunabilir.'

/**
 * Kutunun altındaki açıklama. Üç ayrı hâl var ve hiçbiri diğerinin yerine
 * geçmiyor: birim yok, hepsi dolu, bir kısmı dolu. Tek bir metin, kullanıcıya
 * yanlış sebebi okuturdu.
 */
function buildUnitHint(units: PolicyUnitOption[], areUnitsPending: boolean): string | undefined {
  if (areUnitsPending) return undefined
  if (units.length === 0) return NO_UNITS_HINT

  const selectable = units.filter((unit) => !unit.hasActivePolicy)
  if (selectable.length === 0) return ALL_UNITS_TAKEN_HINT
  if (selectable.length < units.length) return SOME_UNITS_TAKEN_HINT

  return undefined
}

/** Seçim kutusunda görünen birim; ad boşsa kimlikle ayırt edilir. */
export interface PolicyUnitOption {
  id: number
  label: string
  /**
   * Birimde YÜRÜRLÜKTEKİ bir poliçe var mı. Sunucu bir birimde aynı anda tek
   * aktif poliçeye izin veriyor (ihlalde 400) ve eskisini otomatik kapatmıyor.
   */
  hasActivePolicy: boolean
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
          değil — bu yüzden zorunlu ve ilk sırada.

          Poliçesi olan birim GİZLENMİYOR, seçilemez hâlde LİSTELENİYOR: sunucu
          o birimi 400 ile reddediyor ve bunu ancak son adımda ("Bitir")
          söyleyebilirdi. Kullanıcı birimi görüp neden seçemediğini burada
          okuyor, formu baştan doldurduktan sonra değil. */}
      <SelectField
        id={policyFieldId('projectUnitId')}
        label="Birim"
        value={values.projectUnitId === null ? '' : String(values.projectUnitId)}
        options={units.map((unit) => ({
          value: String(unit.id),
          label: unit.hasActivePolicy ? `${unit.label}${TAKEN_UNIT_SUFFIX}` : unit.label,
          isDisabled: unit.hasActivePolicy,
        }))}
        placeholder="Seçiniz"
        isDisabled={areUnitsPending || units.length === 0}
        hint={buildUnitHint(units, areUnitsPending)}
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
