# decision: Evrak ekranları — tek bellek deposu, geçici kalıcılık, açılma biçimi

Ekranlar: `src/pages/DocumentListPage.tsx`, `src/pages/NewDocumentPage.tsx`,
parçalar `src/ui/admin/documents/`, veri katmanı `src/api/documents.ts`
(+ `documentsMock.ts`, `documentListQuery.ts`, `documentTypes.ts`).
Kararların tamamı docs/kararlar.md K57–K62.

## Bu ekranlarda varsayım kodlamadan önce bilinmesi gerekenler

**Sunucuda HİÇBİR ucu yok.** OpenAPI'de (2026-08-13, 30 yol) evrakla ilgili tek
bir yol ya da DTO bulunmuyor. Uç yazmak backend'in işi; frontend sözleşme
uydurmuyor, mock'la çalışıyor. Liste: `docs/api-eksikleri-evraklar.md`.

**Evrak deposu TEK ve BELLEKTE** (`documentsMock.ts`). Hem genel Evraklar
listesi hem proje detayının evrak sekmesi oradan besleniyor — ikinci bir mock
açarsan aynı evrak bir ekranda görünüp öbüründe kaybolur. Depo `resetMockDocuments()`
ile sıfırlanır; **testlerde şart**, yoksa bir testin yüklediği evrak öbüründe
görünür.

**Yükleme "kaydediyor gibi" yapıyor AMA kalıcı olmadığını söylüyor** (K58):
satır gerçekten listeye giriyor, sayfa yenilenince kayboluyor. Başarı şeridi
`warning` tonunda ve altında "sunucuya yazılmadı" satırları var — K51'in
`isPersisted: false` deseni burada da geçerli, düz yeşil bir şerit kullanıcıya
yapılmamış bir işi yapılmış gösterirdi. Bu satırları KALDIRMA.

**Mock YALNIZ geliştirmede** (`mockGate`, K51): üretimde liste
`MissingSourceNotice` gösterir, "Kaydet" hiç yazmadan `unavailable` döner.
Geliştirmede kalıcı `MockDataNotice` şeridi duruyor — kapatılamaz.

**`unimplementedEndpoints.ts`'e bayrak EKLENMEDİ.** O mekanizma bayrağı gerçek
bir `isEndpointImplemented` çağrısının yanında tutuyor; evrak tarafında hiç
çağrı yok ve çağrısı olmayan bayrak sessiz kalır (K51'in tespit ettiği boşluk).

## Sık düşülecek tuzaklar

- **Açılma biçimi `contentType`'tan, doğrulama UZANTIDAN.** İkisi bilerek farklı
  kanaldan: tarayıcı `.alp`/`.bmp` için `File.type`'ı boş bırakıyor (MIME'a bakan
  doğrulama geçerli dosyayı reddederdi), uzantıya bakan açma kararı ise uzantısı
  yanlış yazılmış dosyada sessizce yanlış davranırdı. Uzantı→MIME türetmesi
  YALNIZ `documentsMock.contentTypeOf` içinde; bileşen uzantıyı hiç görmez.
- **`user.upload` `accept` özniteliğini UYGULAR.** Desteklenmeyen biçimin
  reddini dosya seçiciyle test edemezsin — dosya handler'a hiç ulaşmaz. O yol
  ancak sürükle-bırakla (`fireEvent.drop`) sınanır; gerçekte de öyle.
- **Tohumlanan satırların arkasında dosya YOK** (`url: null`) ve adları bağlantı
  değil. Yalnız o oturumda yüklenen dosyalar `URL.createObjectURL` ile gerçekten
  açılabilir.
- **Evrak tipi kodları istemci uydurmasıdır.** `EvrakTipi` kod grubu sunucuda
  tanımlı mı bilinmiyor; grup açılınca kodlar sunucunun `CodeValue`'larıyla
  değişecek ve URL'deki `type` filtresini taşıyan eski bağlantılar filtresiz
  açılacak. "Favori Evrak" tipi listeden ÇIKARILDI (19 → 18) ama sunucu
  döndürürse istemcide SÜZÜLMEYECEK.
- **Birimler proje detayıyla ORTAK kaynaktan** (`getProjectUnits`, mockGate ile
  DEV'e kilitli). Üretim derlemesinde birim listesi boş gelir ve ekran bunu
  söyler; ikinci bir uç/mock açma.

## Kapsam dışı bırakılanlar

Favori kavramı (sekmeler + "Favori Evrak" tipi), dosya tipi rozetleri, mockup'taki
"Daha Fazla Göster", proje listesindeki evrak ikonunun yeşile dönmesi
(`GET /api/projects` `hasDocuments` döndürmüyor — istemcide geçici iz TUTULMADI).
"Favoriler" düşünce liste ekranında tek sekme kaldığı için sekme çubuğu tümüyle
kaldırıldı.

"Firma Adı" ve "G.D Firması" düz metin: ikisinin de gidebileceği salt okunur bir
ekran yok (K62). Bağlamadan önce o ekranların geldiğini doğrula.
