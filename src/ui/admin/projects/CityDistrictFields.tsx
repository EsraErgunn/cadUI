import { useQuery } from '@tanstack/react-query'
import { MapPin } from 'lucide-react'

import { newProjectFieldId } from './newProjectSchema'
import type { NewProjectForm } from './useNewProjectForm'
import { getCities, getCityDistricts } from '../../../api/projects'
import { SelectField } from '../form/SelectField'

/** İl listesi oturum boyunca değişmez (81 il, seeder ile sabit). */
const CITY_STALE_MS = 60 * 60 * 1000

const NO_SELECTION = ''

interface CityDistrictFieldsProps {
  form: NewProjectForm
}

/**
 * İl ve ilçe seçimi. İkisi de ZORUNLU (`newProjectSchema`).
 *
 * İlçe kutusu il seçilene kadar PASİF: ilçeleri veren uç il kimliği istiyor
 * (`GET /api/cities/{cityId}/districts`), ilsiz bir ilçe listesi yok. İl
 * değişince ilçe seçimi TEMİZLENİR — eski ilçe yeni ilin listesinde bulunmaz
 * ve ekranda geçerliymiş gibi durup sessizce yanlış kayıt üretirdi.
 */
export function CityDistrictFields({ form }: CityDistrictFieldsProps) {
  const { values, errors, setValue } = form

  const { data: cities } = useQuery({
    queryKey: ['cities'],
    queryFn: ({ signal }) => getCities(signal),
    staleTime: CITY_STALE_MS,
  })

  const { data: districts, isPending: areDistrictsPending } = useQuery({
    queryKey: ['districts', values.cityId],
    queryFn: ({ signal }) => getCityDistricts(values.cityId ?? 0, signal),
    enabled: values.cityId !== null,
    staleTime: CITY_STALE_MS,
  })

  const handleCityChange = (raw: string) => {
    const cityId = raw === NO_SELECTION ? null : Number(raw)
    setValue('cityId', cityId)
    // İl değişti: eski ilçe artık geçerli olmayabilir.
    setValue('districtId', null)
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SelectField
        id={newProjectFieldId('cityId')}
        label="İl"
        labelNote="*"
        leftIcon={MapPin}
        placeholder="Seçiniz"
        value={values.cityId === null ? NO_SELECTION : String(values.cityId)}
        options={(cities ?? []).map((city) => ({
          value: String(city.id),
          label: city.name,
        }))}
        error={errors.cityId}
        onChange={handleCityChange}
      />

      <SelectField
        id={newProjectFieldId('districtId')}
        label="İlçe"
        labelNote="*"
        placeholder={values.cityId === null ? 'Önce il seçiniz' : 'Seçiniz'}
        value={values.districtId === null ? NO_SELECTION : String(values.districtId)}
        options={(districts ?? []).map((district) => ({
          value: String(district.id),
          label: district.name,
        }))}
        isDisabled={values.cityId === null || areDistrictsPending}
        error={errors.districtId}
        onChange={(raw) => setValue('districtId', raw === NO_SELECTION ? null : Number(raw))}
      />
    </div>
  )
}
