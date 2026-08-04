import { Flame } from 'lucide-react'

import { MAX_CAPACITY_CUBIC_METER_PER_HOUR, newProjectFieldId } from './newProjectSchema'
import type { NewProjectForm } from './useNewProjectForm'
import type { NewProjectLookups } from './useNewProjectLookups'
import {
  BUILDING_USAGE_TYPES,
  BUILDING_USAGE_TYPE_LABELS,
  type ParametricOption,
} from '../../../api/projects'
import { CheckboxField } from '../form/CheckboxField'
import { FormCard } from '../form/FormCard'
import { NumberStepperField } from '../form/NumberStepperField'
import { SelectField, type SelectFieldOption } from '../form/SelectField'
import { TextAreaField } from '../form/TextAreaField'

const SELECT_PLACEHOLDER = 'Seçiniz'
const PARAMETRIC_NOTE = '(parametrik)'
const UNIT_CAPACITY = 'm³/h'
const UNIT_PRESSURE = 'mbar'
const COVER_NOTE_HINT =
  'Onay mühendisi açıklamasını proje imzalama aşamasında girebilirsiniz.'

/** Bina kullanımı parametrik DEĞİL: seçenekleri sözleşmede sabit. */
const BUILDING_USAGE_OPTIONS: SelectFieldOption[] = BUILDING_USAGE_TYPES.map((code) => ({
  value: code,
  label: BUILDING_USAGE_TYPE_LABELS[code],
}))

function toParametricOptions(options: ParametricOption[]): SelectFieldOption[] {
  return options.map((option) => ({ value: option.code, label: option.label }))
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
        id={newProjectFieldId('projectType')}
        label="Proje Tipi"
        labelNote={PARAMETRIC_NOTE}
        value={values.projectType}
        options={toParametricOptions(lookups.projectTypes)}
        placeholder={SELECT_PLACEHOLDER}
        error={errors.projectType}
        onChange={(value) => setValue('projectType', value)}
      />

      <CheckboxField
        id={newProjectFieldId('isPermitProject')}
        label="Ruhsat Proje"
        value={values.isPermitProject}
        hint="İşaretliyse proje, yapı ruhsatına bağlı proje olarak kaydedilir."
        error={errors.isPermitProject}
        onChange={(value) => setValue('isPermitProject', value)}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id={newProjectFieldId('heatingType')}
          label="Isınma Tipi"
          labelNote={PARAMETRIC_NOTE}
          value={values.heatingType}
          options={toParametricOptions(lookups.heatingTypes)}
          placeholder={SELECT_PLACEHOLDER}
          error={errors.heatingType}
          onChange={(value) => setValue('heatingType', value)}
        />
        <SelectField
          id={newProjectFieldId('buildingUsageType')}
          label="Bina Kullanımı Tipi"
          value={values.buildingUsageType}
          options={BUILDING_USAGE_OPTIONS}
          placeholder={SELECT_PLACEHOLDER}
          error={errors.buildingUsageType}
          onChange={(value) => setValue('buildingUsageType', value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberStepperField
          id={newProjectFieldId('capacityCubicMeterPerHour')}
          label={`Kapasite (${UNIT_CAPACITY})`}
          value={values.capacityCubicMeterPerHour}
          max={MAX_CAPACITY_CUBIC_METER_PER_HOUR}
          unit={UNIT_CAPACITY}
          error={errors.capacityCubicMeterPerHour}
          onChange={(value) => setValue('capacityCubicMeterPerHour', value)}
        />
        <NumberStepperField
          id={newProjectFieldId('serviceBoxPressureMbar')}
          label={`S.K. Basıncı (${UNIT_PRESSURE})`}
          labelNote="(servis kutusu)"
          value={values.serviceBoxPressureMbar}
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
        hint={COVER_NOTE_HINT}
        error={errors.coverNote}
        onChange={(value) => setValue('coverNote', value)}
      />
    </FormCard>
  )
}
