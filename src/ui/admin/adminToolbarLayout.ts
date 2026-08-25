/**
 * Liste ekranlarının başlık satırındaki araç çubuğunun YERLEŞİM sınıfları.
 *
 * `adminVariants.ts`'te değil: orası buton/rozet/alan GÖRÜNÜMÜNÜ tanımlıyor,
 * buradakiler kap davranışı. Birden çok liste ekranı (gaz dağıtım firmaları,
 * proje firmaları, proje firması kullanıcıları) aynı çubuğu kuruyor; sınıf
 * dizesi her ekranda kopyalanınca biri güncellenip diğerleri unutuluyordu.
 */

/**
 * Araç çubuğu satırı (arama + Filtrele + birincil eylem).
 *
 * `sm` ALTINDA satırın tamamını kaplar ve sola yaslanır: sağa yaslı dar bir blok
 * başlığın altında asimetrik duruyor, düğmeler de tek tek alt satıra düşüyordu.
 */
export const ADMIN_TOOLBAR_ROW =
  'flex w-full flex-wrap items-center gap-3 sm:w-auto sm:justify-end'

/** Çubuğun içindeki form; satırı kaplama davranışını sürdürür. */
export const ADMIN_TOOLBAR_FORM = 'flex w-full flex-wrap items-center gap-2 sm:w-auto'

/**
 * Arama kutusunun ikonu barındıran sarmalayıcısı.
 *
 * `sm` altında `w-full`: kutu KENDİ SATIRINI alır, düğmeler altına sarar.
 * Önce `flex-1 min-w-0` yazılmıştı ve gerçek tarayıcıda kutu daralmak yerine
 * SIFIRLANIYORDU — "Filtrele" + birincil düğme satırı doldurunca esneyen kutuya
 * genişlik kalmıyordu (375/480/640 px'te ölçüldü: genişlik = 0). `w-full` sarma
 * davranışını zorluyor, böylece kutu her zaman kullanılabilir kalıyor.
 */
export const ADMIN_TOOLBAR_SEARCH_WRAPPER = 'relative w-full min-w-0 sm:w-auto sm:flex-none'

/** Arama girdisinin genişliği: dar ekranda esner, `sm` ve üstünde sabit. */
export const ADMIN_TOOLBAR_SEARCH_FIELD = 'w-full pl-9 sm:w-56'
