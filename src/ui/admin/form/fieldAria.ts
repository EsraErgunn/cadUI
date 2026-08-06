export interface FieldDescription {
  hint?: string
  warning?: string
  error?: string
}

export interface FieldAria {
  /** Yardım metni, uyarı ve hata `aria-describedby` ile girdiye bağlanır;
      ekran okuyucu alana girince hepsini okur. */
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
}

export function hintId(fieldId: string): string {
  return `${fieldId}-hint`
}

export function warningId(fieldId: string): string {
  return `${fieldId}-warning`
}

export function errorId(fieldId: string): string {
  return `${fieldId}-error`
}

/**
 * Girdiye eklenecek erişilebilirlik prop'ları. Tek yerde üretiliyor: her alan
 * bileşeni kendi `aria-describedby` dizesini kursaydı biri er geç unuturdu.
 *
 * Sıra önem sırası: önce hata (kullanıcının önce neyi düzelteceğini bilmesi,
 * alanın ne işe yaradığını duymasından önemli), sonra uyarı, sonra yardım metni.
 *
 * Uyarı `aria-invalid` YAPMAZ: engellemeyen bir bilgidir, alan geçerlidir.
 */
export function buildFieldAria(fieldId: string, { hint, warning, error }: FieldDescription): FieldAria {
  const ids: string[] = []
  if (error !== undefined) ids.push(errorId(fieldId))
  if (warning !== undefined) ids.push(warningId(fieldId))
  if (hint !== undefined) ids.push(hintId(fieldId))

  return {
    'aria-describedby': ids.length === 0 ? undefined : ids.join(' '),
    // `false` yerine undefined: aria-invalid="false" yazmak yerine özniteliği hiç
    // koymamak, yardımcı teknolojilerde daha az gürültü üretir.
    'aria-invalid': error === undefined ? undefined : true,
  }
}
