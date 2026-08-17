# open-question: Proje firmaları listesinin eksik alanları ve KK-5 satır kararı

Ekran çalışıyor (`pages/ProjectFirmsPage.tsx`). Alanların bir kısmı hâlâ
sunucuda YOK; bunlarda **varsayım kodlama**. G.D. firması bağı ise ARTIK VAR —
aşağıdaki tablo günceldir.

## Uç ne veriyor

`GET /api/projectfirms` → sayfalı zarf (K83), satır alanları:

```
id, companyType, title, taxNumber, contactPerson, phone, email
```

`GET /api/projectfirms/{id}` (detay) bunlara ek olarak `accountingCode`,
`serialNumber`, `phone2`, `address` taşıyor.

`GET /api/project-firm-authorizations` firma ↔ G.D. firması bağını veriyor;
sütun oradan doluyor.

## Eksikler ve bugünkü davranış

| Sütun | Kaynak | Bugün |
|-------|--------|-------|
| Seri No | yalnız DETAY yanıtında (`serialNumber`) | "-" |
| Yeter No | uçta HİÇ yok | "-" |
| Gsm | yalnız DETAY yanıtında (`phone2`) | "-" |
| G.D. Firması | `GET /api/project-firm-authorizations` | **dolu, ÇOĞUL** |

Satır başına detay isteği atılmadı: 30 kayıt = 30 istek.

## G.D. firması sütunu: iki uç, istemcide birleştirme

Bağı tek başına veren uç yok. `buildProjectFirmRows`
(`api/projectFirmListQuery.ts`) firma listesiyle yürürlükteki yetkileri satırda
birleştirir ve `ProjectFirmRow.gasFirms` üretir — **çoğul**, çünkü bir firma
aynı anda birden fazla G.D. firmasında yetkili olabiliyor. Adlar hücrede alt
alta (`<ul>`), her biri ayrı bağlantı.

- Yetkisi olmayan firma listeden DÜŞMEZ, hücresi ortak `EmptyValue` işaretini
  gösterir — "yetki yok" gibi bir metin YAZILMAZ (iç birleştirme yapılsaydı
  liste sessizce firma kaybederdi). Tablonun yerel tiresi de bu turda
  `EmptyValue`'ya bağlandı: eskisi ekran okuyucuya "-" diye okunuyordu.
- Süresi dolmuş yetki gelmez: süzme `getEffectiveAuthorizations`'ta, tek kapı
  (bkz. docs/kararlar.md K86).
- Yetki sorgusu AYRI `queryKey`'de ve tabloyu BEKLETMEZ; firma listesi anahtarı
  altı ekranda ortak (K75), yetki isteği oraya eklenseydi beş ekran boşuna
  ikinci istek atardı.
- Bağ çekilemezse kapatılabilir uyarı şeridi çıkar — boş sütun "hiç yetkisi
  yok" gibi okunur.

## KK-5 hâlâ UYGULANMADI — sebep artık veri değil, EKRAN

"Bir firmanın her G.D. yetkisi ayrı satır" kuralı için veri artık var; satırı
düzleştirmek teknik olarak mümkün. Uygulanmadı çünkü **İşlemler sütunu FİRMA
bazlı**:

- "Sil" `deleteProjectFirm(firm.id)` çağırıyor, onay metni "Firma listelerden
  kaldırılacak" diyor. Üç yetkisi olan firma üç satır olsaydı aynı yıkıcı düğme
  üç kez görünür, birine basmak üç satırı birden silerdi.
- "Firma Adı" bağlantısı da firma güncelleme ekranına gidiyor; tekrarlanan
  satırlarda aynı hedefi gösterirdi.
- Yetki bazlı bir eylem sunulamıyor: yetki yazma uçları S1/S2 nedeniyle hâlâ
  mock (`saveProjectFirmAuthorizations`).
- Yetkisi olmayan firma satırsız kalmamalı, yani düzleştirme yine de "-" satırı
  üretmek zorunda.

Adet bu yüzden hâlâ **tekil firma sayısı**. Karar verildi (2026-08-17):
**satır = firma kalıyor**, S1/S2 (yetki yazma uçları) netleşince yeniden
değerlendirilecek. Analiste sorulacak soru docs/api-eksikleri-proje-firmalari.md
S7'de: satırlar yetki bazlı olursa yetki başına hangi eylemler sunulacak?

Düzleştirmeye geçilirse değişecek yerler: satır anahtarı (`ProjectFirmsPage`
→ `rowKey`), `buildProjectFirmRows`, adet (`queryProjectFirmList`),
`projectFirmColumns.tsx` (G.D. hücresi + İşlemler).

## Filtre paneli: iki kutu pasif, SEBEPLERİ farklı

- **Yeterlilik Durumu** — veri yok, süzülseydi liste ilk seçimde boşalırdı
  (bkz. [admin-list-state](./admin-list-state.md), docs/kararlar.md K27 ve K29).
- **G.D. Firması** — veri VAR ama süzgeç bağlanmadı; süzmenin anlamı KK-5 satır
  kararına bağlı, önce o verilmeli.

İpuçları bu yüzden ayrı metinler; tek ortak metin ikincisi için yanlış olurdu.

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
