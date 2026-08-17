import { useQuery } from '@tanstack/react-query'
import { MapPin } from 'lucide-react'

import { newProjectFieldId } from './newProjectSchema'
import type { NewProjectForm } from './useNewProjectForm'
import { getCities, getCityDistricts } from '../../../api/projects'
import { SelectField } from '../form/SelectField'

/** İl listesi oturum boyunca değişmez (81 il, seeder ile sabit). */
const CITY_STALE_MS = 60 * 60 * 1000

const NO_SELECTION = ''

const SELECT_PLACEHOLDER = 'Seçiniz'
const LOADING_PLACEHOLDER = 'Yükleniyor…'
const NO_CITY_PLACEHOLDER = 'Önce il seçiniz'

/**
 * Liste çekilemediğinde kutu BOŞ kalmamalı: kullanıcı ilinin/ilçesinin sistemde
 * olmadığını sanıyordu. Mesaj sebebi söyler ve ne yapılacağını yazar.
 */
const CITY_ERROR = 'İl listesi yüklenemedi. Sayfayı yenileyip tekrar deneyin.'
const DISTRICT_ERROR = 'İlçe listesi yüklenemedi. İli tekrar seçin.'

function selectPlaceholder(isPending: boolean): string {
  return isPending ? LOADING_PLACEHOLDER : SELECT_PLACEHOLDER
}

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

  const {
    data: cities,
    isPending: areCitiesPending,
    isError: haveCitiesFailed,
  } = useQuery({
    queryKey: ['cities'],
    queryFn: ({ signal }) => getCities(signal),
    staleTime: CITY_STALE_MS,
  })

  const {
    data: districts,
    isPending: areDistrictsPending,
    isError: haveDistrictsFailed,
  } = useQuery({
    queryKey: ['districts', values.cityId],
    queryFn: ({ signal }) => getCityDistricts(values.cityId ?? 0, signal),
    enabled: values.cityId !== null,
    staleTime: CITY_STALE_MS,
  })

  const isCitySelected = values.cityId !== null
  // Doğrulama hatasının ÖNÜNDE: liste hiç gelmediyse "seçiniz" demenin anlamı yok.
  const cityError = haveCitiesFailed ? CITY_ERROR : errors.cityId
  const districtError = haveDistrictsFailed ? DISTRICT_ERROR : errors.districtId

  const handleCityChange = (raw: string) => {
    const cityId = raw === NO_SELECTION ? null : Number(raw)
    setValue('cityId', cityId)
    // İl değişti: eski ilçe artık geçerli olmayabilir.
    setValue('districtId', null)
  }

  return (
    <div className="grid gap-4 @md:grid-cols-2">
      <SelectField
        id={newProjectFieldId('cityId')}
        label="İl"
        labelNote="*"
        leftIcon={MapPin}
        placeholder={selectPlaceholder(areCitiesPending)}
        value={values.cityId === null ? NO_SELECTION : String(values.cityId)}
        options={(cities ?? []).map((city) => ({
          value: String(city.id),
          label: city.name,
        }))}
        error={cityError}
        onChange={handleCityChange}
      />

      <SelectField
        id={newProjectFieldId('districtId')}
        label="İlçe"
        labelNote="*"
        placeholder={
          isCitySelected ? selectPlaceholder(areDistrictsPending) : NO_CITY_PLACEHOLDER
        }
        value={values.districtId === null ? NO_SELECTION : String(values.districtId)}
        options={(districts ?? []).map((district) => ({
          value: String(district.id),
          label: district.name,
        }))}
        // Hata durumunda da pasif: seçilecek bir şey yok, kutu boş açılıp
        // kullanıcıyı "ilçem yok" sanısına düşürmesin.
        isDisabled={!isCitySelected || areDistrictsPending || haveDistrictsFailed}
        error={districtError}
        onChange={(raw) => setValue('districtId', raw === NO_SELECTION ? null : Number(raw))}
      />
    </div>
  )
}
