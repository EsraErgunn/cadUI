import { Building2 } from 'lucide-react'

import { CityDistrictFields } from './CityDistrictFields'
import { newProjectFieldId } from './newProjectSchema'
import type { NewProjectForm } from './useNewProjectForm'
import { FormCard } from '../form/FormCard'
import { NumberStepperField } from '../form/NumberStepperField'
import { TextAreaField } from '../form/TextAreaField'
import { TextField } from '../form/TextField'

const UNIT_SQUARE_METER = 'm²'

interface NewProjectBuildingCardProps {
  form: NewProjectForm
}

export function NewProjectBuildingCard({ form }: NewProjectBuildingCardProps) {
  const { values, errors, setValue } = form

  return (
    <FormCard title="Yapı Bilgileri" icon={Building2}>
      <TextField
        id={newProjectFieldId('connectionObject')}
        label="Bağlantı Nesnesi"
        value={values.connectionObject}
        placeholder="Bağlantı nesnesi"
        error={errors.connectionObject}
        onChange={(value) => setValue('connectionObject', value)}
      />

      {/* İl/ilçe adresin ÜSTÜNDE: kullanıcı önce kaba konumu, sonra açık adresi
          giriyor — uç da ikisini ayrı alanlarda saklıyor. */}
      <CityDistrictFields form={form} />

      <TextAreaField
        id={newProjectFieldId('address')}
        label="Adres"
        value={values.address}
        placeholder="Açık adres"
        error={errors.address}
        onChange={(value) => setValue('address', value)}
      />

      {/* Kat ve bodrum adedi bina künyesinin parçası: uç ikisini de
          `Building` üzerinde saklıyor ve proje detayındaki "Kat Adedi" satırı
          buradan doluyor. */}
      <div className="grid gap-4 @md:grid-cols-2">
        <NumberStepperField
          id={newProjectFieldId('floorCount')}
          label="Kat Adedi"
          value={values.floorCount}
          isInteger
          error={errors.floorCount}
          onChange={(value) => setValue('floorCount', value)}
        />
        <NumberStepperField
          id={newProjectFieldId('basementCount')}
          label="Bodrum Adedi"
          value={values.basementCount}
          isInteger
          error={errors.basementCount}
          onChange={(value) => setValue('basementCount', value)}
        />
      </div>

      <div className="grid gap-4 @md:grid-cols-2">
        <NumberStepperField
          id={newProjectFieldId('apartmentCount')}
          label="Daire Sayısı"
          value={values.apartmentCount}
          isInteger
          error={errors.apartmentCount}
          onChange={(value) => setValue('apartmentCount', value)}
        />
        <NumberStepperField
          id={newProjectFieldId('workplaceCount')}
          label="İşyeri Sayısı"
          value={values.workplaceCount}
          isInteger
          error={errors.workplaceCount}
          onChange={(value) => setValue('workplaceCount', value)}
        />
      </div>

      <div className="grid gap-4 @md:grid-cols-2">
        <NumberStepperField
          id={newProjectFieldId('areaSquareMeters')}
          label={`Alan (${UNIT_SQUARE_METER})`}
          value={values.areaSquareMeters}
          isInteger
          unit={UNIT_SQUARE_METER}
          error={errors.areaSquareMeters}
          onChange={(value) => setValue('areaSquareMeters', value)}
        />
        <TextField
          id={newProjectFieldId('parcelInfo')}
          label="Ada/Pafta/Parsel"
          value={values.parcelInfo}
          error={errors.parcelInfo}
          onChange={(value) => setValue('parcelInfo', value)}
        />
      </div>
    </FormCard>
  )
}
