---
type: decision
date: 2026-08-03
---

# Duvar şekli: yuvarlak uçlu kapsül, gönyeli dörtgen değil

## Karar

Duvar artık dört köşesi hesaplanan bir dörtgen değil, **eksen doğru parçası +
yarıçap**tan ibaret bir kapsül (`core/wallShape.ts` → `getWallCapsule`).
Yuvarlak uç, duvarın **uç noktasının kendisinde** merkezlidir. Konturu yoktur,
düz tek renktir.

Gönyeli kurgunun iki sorunu vardı ve ikisi de yamayla değil, tanım gereği çözüldü:

1. **Dar açıda kalınlık değişiyordu.** Gönye kesişimi köşeye doğru uzuyor, duvar
   köşeye yaklaştıkça kalınlaşıyordu. Kapsülde kalınlık sabit — eksene dik
   uzaklık her yerde `radiusCm`.
2. **3+ duvarın birleştiği kavşakta kopukluk vardı.** `getSingleNeighbour` komşu
   sayısı 1 değilse gönye yapamıyor, uç düz kesiliyor ve çentik kalıyordu.
   Yuvarlak uç uç noktada merkezli olduğu için o köşede birleşen HER duvar aynı
   `r` yarıçaplı diski doldurur → kavşak kaç duvarlı olursa olsun, açılar ne
   olursa olsun boşluk kalması imkânsız.

Sonuç: `getWallPolygon`, `getWallOutlines`, gönye/miter-limit/pah hesabı,
kendiyle kesişen halka koruması, `polygon-clipping` union'ı ve union öncesi
10⁻⁴ yuvarlama — hepsi silindi. `getWallCapsule` komşulara bakmadığı için
imzası `walls` almaz.

## Union neden gitti

Kontura ihtiyaç duyulmasının tek sebebi köşelerde komşunun içinden geçen iç
çizgilerin görünmesiydi. Kontur kaldırılıp duvarlar tek düz renk olunca çakışma
zaten görünmez: duvarlar üst üste çizilir, birleşim hesabı yapılmaz.

Bu, K22'nin bütün sorun sınıfını ortadan kaldırdı — kilitlenme de, exception da
artık mümkün değil. `wallShapeUnion.test.ts`'teki üç kilitlenme regresyon vakası
bu yüzden **konusuz kaldı ve silindi**; kaybolmadılar, korudukları kod yok.

`polygon-clipping` bağımlılığı DURUYOR: `core/room.ts`'in mahal alanı hesabı
kullanacak (K22'de kararlaştırıldı).

## Nasıl çiziliyor

`scene/Wall.tsx` → duvar başına tek
`<Line lineWidth={getWallLineWidthPx(thickness, zoom)}>`.

LineMaterial yuvarlak uçlu kalın çizgiyi ekran uzayında **analitik** çizer —
hiçbir zoom'da köşelenmez ve üçgenlenmiş geometri yoktur. `lineWidth` kapsülün
TAM genişliğidir (yarısı değil); birimi K97'den beri PİKSEL, cm değil.

`alphaToCoverage` açık: kenar yumuşatma harmanlamayla değil örtme maskesiyle
yapılıyor. Duvarlar tek renk olduğu için çakışan kenarlarda dikiş oluşmaz —
maske hangi örneği seçerse seçsin yazılan renk aynı. Kapatılırsa shader sert
`discard` eder ve eğri uçlar tırtıklanır.

## ⚠️ Kalınlık PİKSEL cinsinden + 3 px taban (K97) — `worldUnits` BIRAKILDI

`lineWidth` ne `wall.thickness`, ne de dünya birimi. Tek adres
`scene/wallStyle.ts` → `getWallLineWidthPx(thicknessCm, zoom)` =
`max(thicknessCm × zoom, 3)` ve `<Line>`'da `worldUnits` YOK.

İki kusur birden vardı:

1. `alphaToCoverage` ile çizilen kapsül bir-iki pikselken bandın TAMAMI "kenar"
   sayılıyor, örtme maskesi seyrekleşiyor, duvar yer yer silinip titriyordu (en
   uzak zoom'da 20 cm duvar = 2 px) → 3 px taban.
2. `worldUnits` shader'ı ışının bir NOKTADAN çıktığını varsayıyor (perspektif);
   ortografik kamerada + 100.000 cm yükseklikte float32 hassasiyeti gidiyor ve
   duvar ekran KENARLARINA doğru inceliyordu → piksel yolu (boruda daha önce
   verilen kararın aynısı, `plumbing/scene/lineStyle.ts`).

Taban boru tarafındakiyle aynı değer (`MIN_LINE_WIDTH_PX`); farklı olsaydı
uzaklaşınca biri kaybolup diğeri kalırdı.

**Kapsül biçimi kaybolmadı:** `worldUnits`siz yolda da uçlar yuvarlak, yalnız
yuvarlaklık ekran uzayında hesaplanıyor. Ortografik tepeden bakışta ekran uzayı
dünyanın düzgün ölçeklenmişi olduğu için K23'ün kavşak dolgusu aynen geçerli.

Zoom duvar başına okunmaz: `Walls`, `FloorBelowGhost` ve tesisattaki
`ArchitectureGhost` `useCameraZoom`u BİR kez okuyup prop olarak dağıtır. Üç yol
da aynı fonksiyondan geçmek zorunda.

Bilinen sınır: açıklık dolgusu dünya uzayında bir mesh, tabana tabi değil — en
uzak zoom'da delik duvar bandından dar kalır. Kiriş ve alan nesnesi konturları
hâlâ `worldUnits` yolunda, aynı iki kusur onlarda da var.

## ⚠️ CAMERA_HEIGHT_CM düşürülmemeli (duvar artık bağlı DEĞİL)

K97'den sonra duvar `worldUnits` kullanmadığı için aşağıdaki hesap duvar için
geçerliliğini yitirdi; uyarı yine de duruyor: `worldUnits` kullanan başka
çizimler (kiriş, alan nesnesi) var ve o değeri düşürmenin bir faydası yok.

`worldUnits` shader'ı ışının **gözden çıktığını** varsayar (perspektif):
`normalize(worldPos.xyz)`. Kameramız ORTOGRAFİK, yani ışınlar paralel. Hata,
kamera yüksekliğinin görünür yarı genişliğe oranıyla ters orantılı.

`CAMERA_HEIGHT_CM = 100_000` iken en düşük zoom'da (%10, ~19200×10800 cm görünür
alan) yarı genişlik ~11.000 cm → hata `100000/√(100000²+11015²)` ≈ **%0,6**;
20 cm'lik duvarda 0,01 px. Görünmez.

Bu değer küçültülürse duvarlar ekran kenarlarına doğru **incelmeye** başlar
(billboard quad kapsülü kırpar). `CAMERA_HEIGHT_CM` "gereksiz büyük" görünüp
düşürülmeye çalışılırsa bu bozulur; `scene/Cameras.tsx`'te de uyarı var.

## Bilinen sonuçlar

- **Serbest uçlar `r` kadar uzuyor.** Yuvarlak başlık uç noktada merkezli olduğu
  için duvar `p1`/`p2`'nin yarıçap kadar ötesine taşar. Ölçü etiketi ekseni
  ölçer, çizilen sınır değil. Kabul edildi (referans tasarım böyle).
- **Dış köşeler yuvarlak, iç köşeler keskin.** İç köşe iki düz kenarın
  buluşmasından çıkıyor, disk oraya taşmıyor.
- **Sadece plan görünümü.** `worldUnits` shader'ı 3B'de silindir üretir, duvar
  değil. 3B/izometrik ayrı bir extrude geometri yolundan gidecek.
- **Duvar artık mesh değil.** İleride tarama deseni (hatch), gölge veya duvara
  gömülü malzeme farkı istenirse elle kapsül geometrisi (gövde + yelpaze uçlar)
  yazmak gerekir.
- **Açıklıklar etkilenmedi:** duvarı KESMİYOR, üstüne boyanıyor
  (`RENDER_ORDER.opening > wall`). Kapsülde delik açma sorunu yok.
- **`findWallUnderPoint` artık çizimle örtüşüyor.** Kabul kriteri zaten "eksene
  dik uzaklık ≤ kalınlık/2 + tolerans", yani bir kapsül testiydi; gönyeli şekil
  köşelerde bu bandın dışına taşıyordu.
