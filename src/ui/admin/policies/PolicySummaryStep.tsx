import { parsePolicyAmount, type PolicyFormValues } from './policySchema'
import { POLICY_METHOD_LABELS, type InsuranceCompany } from '../../../api/policies'
import { InfoRow } from '../InfoRow'
import { formatCurrency, formatPlainDate } from '../projectDetail/projectDetailFormat'

const VALIDITY_SEPARATOR = ' – '

interface PolicySummaryStepProps {
  values: PolicyFormValues
  companies: InsuranceCompany[]
}

/** Geçerlilik İKİ tarihi birlikte gösterir; biri eksikse satır boş sayılır —
    yarım aralık ("01.01.2026 – ") tarih girilmiş izlenimi verirdi. */
function buildValidity(startDate: string, endDate: string): string | null {
  const start = formatPlainDate(startDate)
  const end = formatPlainDate(endDate)

  return start === null || end === null ? null : `${start}${VALIDITY_SEPARATOR}${end}`
}

/**
 * Salt okunur özet (gereksinim 18). Alanlar formun kendi değerlerinden
 * türetiliyor; ikinci bir istek yapılmıyor — kayıt henüz oluşmadı.
 */
export function PolicySummaryStep({ values, companies }: PolicySummaryStepProps) {
  const company = companies.find((candidate) => candidate.id === values.insuranceCompanyId)

  return (
    <dl className="overflow-hidden rounded-xl border border-edge bg-surface-sunken">
      <InfoRow label="Yöntem" value={POLICY_METHOD_LABELS[values.method]} />
      <InfoRow label="Sigorta Şirketi" value={company?.name ?? null} />
      <InfoRow label="Poliçe No" value={values.policyNumber} />
      <InfoRow label="Teminat" value={formatCurrency(parsePolicyAmount(values.amountText))} />
      <InfoRow label="Geçerlilik" value={buildValidity(values.startDate, values.endDate)} />
    </dl>
  )
}
