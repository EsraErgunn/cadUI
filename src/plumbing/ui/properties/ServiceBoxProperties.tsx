import { PropertyCheckboxField } from '../../../ui/properties/PropertyCheckboxField'

/**
 * Servis kutusunun tek özelliği. tesisat_eleman.md: "Servis vanası özelliği
 * olsun ama tıklamayın" — bu SALT OKUNUR bir gösterge, düzenlenebilir bir
 * alan değil (kullanıcı onayı, 2026-08). Her servis kutusunda sabit true
 * olduğu için modelde SAKLANMAZ — saklanacak hiçbir seçime bağlı bilgi yok.
 */
export function ServiceBoxProperties() {
  return (
    <div>
      <PropertyCheckboxField
        label="Servis vanası özelliği"
        checked
        targetKey="serviceBox"
        isReadOnly
      />
    </div>
  )
}
