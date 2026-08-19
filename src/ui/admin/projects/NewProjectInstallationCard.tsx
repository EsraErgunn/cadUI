import { Flame } from 'lucide-react'

import { MAX_CAPACITY_CUBIC_METER_PER_HOUR, newProjectFieldId } from './newProjectSchema'
import type { NewProjectForm } from './useNewProjectForm'
import type { NewProjectLookups } from './useNewProjectLookups'
import type { CodeOption } from '../../../api/codes'
import { CheckboxField } from '../form/CheckboxField'
import { FormCard } from '../form/FormCard'
import { NumberStepperField } from '../form/NumberStepperField'
import { SelectField, type SelectFieldOption } from '../form/SelectField'
import { TextAreaField } from '../form/TextAreaField'

const SELECT_PLACEHOLDER = 'Seçiniz'
const PARAMETRIC_NOTE = '(parametrik)'
const UNIT_CAPACITY = 'm³/h'
const UNIT_PRESSURE = 'mbar'
const NO_SELECTION = ''

/** Kullanıcı ADI görür, form KİMLİĞİ tutar — gövdeye giden değer o (api/codes.ts). */
function toCodeOptions(codes: CodeOption[]): SelectFieldOption[] {
  return codes.map((code) => ({ value: String(code.id), label: code.name }))
}

function toSelectValue(codeId: number | null): string {
  return codeId === null ? NO_SELECTION : String(codeId)
}

function toCodeId(value: string): number | null {
  const parsed = Number(value)
  return value === NO_SELECTION || !Number.isInteger(parsed) ? null : parsed
}

interface NewProjectInstallationCardProps {
  form: NewProjectForm
  lookups: NewProjectLookups
}

export function NewProjectInstallationCard({ form, lookups }: NewProjectInstallationCardProps) {
  const { values, errors, setValue } = form

  return (
    <FormCard title="Tesisat Bilgileri" icon={Flame}>
      <SelectField
        id={newProjectFieldId('projectTypeCodeId')}
        label="Proje Tipi"
        labelNote={PARAMETRIC_NOTE}
        value={toSelectValue(values.projectTypeCodeId)}
        options={toCodeOptions(lookups.projectTypes)}
        placeholder={SELECT_PLACEHOLDER}
        error={errors.projectTypeCodeId}
        onChange={(value) => setValue('projectTypeCodeId', toCodeId(value))}
      />

      <CheckboxField
        id={newProjectFieldId('isPermitProject')}
        label="Ruhsat Proje"
        value={values.isPermitProject}
        error={errors.isPermitProject}
        onChange={(value) => setValue('isPermitProject', value)}
      />

      <div className="grid gap-4 @md:grid-cols-2">
        <SelectField
          id={newProjectFieldId('heatingTypeCodeId')}
          label="Isınma Tipi"
          labelNote={PARAMETRIC_NOTE}
          value={toSelectValue(values.heatingTypeCodeId)}
          options={toCodeOptions(lookups.heatingTypes)}
          placeholder={SELECT_PLACEHOLDER}
          error={errors.heatingTypeCodeId}
          onChange={(value) => setValue('heatingTypeCodeId', toCodeId(value))}
        />
        <SelectField
          id={newProjectFieldId('buildingUsageTypeCodeId')}
          label="Bina Kullanımı Tipi"
          labelNote={PARAMETRIC_NOTE}
          value={toSelectValue(values.buildingUsageTypeCodeId)}
          options={toCodeOptions(lookups.buildingUsageTypes)}
          placeholder={SELECT_PLACEHOLDER}
          error={errors.buildingUsageTypeCodeId}
          onChange={(value) => setValue('buildingUsageTypeCodeId', toCodeId(value))}
        />
      </div>

      <div className="grid gap-4 @md:grid-cols-2">
        <NumberStepperField
          id={newProjectFieldId('capacityCubicMeterPerHour')}
          label={`Kapasite (${UNIT_CAPACITY})`}
          value={values.capacityCubicMeterPerHour}
          max={MAX_CAPACITY_CUBIC_METER_PER_HOUR}
          isInteger
          unit={UNIT_CAPACITY}
          error={errors.capacityCubicMeterPerHour}
          onChange={(value) => setValue('capacityCubicMeterPerHour', value)}
        />
        <NumberStepperField
          id={newProjectFieldId('serviceBoxPressureMbar')}
          label={`S.K. Basıncı (${UNIT_PRESSURE})`}
          labelNote="(servis kutusu)"
          value={values.serviceBoxPressureMbar}
          isInteger
          unit={UNIT_PRESSURE}
          error={errors.serviceBoxPressureMbar}
          onChange={(value) => setValue('serviceBoxPressureMbar', value)}
        />
      </div>

      <TextAreaField
        id={newProjectFieldId('coverNote')}
        label="Proje Kapak Açıklama"
        value={values.coverNote}
        placeholder="Açıklama"
        error={errors.coverNote}
        onChange={(value) => setValue('coverNote', value)}
      />
    </FormCard>
  )
}
