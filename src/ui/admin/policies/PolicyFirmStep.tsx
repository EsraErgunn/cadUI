import { policyFieldId, type PolicyErrors, type PolicyFormValues } from './policySchema'
import type { InsuranceCompany } from '../../../api/policies'
import { MissingSourceNotice } from '../MissingSourceNotice'
import { SelectField } from '../form/SelectField'

const PLACEHOLDER = 'Seçiniz'

/**
 * Adımda TEK seçim var.
 *
 * Bir süre iki kutu vardı: "Sigorta Şirketi" ve ona bağlı "Acente / Poliçe
 * Firması". Sunucuda acente diye bir kavram YOK — `Policy`'nin tek firma alanı
 * `InsuranceCompanyId`, ayrı tablo/uç/model bulunmuyor. İkinci kutunun
 * yazacağı bir yer olmadığı için kullanıcının seçimi sessizce kaybolurdu;
 * gereksinim 16'daki şirkete bağlı acente listesi bu yüzden tek alana indi.
 * Etiket ikisini de karşılıyor.
 */
export function PolicyFirmStep({
  values,
  errors,
  companies,
  hasCompanySource,
  onCompanyChange,
}: PolicyFirmStepProps) {
  if (!hasCompanySource) {
    return <MissingSourceNotice endpointHint="GET /api/insurance-companies" />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField
        id={policyFieldId('insuranceCompanyId')}
        label="Sigorta Şirketi / Poliçe Firması"
        value={toValue(values.insuranceCompanyId)}
        options={companies.map((company) => ({
          value: String(company.id),
          label: company.name,
        }))}
        placeholder={PLACEHOLDER}
        error={errors.insuranceCompanyId}
        onChange={(value) => onCompanyChange(toId(value))}
      />
    </div>
  )
}

/** Boş dize "seçilmedi" demek; kimlik alanında 0 ile karışmasın diye `null`. */
function toId(value: string): number | null {
  return value === '' ? null : Number(value)
}

function toValue(id: number | null): string {
  return id === null ? '' : String(id)
}

interface PolicyFirmStepProps {
  values: PolicyFormValues
  errors: PolicyErrors
  companies: InsuranceCompany[]
  /** Şirket listesinin kaynağı var mı; uç yanıt vermezse boş kalır. */
  hasCompanySource: boolean
  onCompanyChange: (id: number | null) => void
}
