---
type: open-question
date: 2026-08-10
---

# Yeni proje firması ekle: yetkilendirme sunucuda YOK, benzersizlik İSTEMCİDE

> MR öncesi düzeltme turunda (2026-08-10) eklenenler: yarım kayıt artık
> KULLANICIYA GÖRÜNÜR, kod içi "bölge" adlandırması gaz dağıtım firmasına
> çevrildi. Kararlar: docs/kararlar.md K30, K31.
>
> 2026-08-18 (K113, K114): Seri No ve Yeterlilik No alanları KALKTI, şahıs
> firması artık destekleniyor ve maskeli T.C. forma yüklenmiyor.

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

## Şahıs firması ARTIK kaydedilebiliyor (§10, K114)

Eski kısıt ("`companyType == 2` dışındaki gövde 400 alır") KALKTI. Kural artık
iki yönlü ve alanlar birbirini DIŞLIYOR:

| `companyType` | `nationalIdNumber` | `taxNumber` |
|---|---|---|
| 1 (şahıs) | **zorunlu**, gerçek T.C. sağlaması | **null** |
| 2 (tüzel) | **null** | **zorunlu**, 10 VEYA 11 hane |

T.C. doğrulaması istemcide de yapılıyor: `core/nationalId.ts` →
`isValidNationalId` (11 hane, ilk hane ≠ 0, 10. ve 11. hane sağlaması).
⚠️ Yalnız hane sayısına bakma: "11111111111" 11 hanedir ama sunucu reddeder.
Hane sayısı tutup sağlaması tutmayan numara AYRI mesaj alıyor.

**Kapanan alan hem EKRANDAN hem GÖVDEDEN temizleniyor.** İki yerde birden:
formdaki temizlik ekran için, `toProjectFirmPayload`'daki güvence için. Gizli
ama dolu kalan alan sunucudan 400 döndürüyor ve tek noktaya güvenmek ileride
eklenecek bir "değerleri koru" davranışıyla sessizce kırılırdı.

**409 = aynı T.C. ile kayıtlı şahıs firması var.** SİLİNMİŞ firma bile numarayı
rezerve tutuyor, yani kayıt listede görünmeyebiliyor — mesaj bunu SÖYLÜYOR.
Hata genel şeride değil ALAN hatasına çevriliyor ve odak kimlik alanına
taşınıyor. Eşleşme **durum kodu (409) + form durumu** ile; sunucunun mesaj
METNİNE bakılmıyor.

## ⚠️ Sunucudan gelen T.C. MASKELİ; forma yüklenmez (K114)

`GET /api/projectfirms/{id}` `nationalIdNumber`'ı "*******1234" biçiminde
döndürüyor. Bu metin geri gönderilemez: şahısta sağlamayı tutturmaz, tüzelde
"boş olmalı" kuralını çiğner — iki yönde de 400.

`toProjectFirmFormValues` alanı **her zaman boş** bırakıyor ve şahıs firmasında
kullanıcıdan yeniden istiyor. Yüklemek, maskeli değerin gövdeye ulaşabildiği
TEK yoldu; yüklememek hatayı yapısal olarak imkânsız kılıyor. Boşluğun sebebi
alanın altında yazıyor, yoksa "veri kayboldu" diye okunurdu.

Aynı kural **Kişi Bilgileri** ekranında da geçerli: oraya da T.C. alanı eklendi
(bkz. `ui/admin/profile/`), çünkü o ekran firma gövdesini okunan kayıttan
kuruyordu ve şahıs firmasının her kaydı 400 alıyordu.

## Benzersizliğe bu ekranda İSTEMCİ bakıyor

Gaz dağıtım firma formunda karar "benzersizliğe sunucu karar verir" idi
(bkz. [gas-firm-form](./gas-firm-form.md)). Burada tersi, çünkü gerekçeler tersi:

- sunucu **vergi numarasını** denetlemiyor, 409 yok;
- liste ucu sayfalamasız düz dizi döndürdüğü için tüm kayıtlar zaten elde ve
  form, liste ekranıyla **aynı önbelleği** (`['projectFirmList']`) okuyor.

`projectFirmUniqueness.ts` yarış durumunu kapatmaz; sunucu kuralı gelince ikinci
savunma hattına düşer, kaldırılmaz.

Seri no ALANI tümüyle kalktı (K113), kontrolü de. **T.C. kimlik numarası burada
DEĞİL**: liste satırı onu taşımıyor ve sunucu zaten 409 döndürüyor — ön kontrol
hem yapılamaz hem gereksiz. Şahıs firmasında vergi no kontrolü de atlanıyor
(alan gövdeye hiç girmiyor).

Muhasebe cari kodu liste satırında YOK. **Cari kod benzersizliği (belge madde
23) HİÇ uygulanmıyor:** karşılaştıracak veri bulunmuyor. ⚠️ `accountingCode`
KALDI — seri no ile karıştırma.

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
