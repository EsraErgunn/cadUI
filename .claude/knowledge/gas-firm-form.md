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

## `region` istek gövdesinde YOK

Form bölge alanı taşımıyor (belge de tanımlamıyor) ve üst bardaki bölge seçimi
bir **filtre**, kayıt verisi değil. Yeni kaydın bölgeyi nasıl aldığı **açık
soru** — varsayımla gövdeye konmadı. Mock, liste şemasını doldurabilmek için
sabit bir değer atıyor (`MOCK_CREATED_FIRM_REGION`, başında `TODO(esra)`).

## Grup firması listesi sunucudan

`getFirmGroups()` ucundan gelir, sabit dizi gömülmez (belge: "yeni grup
firmaları tanımlandıkça otomatik güncellenir"). Sıralama `localeCompare(…, 'tr')`.

Bilinen tutarsızlık: gereksinim belgesi ve Dipos V mockup'ı kısa adlar (AKSA,
ENERYA…) gösteriyor, mock verimiz uzun adlar ("Aksa Enerji Grubu") taşıyor.
Ad biçimi backend'e sorulacak; liste ekranıyla tutarlılık için şimdilik mevcut
uca bağlı kalındı.
