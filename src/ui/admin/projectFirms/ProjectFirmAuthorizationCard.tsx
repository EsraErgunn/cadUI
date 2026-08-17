import { BadgeCheck, MapPin, Network, Plus, ShieldCheck } from 'lucide-react'
import { useMemo } from 'react'

import { AuthorizationList } from './AuthorizationList'
import { GasDistributionFirmPicker } from './GasDistributionFirmPicker'
import type { ProjectFirmAuthorization } from './authorizationDraft'
import { useProjectFirmAuthorizationDraft } from './useProjectFirmAuthorizationDraft'
import { adminButtonVariants } from '../adminVariants'
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
const QUALIFICATION_FIELD_ID = 'project-firm-authorization-qualification'
const CERTIFICATE_FIELD_ID = 'project-firm-authorization-certificate'

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
        checkedGasFirmIds={draft.checkedGasFirmIds}
        search={draft.gasFirmSearch}
        isPending={draft.areGasFirmsPending}
        hasSelectedGroup={draft.groupId !== ''}
        error={draft.errors.gasFirms}
        onSearchChange={draft.setGasFirmSearch}
        onToggleGasFirm={draft.toggleGasFirm}
        onToggleAll={draft.toggleAllVisibleGasFirms}
      />

      <TextField
        id={QUALIFICATION_FIELD_ID}
        label="Yeterlilik No"
        labelNote={REQUIRED_MARK}
        layout="horizontal"
        leftIcon={BadgeCheck}
        placeholder="Yeterlilik numarası"
        value={draft.qualificationNumber}
        error={draft.errors.qualificationNumber}
        onChange={draft.setQualificationNumber}
      />

      <TextField
        id={CERTIFICATE_FIELD_ID}
        label="Sertifika No"
        layout="horizontal"
        leftIcon={ShieldCheck}
        placeholder="Sertifika numarası"
        value={draft.certificateNumber}
        onChange={draft.setCertificateNumber}
      />

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
