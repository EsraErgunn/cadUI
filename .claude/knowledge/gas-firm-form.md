---
type: decision
date: 2026-08-05
---

# Gaz dağıtım firma ekle/güncelle: benzersizlik, açılış değerleri, uyarı ayrımı

## Benzersizliğe SUNUCU karar verir, istemci ön kontrolü yok

Firma numarasının kullanılıp kullanılmadığı istemcide kontrol EDİLMEZ. Sebep iki
tane: sayfalama sunucu taraflı olduğu için tüm numaraları çekmek 30'ar kayıtlık
sayfalarla dolaşmayı gerektirirdi, ve yapılsaydı bile iki kullanıcı arasındaki
yarış durumu istemcide kapatılamazdı.

Çakışma `api/adminFirmForm.ts` içindeki **`DfirmNoTakenError`** tipiyle yükselir,
form onu `instanceof` ile tanıyıp `dfirmNo` alanına bağlar ve odağı oraya taşır.
**Hata mesaj METNİNE göre eşleştirme yapılmaz** — sunucunun metni değişince
eşleştirme sessizce kırılırdı.

`TODO(esra)`: 409 gövdesindeki ayırt edici kodun adı backend'le doğrulanacak.

Aynı sebeple sıradaki numara da sunucudan gelir
(`GET /api/admin/gas-distribution-firms/next-no`), listeden `max+1` türetilmez.
Numara **rezerve edilmez**: iki kullanıcı aynı numarayı görebilir, ikincisi
kaydederken 409 alır. Doğru davranış bu, ama rezervasyon gerekip gerekmediği
backend'e sorulacak.

## Açılış değerleri prop olarak gelir, efektle YAZILMAZ

`useGasFirmForm` değerleri `initialValues` prop'undan `useState` başlatıcısıyla
bir kez alır. Veri hazır olmadan form **mount edilmez**
(`useGasFirmInitialValues` + sayfadaki yükleme durumu).

İlk tasarım hook'un içinde `useQuery` + `useEffect` ile değerleri forma
yazıyordu. React Compiler'ın eslint kuralı efekt içinde `setState`'i reddetti ve
haklıydı: geç gelen yanıtın kullanıcının o sırada yazdığının üstüne binmemesi
için "bir kez uygula" bayrağı + `isDirty` koruması gerekiyordu. Formu veri
hazır olunca mount etmek bu hata sınıfını yapısal olarak ortadan kaldırıyor.

Aynı gerekçeyle rota parametresi doğrulaması `GasDistributionFirmFormPage`
içinde, veri çeken iç bileşenin DIŞINDA: hook'lar erken `return`'den önce
çalışmak zorunda olduğu için aynı bileşende kalsaydı `/…/abc` gibi bozuk bir
bağlantıda sunucuya `NaN` isteği gidip sonra yönlendirme yapılırdı.

## Uyarı ≠ hata: `nameWarning` `errors`'tan tamamen ayrı

Belge madde 9 "aynı isimde firma varsa kullanıcı uyarılır ama kayıt
engellenmez" diyor. Eşleşme **birebir değil benzerlik**: liste araması zaten
büyük/küçük harf ve Türkçe karakter duyarsız, içerik bazlı (KK-4). Birebir
eşitlik arasaydık "ADANA DOĞALGAZ" yazan kullanıcı "Adana Doğalgaz Dağıtım A.Ş."
kaydını göremezdi — uyarı tam da işe yarayacağı yerde susardı.

Kurallar:

- Sorgu **blur'da** atılır, her tuş vuruşunda değil.
- Sorgu hata verirse **sessizce geçilir**: kaydetmeyi engellemez, hata alanına
  düşmez, kullanıcıya hiçbir şey gösterilmez. Bu bir kolaylık, kritik yol değil.
- Güncelleme modunda kaydın **kendisi elenir**, yoksa mevcut firmayı açan herkes
  uyarıyı kendisi için görürdü.
- `nameWarning` `errors` nesnesine hiç girmez: Kaydet'i durdurmaz,
  `firstGasFirmErrorField` odak mantığına girmez, kırmızı kenarlık tetiklemez.
  Görsel dil de ayrı — `FieldWarning` nötr tonda, `danger` DEĞİL.

`FieldWarning` `role="status"` taşır: uyarı alandan çıkınca belirdiği için odak
artık girdide değildir, yalnız `aria-describedby` ile bağlansaydı ekran okuyucu
kullanıcısı onu hiç duymazdı.

## Telefon: durum ham rakam, maske yalnız görüntüde

`core/phone.ts` saf: `toPhoneDigits` (harf alana hiç GİRMEZ, 11 haneye kırpar),
`formatPhone` (yarım giriş de gruplanır), `isValidPhone`. Form state'i ve istek
gövdesi ham rakam taşır (`05551234567`), maskeli metin gönderilmez.

Bilinen sınır: metnin ORTASINA yazınca imleç sona atlar — maske her değişimde
yeniden kurulduğu için konum korunamıyor. Soldan sağa yazımda sorun çıkmıyor.

Harf süzme `normalizeGasFirmValue` ile **hook'ta**, bileşende değil: hiçbir
çağıran kuralı atlayamasın.

## `region` KAPANDI — sunucu sözleşmesinde bölge yok

Açık soru 2026-08-06'da kapandı: gerçek uçta ne liste satırı ne istek gövdesi
bölge taşıyor. Alan yalnız mock listesinin filtresini besliyor; liste gerçek uca
bağlanınca `region` tümüyle düşecek.

## Sunucu ↔ arayüz dönüşümü `gasFirmDto.ts`'te

Uç alan adları arayüzünkilerle birebir değil: `companyNumber` ↔ `dfirmNo`,
`title` ↔ `name`. Arayüz adları DEĞİŞTİRİLMEDİ (bileşenler ve testler onlara
bağlı); dönüşüm tek dosyada duruyor, sunucu alan adı değişirse yalnız o dosya
değişir.

Taban yol `/api/gasdistributionfirms` — `/admin/` yok, tire yok.
`POST` 201 değil **200** döndürüyor ve tam detay nesnesi veriyor;
`PUT` yalnız `{ message }` döndürüyor, kimlik vermiyor (çağıranın elindeki
kimlik geri verilir).

Çakışma **409 DURUM KODUNDAN** tanınıyor (`ApiError.status`), mesaj metninden
değil — daha önce verilen "metne göre eşleştirme yapma" kararının karşılığı.

## Grup firması artık KİMLİKLE

`getFirmGroups()` → `GET /api/gasdistributiongroups` → `{ id, name }[]`.
Seçim kutusunun değeri ad değil **kimlik**, istek gövdesi `groupId` gönderiyor,
seçilmediğinde `null`.

Sıralama İSTEMCİDE (`toSortedFirmGroups`, `localeCompare(…, 'tr')`): sunucu
Türkçe sıralamıyor, ÇEDAŞ'ı DOĞUGAZ'dan önce veriyor. Tek yerde yapılıyor ki
form seçim kutusu ile liste filtresi aynı sırayı görsün.

Liste ekranının filtresi hâlâ ADA göre süzüyor (liste mock'ta): kimlik
kullanılsaydı mock kayıtlarındaki `groupName` ile eşleşmez, filtre hiçbir kayıt
getirmezdi.

## Liste de gerçek uçta — ama sayfalama İSTEMCİDE

`GET /api/gasdistributionfirms` filtresiz/sayfalamasız düz dizi döndürüyor.
Liste ekranı tüm kayıtları çekip arama/sıralama/sayfalamayı `gasFirmListQuery.ts`
içinde yapıyor. **Geçici** — backend sayfalı uç açınca kaldırılacak (K27).

Mock yol da aynı `queryFirmList`'i kullanıyor; iki ayrı kural olsaydı mock'tan
gerçeğe geçerken davranış sessizce değişirdi.

Benzer ad uyarısı bu fonksiyona bağlı olduğu için artık GERÇEK veriye bakıyor —
mock'a bakarken veritabanındaki mükerrer adı göremiyordu.

Bölge süzgeci devre dışı (satırda bölge yok), grup süzgeci kimlikle çalışıyor.

## `VITE_API_URL` yoksa mock gövdeye düşülür

`hasApiBaseUrl()` (`http.ts`) tanımlı olup olmadığını söylüyor; form uçları
tanımlı değilse mock gövdeyi çalıştırıyor. Backend ayakta değilken ekranın
komple ölmesi yerine mock veriyle çalışmaya devam ediyor.

`getNextDfirmNo()` HER ZAMAN mock: sunucuda karşılığı henüz yok, uç açılınca
gövdesi `requestJson`'a dönecek, imza değişmeyecek.
