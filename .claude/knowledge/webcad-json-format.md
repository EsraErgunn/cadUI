# open-question: WebCAD referans JSON'u — palet elemanlarının gerçek alanları

Kaynak: `docs/webcad-reference.json` (referans aldığımız projenin gerçek çıktısı,
tek katlı örnek). Talep dokümanı 17 palet aracının hangi veriyi tuttuğunu
söylemiyor; bu dosya söylüyor. **Ama bizim modelimizle beş yerde çelişiyor —
aşağıdaki "Çelişkiler" bölümü karara bağlanmadan o alanlara kod yazılmaz.**

## Palet aracı → model anahtarı

Modeller kat içinde `models` altında **PascalCase tip adı → dizi** olarak durur.

| Palet aracı | Model | Ayırt edici alanlar |
|---|---|---|
| Duvar Çiz | `Wall` + `Point` | `p1Id,p2Id,width,height` / `x,y,angles` |
| Kapı Ekle | `Door` | `apartmentNumber, entrance, buildingEntrance, boilerRoom` |
| Pencere Ekle | `Window` | (rol alanı yok) |
| Oda Çiz | `Room` | `pointIds[], label, labelPos, measuredArea{value,unit,power}, centralVentilation, topSideOpenable` |
| Ana Kesme Şalteri Ekle | `Switch` | `brand, model` |
| Pano Ekle | `Panel` | `exproof` (küçük p — bkz. tuzaklar) |
| Aydınlatma Ekle | `Lighting` | `x, y, exProof` (duvara bağlı DEĞİL) |
| Yangın Söndürücü Ekle | `FireExtinguisher` | — |
| Alarm Cihazı Ekle | `Alarm` | `exProof, coAlarm, brand, model, forColumnLineVent` |
| Deprem Sensörü Ekle | `EarthquakeSensor` | `brand, model` |
| Menfez Ekle | `Vent` | 25 alan: `type("Üst"), areaAbove/Below, ventSpeed, fan*, peopleCount, …` |
| Baca Şaftı Ekle | `FlueShaft` | `width, length, angle, x, y` |
| Merdiven Ekle | `Staircase` | `width, length, angle, x, y, roomId` |
| Kolon Ekle | `Column` | `width, length, angle, x, y` |
| Kiriş Ekle | `Beam` | `x1,y1,x2,y2, width, height` |
| Metin Ekle | `Text` | (örnekte boş) |
| Ölçüm | `Measure` | (örnekte boş) |
| Serbest Çizim Araçları | `Ellipse` / `Rectangle` / `Shape` | (örnekte boş) |
| Toplu Silme / çoklu seçim | `MultipleSelect` | (örnekte boş — seçim neden kaydediliyor, belirsiz) |
| Silgi | — | işlem, modeli yok |
| Kolon Havalandırması Ekle | **belirsiz** | `RoofVent{radius,x,y}` mi, `Alarm.forColumnLineVent` mi? |

## Üç yerleştirme ailesi (17 araç → 3 desen)

Her eleman için ayrı hook yazılmaz; üç desen var:

1. **Duvara bağlı** — `wallId + distance (+ccw) + width,height,elevation (+depth)`
   → Door, Window, Vent, Alarm, EarthquakeSensor, FireExtinguisher, Panel, Switch.
   `ccw` duvarın HANGİ YÜZÜNE monte edildiğini söyler; Door/Window/Vent'te yok
   (delik iki yüzü de deler), yüzeye monte cihazlarda var.
2. **Noktaya konan** — `x,y (+width,length,angle)`
   → Column, Staircase, FlueShaft, Lighting, RoofVent(`radius`).
3. **Çizgisel** — `x1,y1,x2,y2` → Beam (Wall de aynı aileden ama Point üzerinden).

Etiket alanları (`labelX, labelY, labelPositionIsometry{x,y}`) yerleştirilen
sembollerin çoğunda var; `Wall, Point, Column, Beam, Staircase`'de YOK,
`Room` kendi `label/labelPos`'unu kullanır.

## Bizim modelle çelişenler — karara bağlanacak

1. **`Room.pointIds`** — referans odayı POINT id'leriyle tutuyor, CLAUDE.md ise
   "duvar id'lerinden oluşan çevrim" diyor. KK-9'u yazan kişiyi doğrudan etkiler.
   Alan doğrulaması: dört nokta merkez hattı 885×475 cm = 42.0375 m²,
   `measuredArea.value` = 42.04 → **alan duvar merkez hattından hesaplanıyor**,
   iç yüzden değil. Nokta sırası saat yönünde (shoelace negatif).
2. **`distance` kenar mı, orta mı** — bizde `offsetCm` açıklığın ORTASI.
   Kapı: `wallId:5, distance:44.5, width:85`; duvar 5'in p1 ucunda 20 cm
   kalınlığında dik duvar var. Kenar okumasıyla kapı 44.5–129.5'te durur ve
   köşe payına uyar; orta okumasıyla 2–87'de durur ve köşe payını İHLAL eder.
   Güçlü sinyal: `distance` = p1'den YAKIN KENARA mesafe. Tek örneğe dayanıyor,
   ekiple doğrulanmalı. Yanlış okunursa her açıklık yarım genişlik kayar.
3. **Door ve Window ayrı model** — bizde tek `Opening` + `type` union.
   Door'un rol alanları (`buildingEntrance`, `boilerRoom`) doküman madde 66 ile
   örtüşüyor, Window'da karşılığı yok.
4. **`nextUniqueId` KAT BAŞINA, `instalment` için ayrı** (örnekte 27 ve 1).
   Bizde proje geneli tek sayaç. Yani id'ler katlar arasında ve mimari↔tesisat
   arasında ÇAKIŞIR. `knowledge/id-scheme.md` bu varsayımla yazıldı.
   (Örnekte 22 atlanmış → silinen id geri kullanılmıyor, o kısım uyumlu.)
5. **Geçersiz yerleştirme** — `opening-placement.md` sığmayan yerleştirmeyi
   REDDEDİYOR; talep dokümanı madde 95-96 "araç konumun uygunluğunu bırakma
   anında denetlemeyecek, doğruluk kullanıcının sorumluluğunda" diyor.

Ayrıca doküman madde 104 her mahal için "kullanım tipi (mutfak, salon…)"
istiyor, referans JSON'da böyle bir alan YOK — sadece `centralVentilation` /
`topSideOpenable`.

## Yapısal tuzaklar

- **`instalment`** tek L ile yazılmış (bizim dizin adı `installation`).
  Serileştirmede anahtar birebir `instalment` olmalı.
- **`exProof` / `exproof`** — Lighting ve Alarm'da büyük P, Panel'de küçük p.
  Referansın kendi tutarsızlığı; bit-bit round-trip için AYNEN korunur.
- **`graph` kaydediliyor** — graphlib serileştirmesi (`nodes:[{v:"1"}]`,
  `edges:[{v,w,value:wallId}]`, node id'leri STRING). Mimaride yönsüz,
  tesisatta yönlü. Bizde graf hiç persist edilmiyor.
- **Katlar dizi değil**, `"0"/"1"/"2"` anahtarlı nesne; `floorsMeta` paralel
  duruyor ve HENÜZ OLMAYAN katlar için de dolu (örnekte 1 kat, 3 meta).
  Modellerde `floorId` alanı yok — kat zaten kapsayıcı.
- **`Wall.width`** = kalınlık (bizde `thickness`), `Wall.height` = duvar yüksekliği.
- **Türkçe string enum değerleri** doğrudan kaydediliyor (`type:"Üst"`,
  `brand:"CE Belgeli"`) → `turkish-collation.md` burada da geçerli.
- **Float'lar tam basamakla** (`svgScaleFactor: 0.05761583333333334`) —
  yuvarlama round-trip testini kırar.
- `setupType/unitType/heatingType` kodlu enum (2001/3001/4001 aralıkları).
- `FlueShaft` kat İÇİNDE duruyor, kökte değil — yani `Riser` gibi kat-üstü bir
  nesne değil; doküman madde 108'in "tüm katlarda aynı düşey eksen" kuralı
  modelle değil, kontrolle sağlanıyor olmalı.

## docs/sample-project.json ile ilişkisi

Mevcut fixture BİZİM iç şeklimiz, WebCAD'in değil. Kabul testi
("yükle→serileştir→bit bit aynı") şu an kendi formatımızı round-trip ediyor;
WebCAD uyumunu KANITLAMIYOR — oysa tamsayı id kuralının gerekçesi buydu
(`id-scheme.md`). `serialize.ts` şu an çeviri yapmıyor, iç şekli aynen yazıyor.
Gerçek WebCAD çeviri katmanı yazılmadı. İkinci bir kabul testinin
`webcad-reference.json` üzerinden koşup koşmayacağı ekip kararı.
