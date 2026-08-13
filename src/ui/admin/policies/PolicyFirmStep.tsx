import { policyFieldId, type PolicyErrors, type PolicyFormValues } from './policySchema'
import type { InsuranceCompany, PolicyAgency } from '../../../api/policies'
import { MissingSourceNotice } from '../MissingSourceNotice'
import { SelectField } from '../form/SelectField'

const PLACEHOLDER = 'Seçiniz'
const AGENCY_HINT = 'Önce sigorta şirketi seçin.'

interface PolicyFirmStepProps {
  values: PolicyFormValues
  errors: PolicyErrors
  companies: InsuranceCompany[]
  agencies: PolicyAgency[]
  /** Şirket listesinin kaynağı var mı; üretimde uç olmadığı için boş kalır. */
  hasCompanySource: boolean
  onCompanyChange: (id: number | null) => void
  onAgencyChange: (id: number | null) => void
}

/** Boş dize "seçilmedi" demek; kimlik alanında 0 ile karışmasın diye `null`. */
function toId(value: string): number | null {
  return value === '' ? null : Number(value)
}

function toValue(id: number | null): string {
  return id === null ? '' : String(id)
}

export function PolicyFirmStep({
  values,
  errors,
  companies,
  agencies,
  hasCompanySource,
  onCompanyChange,
  onAgencyChange,
}: PolicyFirmStepProps) {
  if (!hasCompanySource) {
    return <MissingSourceNotice endpointHint="GET /api/insurancecompanies" />
  }

  const isAgencyDisabled = values.insuranceCompanyId === null

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField
        id={policyFieldId('insuranceCompanyId')}
        label="Sigorta Şirketi"
        value={toValue(values.insuranceCompanyId)}
        options={companies.map((company) => ({
          value: String(company.id),
          label: company.name,
        }))}
        placeholder={PLACEHOLDER}
        error={errors.insuranceCompanyId}
        onChange={(value) => onCompanyChange(toId(value))}
      />

      <SelectField
        id={policyFieldId('agencyId')}
        label="Acente / Poliçe Firması"
        value={toValue(values.agencyId)}
        // Liste seçilen şirkete bağlı (gereksinim 16); şirket seçilmeden kutu
        // pasif — boş bir açılır liste "acente yok" gibi okunurdu.
        options={agencies.map((agency) => ({ value: String(agency.id), label: agency.name }))}
        placeholder={PLACEHOLDER}
        hint={isAgencyDisabled ? AGENCY_HINT : undefined}
        isDisabled={isAgencyDisabled}
        error={errors.agencyId}
        onChange={(value) => onAgencyChange(toId(value))}
      />
    </div>
  )
}
