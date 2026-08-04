import { FolderKanban } from 'lucide-react'


import { newProjectFieldId } from './newProjectSchema'
import type { NewProjectForm } from './useNewProjectForm'
import type { NewProjectLookups } from './useNewProjectLookups'
import type { FirmEngineer, Lookup } from '../../../api/projects'
import { DateField } from '../form/DateField'
import { FormCard } from '../form/FormCard'
import { SelectField, type SelectFieldOption } from '../form/SelectField'
import { TextField } from '../form/TextField'

const SELECT_PLACEHOLDER = 'Seçiniz'
const ENGINEER_HINT = 'Yalnızca 1 mühendis seçilebilir.'
const ENGINEER_DISABLED_HINT = 'Önce proje firmasını seçin.'
const END_DATE_DISABLED_HINT = 'Önce iş başlama tarihini seçin.'
const END_DATE_HINT = 'Başlama tarihi değişince iki ay sonrası olarak yeniden hesaplanır.'

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

function toEngineerOptions(engineers: FirmEngineer[]): SelectFieldOption[] {
  return engineers.map((engineer) => ({
    value: String(engineer.id),
    label: engineer.fullName,
  }))
}

interface NewProjectInfoCardProps {
  form: NewProjectForm
  lookups: NewProjectLookups
  isAdmin: boolean
}

export function NewProjectInfoCard({ form, lookups, isAdmin }: NewProjectInfoCardProps) {
  const { values, errors, setValue } = form
  const isStartDateMissing = values.startDate === ''

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
          sunucu token'dan türetiyor, gizlenmiş bir alan yanlış beklenti yaratırdı. */}
      {isAdmin && (
        <SelectField
          id={newProjectFieldId('projectFirmId')}
          label="Proje Firması"
          value={toSelectValue(values.projectFirmId)}
          options={toFirmOptions(lookups.projectFirms)}
          placeholder={SELECT_PLACEHOLDER}
          error={errors.projectFirmId}
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
          error={errors.gasDistributionFirmId}
          isDisabled={values.projectFirmId === null}
          onChange={(value) => setValue('gasDistributionFirmId', toLookupId(value))}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Başlama tarihine ÜST sınır konmaz: sınır konsaydı projeyi ileri
            tarihe kaydırmak için önce bitişi silmek gerekirdi. Sıra kuralını
            bitiş alanı taşıyor. */}
        <DateField
          id={newProjectFieldId('startDate')}
          label="İş Başlama Tarihi"
          value={values.startDate}
          error={errors.startDate}
          onChange={(value) => setValue('startDate', value)}
        />
        <DateField
          id={newProjectFieldId('endDate')}
          label="İş Bitiş Tarihi"
          value={values.endDate}
          // Başlangıçtan önceki gün takvimde hiç seçilemesin; şema da ayrıca doğrular.
          min={values.startDate}
          // Başlama boşken alt sınır da yok: alan açık kalsaydı kullanıcı
          // sınırsız bir bitiş seçip sonra sıraya aykırı bir başlama girebilirdi.
          isDisabled={isStartDateMissing}
          hint={isStartDateMissing ? END_DATE_DISABLED_HINT : END_DATE_HINT}
          error={errors.endDate}
          onChange={(value) => setValue('endDate', value)}
        />
      </div>

      <SelectField
        id={newProjectFieldId('engineerUserId')}
        label="Yetkili Mühendis"
        labelNote="(firmaya kayıtlı mühendisler)"
        value={toSelectValue(values.engineerUserId)}
        options={toEngineerOptions(lookups.engineers)}
        placeholder={SELECT_PLACEHOLDER}
        hint={lookups.isEngineerDisabled ? ENGINEER_DISABLED_HINT : ENGINEER_HINT}
        error={errors.engineerUserId}
        isDisabled={lookups.isEngineerDisabled}
        onChange={(value) => setValue('engineerUserId', toLookupId(value))}
      />
    </FormCard>
  )
}
