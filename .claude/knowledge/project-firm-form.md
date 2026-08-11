---
type: open-question
date: 2026-08-10
---

# Yeni proje firması ekle: yetkilendirme sunucuda YOK, benzersizlik İSTEMCİDE

> MR öncesi düzeltme turunda (2026-08-10) eklenenler: yarım kayıt artık
> KULLANICIYA GÖRÜNÜR, şahıs şirketi 400'ü sebebini söylüyor, kod içi "bölge"
> adlandırması gaz dağıtım firmasına çevrildi. Kararlar: docs/kararlar.md K30, K31.

Ekran çalışıyor (`pages/NewProjectFirmPage.tsx`) ama gereksinimin istediğinin
bir kısmı sunucuda karşılıksız. Aşağıdakiler doğrulanmış eksikler (yerel cadapi
kaynağından okundu), tasarım tercihi değil — bu konularda **varsayım kodlama**.

## Yetkilendirme kaydı hiçbir yere gitmiyor

`ProjectFirmAuthorization` tablosu ve `ProjectFirmDoc` VAR, ama:

- `ProjectFirmCreateDto` yetki alanı taşımıyor,
- proje firmasına yetki yazan bir uç yok.

`api/projectFirmForm.ts` → `saveProjectFirmAuthorizations` bu yüzden **her zaman
mock** (`getNextDfirmNo` ile aynı desen): firma kaydı başarılı olduktan SONRA
çağrılıyor, hata verirse firmayı geri almıyor. Uç açılınca yalnız gövdesi
`requestJson`'a döner, imza değişmez.

Kayıtların kimliği gaz dağıtım **firmasının** kimliği (`gasDistributionFirmId`);
sunucu modeli ise `GasDistributionFirmRegionId` (firma + bölge) tutuyor. Uç
geldiğinde eşlemenin değişmesi gerekebilir — tek yer: `toAuthorizationPayloads`.

## Yarım kayıt SESSİZ DEĞİL

`saveProjectFirmAuthorizations` artık `{ arePersisted }` döndürüyor;
`arePersisted = !hasApiBaseUrl()`.

- **mock mod** (VITE_API_URL yok): firma da yetki de aynı gövdede → tutarlı →
  düz başarı mesajı.
- **gerçek uç**: firma sunucuda, yetkiler mock'ta → liste ekranında başarı
  mesajı YERİNE amber `warning` şeridi: *"Firma kaydedildi, ancak
  yetkilendirmeler henüz sunucuya kaydedilmiyor."*

Karar API katmanında veriliyor, arayüzde değil: uç açılınca `arePersisted`
koşulsuz `true` olacak ve ekranda tek satır değişmeyecek. Arayüz `hasApiBaseUrl()`e
kendisi bakssaydı bu bilgi iki yerde dururdu.

Bayrak rota durumuyla taşınıyor (`hasPendingAuthorizations`), `useSavedFirmNotice`
onu şemadan geçirip `{ message, tone }` veriyor. `NoticeBar`'ın üçüncü tonu
`warning`: `danger` DEĞİL (kayıt gerçekleşti), `role="alert"` DEĞİL
(`status` — kullanıcının işini bölmez). Amber yalnız ikon + sol kenarlıkta;
metin `ink` kalıyor (bkz. theming.md kısıtı).

## Şahıs şirketi kaydedilemiyor

- `ProjectFirmCreateValidator` `companyType == 2` (tüzel) dışındaki gövdeyi
  **400** ile geri çeviriyor.
- `TaxNumber` sunucuda HER durumda zorunlu; arayüzde şahıs şirketinde
  zorunluluktan çıkıyor.
- T.C. kimlik numarasının create DTO'sunda karşılığı yok
  (`ProjectFirm.NationalIdNumber` şifreli `byte[]`, uca açılmamış).

Arayüz seçimi engellemiyor. **Kimlik numarası `taxNumber` alanına YAZILMAZ** —
yanlış sütuna düşerdi.

Hata mesajı: sunucunun kendi Türkçe metni KORUNUYOR, önüne sebebi söyleyen cümle
ekleniyor (*"Şahıs şirketi kaydı sunucuda henüz desteklenmiyor. …"*) ve odak
"Şahıs Şirketi" onay kutusuna taşınıyor. Eşleşme **durum kodu (400) + form
durumu** ile; sunucunun mesaj METNİNE bakılmıyor — metin değişirse eşleştirme
sessizce kırılırdı (gaz dağıtım formundaki 409 kararının aynı gerekçesi).

## Benzersizliğe bu ekranda İSTEMCİ bakıyor

Gaz dağıtım firma formunda karar "benzersizliğe sunucu karar verir" idi
(bkz. [gas-firm-form](./gas-firm-form.md)). Burada tersi, çünkü gerekçeler tersi:

- sunucu vergi/seri numarasını **denetlemiyor**, 409 yok;
- liste ucu sayfalamasız düz dizi döndürdüğü için tüm kayıtlar zaten elde ve
  form, liste ekranıyla **aynı önbelleği** (`['projectFirmList']`) okuyor.

`projectFirmUniqueness.ts` yarış durumunu kapatmaz; sunucu kuralı gelince ikinci
savunma hattına düşer, kaldırılmaz.

Seri no ve muhasebe cari kodu liste satırında YOK (uç yalnız detay yanıtında
veriyor). Seri no karşılaştırması yine de yazıldı — aynı oturumda eklenen kayıt
onu taşıyor. **Cari kod benzersizliği (belge madde 23) HİÇ uygulanmıyor:**
karşılaştıracak veri bulunmuyor.

`ProjectFirm.taxNumber` alanı bu yüzden liste satırına eklendi; tabloda sütunu
yok, yalnız bu kontrolü besliyor.

## "Bölge" = grubun gaz dağıtım firması (kod artık böyle diyor)

"G.D Firması" seçim kutusu **grup** (`/api/gasdistributiongroups`), altındaki
kutu ızgarası ise o gruba bağlı **gaz dağıtım firmaları**
(`getGasDistributionFirmsByGroup`, uçta grup süzgeci olmadığı için istemcide
süzülüyor — K27'nin aynı gerekçeyle tekrarı).

Kod bir tur boyunca bunlara `region` demişti; K31 ile düzeltildi:
`GasDistributionFirmPicker`, `AuthorizationGasFirm`, `gasDistributionFirmId`.
**Kullanıcıya görünen metinler değişmedi** — "G.D Firması Bölgeleri", "Bölge
ara", "En az bir bölge seçiniz." belgeden geliyor ve öyle kalıyor. Üst bardaki
coğrafi bölge seçicisi kalktığı için arayüzde kavram çakışması yok.

Kutu etiketi sunucunun ham ünvanı DEĞİL: belge madde 17 seçenekleri "AKSA-ADANA",
"AKSA-GEMLİK" diye örnekliyor, sunucu ise "Adana Doğalgaz Dağıtım A.Ş." tutuyor.
`formatAuthorizationGasFirmName` grup adının ve ünvanın ilk sözcüğünü `tr` büyük
harfle birleştiriyor; ünvan zaten önekliyse (gerçek veri "AKSA-GEMLİK" tutuyor)
önek İKİNCİ KEZ eklenmiyor. Etiket taslak hook'unda bir kez üretiliyor —
eklenen kayıt, mükerrer uyarısı ve "kaldır" düğmesi aynı adı göstersin.

Grup değişince işaretler temizleniyor ve bu `role="status"` ile **bildiriliyor**;
onay diyaloğu açılmıyor, çünkü eklenmiş kayıtlar zaten korunuyor.

## Ekleme sonrası taslak

"Ekle" bölge işaretlerini ve iki numarayı sıfırlar, **grubu bırakır**. Bölge
başına AYRI satır üretilir: "aynı bölge ikinci kez eklenemez" ve "kayıtlar tek
tek kaldırılabilir" kurallarının ikisi de bölge bazlı kimlik istiyor.

## Güncelleme ekranı bilerek yok

`PUT /api/projectfirms/{id}` de yetkilendirme taşımıyor; güncelleme ekranı
açılsaydı kullanıcı yetkileri görüp değiştiremeyeceği yarım bir ekranla
karşılaşırdı. Rota `PROJECT_FIRMS_PATH/:firmId` hâlâ karşılama ekranında.
