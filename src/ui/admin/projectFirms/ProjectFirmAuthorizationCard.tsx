import { MapPin, Network, Plus, ShieldCheck } from 'lucide-react'
import { useMemo } from 'react'

import { AuthorizationList } from './AuthorizationList'
import { GasDistributionFirmPicker } from './GasDistributionFirmPicker'
import type { ProjectFirmAuthorization } from './authorizationDraft'
import { useProjectFirmAuthorizationDraft } from './useProjectFirmAuthorizationDraft'
import { adminButtonVariants } from '../adminVariants'
import { DateField } from '../form/DateField'
import { FieldError } from '../form/FieldError'
import { FieldWarning } from '../form/FieldWarning'
import { FormCard } from '../form/FormCard'
import { SelectField } from '../form/SelectField'
import { TextField } from '../form/TextField'

/** Belge: zorunlu alanların etiketinin yanında "*" gösterilir. */
const REQUIRED_MARK = '*'

const SECTION_TITLE = 'G.D. Firması & Bölge Yetkilendirme'

const GROUP_FIELD_ID = 'project-firm-authorization-group'
const GAS_FIRM_FIELD_ID = 'project-firm-authorization-gas-firms'
const CERTIFICATE_FIELD_ID = 'project-firm-authorization-certificate'
const VALID_FROM_FIELD_ID = 'project-firm-authorization-valid-from'
const VALID_TO_FIELD_ID = 'project-firm-authorization-valid-to'

interface ProjectFirmAuthorizationCardProps {
  authorizations: ProjectFirmAuthorization[]
  /** Kaydetmeye çalışılırken liste boşsa dolar (belge madde 28). */
  authorizationError: string | null
  onAdd: (added: ProjectFirmAuthorization[]) => void
  onRemove: (gasDistributionFirmId: number) => void
}

/**
 * Ekranın birinci bölümü. Taslak durumu (`useProjectFirmAuthorizationDraft`)
 * BURADA yaşıyor, formun kendisinde değil: yarım kalmış bir taslak "Kaydet"
 * doğrulamasına karışmamalı — kaydetme yalnız EKLENMİŞ kayıtlara bakar.
 */
export function ProjectFirmAuthorizationCard({
  authorizations,
  authorizationError,
  onAdd,
  onRemove,
}: ProjectFirmAuthorizationCardProps) {
  const draft = useProjectFirmAuthorizationDraft({ authorizations, onAdd })

  // Seçenek DEĞERİ kimlik: grup adı değişse de seçim bozulmasın.
  const groupOptions = useMemo(
    () => draft.groups.map((group) => ({ value: String(group.id), label: group.name })),
    [draft.groups],
  )

  return (
    <FormCard title={SECTION_TITLE} icon={MapPin}>
      <SelectField
        id={GROUP_FIELD_ID}
        label="G.D Firması"
        labelNote={REQUIRED_MARK}
        layout="horizontal"
        leftIcon={Network}
        placeholder="Seçiniz"
        options={groupOptions}
        value={draft.groupId}
        error={draft.errors.group}
        onChange={draft.setGroupId}
      />

      {/* Bildirim seçim kutusunun `aria-describedby`'ına BAĞLANMIYOR: seçim
          değiştiği anda beliriyor ve odak hâlâ kutuda olduğu için `role="status"`
          onu zaten duyuruyor; describedby'a girseydi kutu her odaklanışta
          eski bildirimi tekrar okurdu. */}
      {draft.clearedNotice !== null && (
        <FieldWarning id={`${GROUP_FIELD_ID}-cleared`}>{draft.clearedNotice}</FieldWarning>
      )}

      <GasDistributionFirmPicker
        id={GAS_FIRM_FIELD_ID}
        label="G.D Firması Bölgeleri"
        labelNote={REQUIRED_MARK}
        gasFirms={draft.visibleGasFirms}
        selectedGasFirmId={draft.selectedGasFirmId}
        search={draft.gasFirmSearch}
        isPending={draft.areGasFirmsPending}
        hasSelectedGroup={draft.groupId !== ''}
        error={draft.errors.gasFirms}
        onSearchChange={draft.setGasFirmSearch}
        onSelectGasFirm={draft.selectGasFirm}
      />

      {/* "Yeterlilik No" KALKTI (K102): kayıtta tek numara kaldı.
          ZORUNLU: uç boş sertifika numarasını reddediyor. */}
      <TextField
        id={CERTIFICATE_FIELD_ID}
        label="Sertifika No"
        layout="horizontal"
        leftIcon={ShieldCheck}
        placeholder="Sertifika numarası"
        value={draft.certificateNumber}
        error={draft.errors.certificateNumber}
        onChange={draft.setCertificateNumber}
      />

      {/* Geçerlilik aralığı: başlangıç uçta ZORUNLU, bitiş boş bırakılabilir
          (süresiz). Bitişin `min`i başlangıca bağlı — geçersiz aralık takvimde
          hiç seçilemesin. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <DateField
          id={VALID_FROM_FIELD_ID}
          label="Geçerlilik Başlangıcı"
          value={draft.validFrom}
          error={draft.errors.validFrom}
          onChange={draft.setValidFrom}
        />
        <DateField
          id={VALID_TO_FIELD_ID}
          label="Geçerlilik Bitişi"
          labelNote="(isteğe bağlı)"
          value={draft.validTo}
          min={draft.validFrom === '' ? undefined : draft.validFrom}
          hint="Boş bırakılırsa süresiz sayılır."
          error={draft.errors.validTo}
          onChange={draft.setValidTo}
        />
      </div>

      {/* Mockup: bölümün sağ alt köşesinde, birincil renkte "+ Ekle".
          `type="button"`: form içinde durduğu için varsayılan `submit` olsaydı
          Enter'a basan kullanıcı yetkilendirme eklemek yerine formu gönderirdi. */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={draft.add}
          className={adminButtonVariants({ tone: 'primary', size: 'sm' })}
        >
          <Plus aria-hidden className="size-4" />
          Ekle
        </button>
      </div>

      {authorizationError !== null && (
        <FieldError id="project-firm-authorization-error">{authorizationError}</FieldError>
      )}

      <AuthorizationList authorizations={authorizations} onRemove={onRemove} />
    </FormCard>
  )
}
