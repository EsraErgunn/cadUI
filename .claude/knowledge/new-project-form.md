---
type: decision
date: 2026-08-04
---

# Yeni proje formu: rol görünürlüğü, doğrulama girişi, parametrik listeler

## Rol kontrolü `usePermission` değil `useIsAdmin`

Admin'e özel alanlar (Proje Firması, Gaz Dağıtım Firması) `ui/admin/useIsAdmin.ts`
ile koşullanır: `useAuthSession()?.roleCode === ROLE_CODES.admin` (`api/roles.ts`).

Neden `usePermission('...')` değil:

- `api/permissions.ts` hâlâ **mock** bir izin listesi döndürüyor;
  `GET /api/me/permissions` diye bir uç yok. Yeni bir izin anahtarı eklemek,
  backend'in vermediği bir sözleşme uydurmak olurdu.
- `usePermission` liste gelene kadar `false` döner. Liste ekranında bu doğru
  (buton bir an görünüp kaybolmasın), **formda yanlış**: iki alan sonradan belirir,
  düzen zıplar ve koşullu zorunluluk şeması yükleme sonrası değişir.
- `roleCode` gerçek veriden geliyor (login yanıtı) ve **senkron** okunuyor.
- [access-control](./access-control.md) zaten "permissions.ts ya gerçek uca
  bağlanmalı ya da rol koduna devredilmeli" diyor.

Kontrol TEK hook'ta: izin uçları gerçekten gelirse yalnız `useIsAdmin`'in gövdesi
değişir, çağıranlar değişmez. **Bu yalnızca GÖRÜNÜRLÜK kararıdır**; yetki denetimi
sunucunun sorumluluğudur.

## Admin olmayan kullanıcı firma kimliği GÖNDERMEZ

`toCreateProjectPayload` admin değilse `projectFirmId`/`gasDistributionFirmId`
alanlarını gövdeye hiç koymaz; sunucu token'dan türetir. Aynı sebeple
`getFirmEngineers()` kimliksiz çağrılabilir. İstemcinin gönderdiği firma kimliğine
güvenmek, başka firma adına proje açmaya açık kapı bırakırdı.

## Doğrulamanın girişi `validateNewProject`, şema DEĞİL

`createNewProjectSchema` tek başına TAM doğrulama değildir: alanlar arası kural
(bitiş ≥ başlama) sarmalayıcıda durur.

Sebep: zod'un `refine`/`superRefine`'ı **yalnız nesnenin tamamı geçerliyken**
çalışıyor. Kural şemadayken boş formda "proje adı zorunludur" hatası tarih ve
firma hatalarını gölgeliyordu; kullanıcı eksikleri tur tur görüyordu. Aynı sebeple
firma zorunluluğu da `superRefine`'dan **alan düzeyine** taşındı.

Şemayı doğrudan `parse` etmek tarih kuralını sessizce atlar —
`newProjectSchema.test.ts` içinde bunu tutan bir tuzak testi var.

## Parametrik liste: seçenek kaybolursa seçim düşer

Proje tipi listesi sunucudan gelir (`getProjectTypes`), sabit dizi gömülmez.
`useNewProjectForm.applyProjectTypeOptions`:

- kullanıcı henüz seçmediyse ilk seçeneği varsayılan yapar,
- kullanıcının seçtiği tip Ayarlar'dan kaldırılmışsa seçimi **temizler** (yerine
  sessizce başka tip koysaydı, kullanıcı seçmediği bir tiple proje kaydederdi),
- `hasChosenProjectType` bayrağı sayesinde temizlenen seçim sonraki liste
  tazelemesinde geri gelmez.

Isınma tipi de parametrik ama alan dar birleşimle kilitli (liste ekranının şeması
buna bağlı): `mapHeatingTypeOptions` tanınmayan kodu süzer ve bir kez uyarır.
Isınma tipi ve bina kullanımı tipi **varsayılan almaz**, boş açılır — belge onlara
varsayılan tanımlamıyor, sessizce ilk seçeneğe düşselerdi kullanıcı hiç dokunmadan
"Merkezi" bir proje kaydedebilirdi.

## Tarih sırası: bitiş tarihi başlamadan TÜRER

Başlama tarihi varsayılan olarak bugünle **dolu** geldiği için bitiş alanını
"başlama seçilene kadar pasif" tutmak sırayı zorlamıyordu — alan hiç
pasifleşmiyor, kullanıcı bitişi önce girip sonra başlamaya geçebiliyordu.

Kural bu yüzden görünürlükte değil, veride: `applyDependencies` başlama tarihi
her değiştiğinde bitişi `deriveEndDate(start)` ile **yeniden hesaplar** (+2 ay,
`newProjectDefaults.ts`). Bitişi önce girmek, başlama değişince anlamını yitirir.
Başlama silinirse bitiş de boşalır ve alan pasifleşir — pasif alanda
düzeltilemeyen bir tarih kalmasın (mühendis↔firma bağımlılığıyla aynı gerekçe).

`deriveEndDate` tarihi elle ayrıştırır: `new Date('2026-08-04')` UTC gece yarısı
sayılıyor, saat farkı negatif olan yerelde tarih bir gün geriye kayıyordu.
Ay sonu taşması `addMonths` içinde zaten karşılanmış (31 Aralık + 2 ay → 28 Şubat).

Başlama tarihine `max` konmaz (önceden `max={endDate}` vardı): sınır varken
projeyi ileri bir tarihe kaydırmak için önce bitişi silmek gerekiyordu. Sıra
kuralını yalnız bitiş alanı taşır (`min={startDate}` + `endBeforeStart`).

Bilinen sınır: native `input[type=date]` gg.aa.yyyy biçimini **tarayıcı
yerelinden** çözer, `tr-TR` garanti değil. Belgedeki "gün.ay.yıl" isteği ancak
özel bir takvim bileşeniyle karşılanır; yeni bağımlılık kurulmadığı için şimdilik
native girdide kalındı.

## Sayısal alan native `type="number"` DEĞİL

`NumberStepperField` metin girdisi + `role="spinbutton"` kullanır. Sayı
girdisinde tarayıcı geçersiz ara giriş için ("-", "1e", çift ayraç) **boş dize**
veriyor; "kullanıcı alanı boşalttı" ile "geçersiz karakter yazdı" ayırt
edilemiyordu ve alan her boşaldığında değer sessizce 0'a düşüyordu. Ondalık
ayracı da tarayıcı yereline göre değişiyordu.

Metin girdisinde ham metin elde olduğu için kural tek yerde:

- yazım sırasında değer bir **taslak dizede** durur (alan boş kalabilir),
- kabul edilmeyen karakter alana hiç girmez (eksi işareti asla),
- `isInteger` alanlarda (daire/işyeri adedi) ondalık ayraç da yazılamaz — aynı
  kural şemada `nonNegativeInteger` ile ikinci kez korunur,
- baştaki sıfırlar temizlenir (alanlar 0 ile açtığı için "012" oluşuyordu),
- odaktan çıkarken yarım kalan giriş alt sınıra döner,
- `max` verilen alanda (kapasite) sınırı aşan giriş anında tavana çekilir.

## Kapasite tavanı 10.000 m³/h

`MAX_CAPACITY_CUBIC_METER_PER_HOUR` (`newProjectSchema.ts`) hem girdinin `max`
propunu hem şema kuralını besler. Değer saha sınırı değil **basamak hatası
süzgeci**: bina ölçeğinde en büyük merkezi sistem bile bu tavanın çok altında
kalıyor, tavan 100000 gibi bir yazım hatasını kaydetmeden yakalıyor. Gerçek bir
tesisat bunun üstüne çıkarsa sabit büyütülür.

S.K. basıncına tavan KONMADI — sahada anlamlı üst değer (21 mbar konut, 300+
mbar orta basınç servis kutusu) netleşmeden sınır uydurulmadı.

## Gönderim sırasında form kilitlenir

Kartlar `NewProjectPage` içinde `<fieldset disabled={isSubmitting}>` ile sarılı;
istek uçarken yapılan değişiklik kaydedilmeden listeye dönülürdü. Fieldset'e
`min-w-0` şart: tarayıcı varsayılanı `min-inline-size: min-content`, ızgarayı
taşırıyor ve Tailwind preflight bunu sıfırlamıyor.

## Açık soru

Proje firması kullanıcısında Gaz Dağıtım Firması alanı gösterilmiyor. Projenin GD
firmasının nasıl belirlendiği (firmanın tek GD firması mı var, sunucu mu seçiyor,
sonradan mı atanıyor) **backend'e sorulacak** — varsayarak kod yazılmadı.
