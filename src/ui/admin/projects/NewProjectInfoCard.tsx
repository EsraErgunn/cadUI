import { FolderKanban } from 'lucide-react'

import { newProjectFieldId } from './newProjectSchema'
import type { NewProjectForm } from './useNewProjectForm'
import type { NewProjectLookups } from './useNewProjectLookups'
import type { Lookup } from '../../../api/projects'
import { FormCard } from '../form/FormCard'
import { SelectField, type SelectFieldOption } from '../form/SelectField'
import { TextField } from '../form/TextField'

const SELECT_PLACEHOLDER = 'Seçiniz'

/**
 * Liste çekilemediğinde kutu BOŞ kalmamalı: kullanıcı firmasının sistemde
 * olmadığını sanıyordu (il/ilçe kutularıyla aynı desen).
 */
const PROJECT_FIRM_ERROR = 'Proje firması listesi yüklenemedi. Sayfayı yenileyip tekrar deneyin.'
const GAS_FIRM_ERROR = 'Gaz dağıtım firması listesi yüklenemedi. Sayfayı yenileyip tekrar deneyin.'
/** Liste geldi ama boş: firmanın geçerli yetkisi yok (süresi dolmuş olabilir). */
const NO_AUTHORIZED_GAS_FIRM =
  'Seçilen proje firmasının geçerli bir yetkisi yok. Yetki süresi dolmuş olabilir.'

/** İki durum da kutuyu boş bırakıyor ama sebepleri farklı; mesaj da farklı olmalı. */
function gasFirmMessage(lookups: NewProjectLookups): string | undefined {
  if (lookups.haveGasFirmsFailed) return GAS_FIRM_ERROR
  if (lookups.hasNoAuthorizedGasFirm) return NO_AUTHORIZED_GAS_FIRM

  return undefined
}

function toSelectValue(id: number | null): string {
  return id === null ? '' : String(id)
}

function toLookupId(value: string): number | null {
  const parsed = Number(value)
  return value === '' || !Number.isInteger(parsed) ? null : parsed
}

function toFirmOptions(firms: Lookup[]): SelectFieldOption[] {
  return firms.map((firm) => ({ value: String(firm.id), label: firm.name }))
}

interface NewProjectInfoCardProps {
  form: NewProjectForm
  lookups: NewProjectLookups
  isAdmin: boolean
}

export function NewProjectInfoCard({ form, lookups, isAdmin }: NewProjectInfoCardProps) {
  const { values, errors, setValue } = form

  return (
    <FormCard title="Proje Bilgileri" icon={FolderKanban}>
      <TextField
        id={newProjectFieldId('name')}
        label="Proje Adı"
        value={values.name}
        placeholder="Proje adını giriniz"
        error={errors.name}
        onChange={(value) => setValue('name', value)}
      />

      {/* Firma alanları proje firması kullanıcısında DOM'a hiç girmez: değeri
          sunucu token'dan türetiyor, gizlenmiş bir alan yanlış beklenti yaratırdı.

          DİKKAT — bu iki seçim GÖVDEYE GİTMİYOR. `POST /api/projects` firma
          kimliği değil `projectFirmAuthorizationId` (proje firmasının bir gaz
          dağıtım firmasındaki YETKİ kaydı) istiyor ve o kimlikleri listeleyen
          bir uç yok; değer bugün `api/projects.ts` içinde sabit. Seçimler
          doğrulamayı besliyor ve ekranda duruyor ama kaydedilen projeye
          yansımıyor. Uç açılınca yetki kimliği bu seçimlerden türeyecek —
          değişecek tek yer `SEEDED_PROJECT_FIRM_AUTHORIZATION_ID`. */}
      {isAdmin && (
        <SelectField
          id={newProjectFieldId('projectFirmId')}
          label="Proje Firması"
          value={toSelectValue(values.projectFirmId)}
          options={toFirmOptions(lookups.projectFirms)}
          placeholder={SELECT_PLACEHOLDER}
          // Doğrulama hatasının ÖNÜNDE: liste hiç gelmediyse "seçiniz" demenin
          // anlamı yok.
          error={lookups.haveProjectFirmsFailed ? PROJECT_FIRM_ERROR : errors.projectFirmId}
          isDisabled={lookups.haveProjectFirmsFailed}
          onChange={(value) => setValue('projectFirmId', toLookupId(value))}
        />
      )}

      {isAdmin && (
        <SelectField
          id={newProjectFieldId('gasDistributionFirmId')}
          label="Gaz Dağıtım Firması"
          value={toSelectValue(values.gasDistributionFirmId)}
          options={toFirmOptions(lookups.gasFirms)}
          placeholder={SELECT_PLACEHOLDER}
          error={gasFirmMessage(lookups) ?? errors.gasDistributionFirmId}
          // Liste seçili proje firmasının BUGÜN geçerli yetkilerinden türüyor
          // (`GET /api/project-firm-authorizations`); süresi dolmuş yetkiler
          // elenmiş oluyor. Kutu proje firması seçilene kadar pasif — seçenekler
          // o firmaya bağlı olduğu için öncesinde gösterilecek bir şey yok.
          isDisabled={lookups.haveGasFirmsFailed || values.projectFirmId === null}
          onChange={(value) => setValue('gasDistributionFirmId', toLookupId(value))}
        />
      )}
    </FormCard>
  )
}
