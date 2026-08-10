# open-question: Proje firmaları listesinin eksik alanları ve yetki bağı

Ekran çalışıyor (`pages/ProjectFirmsPage.tsx`) ama gereksinimin istediği verinin
bir kısmı sunucuda YOK. Bu konularda **varsayım kodlama** — aşağıdakiler
doğrulanmış eksikler, tasarım tercihi değil.

## Uç ne veriyor

`GET /api/projectfirms` → düz dizi, sorgu parametresi yok:

```
id, companyType, title, taxNumber, contactPerson, phone, email
```

`GET /api/projectfirms/{id}` (detay) bunlara ek olarak `accountingCode`,
`serialNumber`, `phone2`, `address` taşıyor.

## Eksikler ve bugünkü davranış

| Sütun | Kaynak | Bugün |
|-------|--------|-------|
| Seri No | yalnız DETAY yanıtında (`serialNumber`) | "-" |
| Yeter No | uçta HİÇ yok | "-" |
| Gsm | yalnız DETAY yanıtında (`phone2`) | "-" |
| G.D. Firması | bağı kuran uç YOK | "-" |

Satır başına detay isteği atılmadı: 30 kayıt = 30 istek.

## KK-5 karşılanmıyor

"Bir firmanın her G.D. yetkisi ayrı satır" kuralı uygulanamıyor — uç **firma
bazlı** dönüyor ve istemcide düzleştirilecek yetki verisi de yok. Bu yüzden
başlıktaki adet **tekil firma sayısı**, yetkilendirme satırı sayısı değil.

Yetki bağını veren uç geldiğinde değişecek yerler: `api/projectFirmDto.ts`
(eşleme), `api/projectFirmListQuery.ts` (adet), satır anahtarı
(`ProjectFirmsPage` → `rowKey`), `projectFirmColumns.tsx` (G.D. hücresi).

## Filtre paneli neden pasif

G.D. firması / bölge / yeterlilik kutuları `disabled` + sebebini söyleyen ipucu.
Süzülselerdi ilk seçimde liste boşalır, kullanıcı veri kaybettiğini sanardı —
gaz dağıtım firmaları ekranındaki bölge süzgeciyle aynı karar
(bkz. [admin-list-state](./admin-list-state.md), docs/kararlar.md K27 ve K29).

## Arama: `includesTr`, `toLocaleLowerCase('tr')` DEĞİL

`toLocaleLowerCase('tr')` 'I' → 'ı', 'İ' → 'i' verir; düz klavyeyle "ISTANBUL"
yazan kullanıcı "İstanbul ..." ünvanını bulamaz. `includesTr` üç harfi de 'i'ye
katladığı için iki yön de eşleşir (bkz. [turkish-collation](./turkish-collation.md)).

## Debounce'lu aramanın iki tuzağı

`useDebouncedSearchDraft` — kutunun taslağı bileşende, uygulanan sorgu URL'de.

- Kutuyu `key={nameQuery}` ile yeniden kurma numarası burada KULLANILAMAZ:
  arama yazarken uygulandığı için kutu her 300 ms'de kurulur ve **odak kaybolur**.
  Gaz firmaları ekranında sorun değil, orada arama Enter'a bağlı.
- URL'e `replace` ile yazılır, yoksa her tuş vuruşu geçmişe kayıt bırakır.
