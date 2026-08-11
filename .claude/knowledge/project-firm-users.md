# decision: Proje firması kullanıcıları — liste ve form ekranları

Gereksinim: `docs/requirements/proje-firmasi-kullanicilari.md` (madde 1–17,
KK-1..KK-25). Eksik uçlar ve sözleşme taslağı:
`docs/api-eksikleri-kullanicilar.md`. Kararlar: K45, K46, K47.

## Sunucu tarafı YOK — en önemli bağlam

Bu ekranların hiçbir ucu sunucuda yok; tek kullanıcı ucu `POST /api/auth/register`
ve ona **bağlanılmadı** (gövdesi `Aktif`, `GDF Kayıt No` ve çoklu yetki satırı
taşımıyor). Ekranlar mock üstünde çalışıyor, kaydetme kullanıcıya "sunucuya
yazılmıyor" uyarısı gösteriyor.

Mock'a düşme kararı `hasApiBaseUrl()`e DEĞİL uç bazlı bayrağa bağlı
(`api/unimplementedEndpoints.ts`) — K46. `.env.local`'de `VITE_API_URL` dolu
olduğu için "API yoksa mock" deseni burada hiç tetiklenmezdi.

## Satır = yetki, kullanıcı değil (KK-11)

Listenin bir satırı bir YETKİ kaydıdır; üç yetkisi olan kullanıcı üç satır
gösterir, kullanıcı bilgileri yinelenir. Bunun sonuçları:

- `rowKey` = `competencyId`, `userId` DEĞİL (aynı kullanıcı birden çok satırda).
- Başlıktaki adet ve sayfalama SATIR sayısı üzerinden.
- Aynı kullanıcının satırları art arda gelmeli; sıralanabilir başlık YOK —
  gereksinim istemiyor ve başlığa tıklamak o gruplamayı bozardı.

## "Yetki" rol değildir

`authorityType` yetki satırının alanı; kullanıcının rolü her zaman
`ProjectFirmUser` (K45, bkz. [access-control](./access-control.md)). Rol modeli
kullanıcı başına tek rol tanımlıyor, oysa aynı kişi bir firmada mühendis,
diğerinde yetkili olabiliyor.

## Filtre "Filtrele" ile uygulanır — proje firmalarından FARKLI

Kutular taslak tutar, "Filtrele" (ya da aramada Enter) hepsini birlikte adrese
yazar (K47). Proje firmaları ekranında arama debounce'lu ve "Filtrele" yalnız
paneli açıyor — iki ekranı eşitlemeye kalkmadan önce K47'yi oku.

Taslak, adres dışarıdan değişince URL'den yeniden kurulur (geri/ileri, paylaşılan
bağlantı, çipin kaldırılması). Bu, efektle değil render sırasında düzeltmeyle
yapılıyor: `ProjectFirmUserFilterBar` içindeki `appliedFilters` karşılaştırması.

## Belge ile taslağın çeliştiği yerler — belge kazandı

| Taslakta | Belgede | Sonuç |
|----------|---------|-------|
| "Daha Fazla Göster" düğmesi | sayfa numaralı sayfalama (madde 7, KK-12) | sayfa numaraları |
| Sol menüde "Firma Kullanıcıları" | "Proje Firması Kullanıcıları" (madde 1) | menü, başlık ve YOL öyle |
| Üst barda "Bölge: Hepsi" | — | eklenmedi; ekran `useRegionParam`'a hiç bağlı değil |

Yol da `firm-users` değil `project-firm-users`: sistemde gaz dağıtım firması
kullanıcıları da var, "firm-users" hangi firmanın kullanıcısı olduğunu
söylemiyordu.

## Belgede yazmayan, kalıp korunarak yazılanlar

Hepsi kodda `ASSUMPTION` olarak işaretli:

- Şifre kuralı mesajı (KK-17 kuralı veriyor, metni vermiyor) — dört koşul tek
  cümlede sayılıyor, kullanıcı hangisini sağlamadığını bilemez.
- Güncelleme ekranının başlığı ("Proje Firma Kullanıcısı Güncelleme"): belge
  yalnız "aynı ekran" diyor, oluşturma başlığı güncellemede yanlış bilgi olurdu.
- E-posta "kullanımda" mesajı: belge yalnız kullanıcı adınınkini birebir veriyor.

## Telefon: `toPhoneDigits` YETMEZ

Liste, kayıttaki numarayı `0xxx xxx xx xx` biçimine indirir (KK-9). Bunun için
`core/phone.ts` → `toNormalizedPhoneDigits` var. `toPhoneDigits` bu iş için
KULLANILMAZ: girdi alanı için yazıldığı ve 11 haneye kırptığı için ülke kodlu
numaranın son iki hanesini atar ("905321180880" → "90532118088"), yani sessizce
yanlış numara gösterir. Hiçbir kalıba uymayan numara ham hâliyle gösterilir.

## Yetki satırı kuralları tek dosyada

`ui/admin/projectFirmUsers/projectFirmUserCompetencies.ts` — saf fonksiyonlar:
satır tamlığı (KK-19), yinelenen ikili (KK-22), firma değişince proje firmasının
temizlenmesi (KK-20), gövdeye çevirme. Bileşenler kural yazmaz, bunları çağırır.

Yeni satırların yerel anahtarı NEGATİF (`-1`, `-2`, …): sunucudan gelen
kimliklerle çakışmasın (bkz. [id-scheme](./id-scheme.md)). Kaydedilmiş satırın
kimliği ayrıca `competencyId`'de durur.

## Firmalar GERÇEK, kullanıcılar mock

Uydurulan tek şey kullanıcının kendisi. Bağlandığı firmaların ikisi de gerçek
uçtan geliyor:

- `GET /api/gasdistributionfirms` → yetki satırının G.D. firması seçenekleri
- `GET /api/projectfirms` → proje firması seçenekleri

Mock kullanıcı satırları bu iki listeden **tohumlanıyor**
(`seedProjectFirmUsers`, `api/projectFirmUsers.ts` içinden çağrılır). Sabit bir
firma listesi tutulsaydı formdaki seçenekler gerçek, listedeki kayıtlar sahte
olur; güncelleme ekranında kullanıcının kayıtlı firması seçenekler arasında
bulunmaz ve kutu boş açılırdı.

Tohumlama bir KEZ çalışır (`areUsersSeeded`): ikinci çağrıda yeniden kurulsaydı
oturum içinde eklenen kullanıcılar silinirdi. Firma listelerinden biri boş
gelirse hiç tohumlanmaz — kullanıcıyı var olmayan bir firmaya bağlamaktansa
liste boş görünsün.

**KK-20 kısmen karşılanıyor:** proje firması listesi seçilen G.D. firmasına
göre DARALTILAMIYOR, çünkü bağı veren uç yok (`ProjectFirmAuthorization` tablosu
proje firmasını GDF-bölgesine bağlıyor ama onu okuyan uç açılmamış). Kutu yine
de firma seçilmeden pasif kalıyor: sıra kuralı korunuyor, uydurma bir daraltma
yapılmıyor.
