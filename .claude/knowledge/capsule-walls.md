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

`scene/Wall.tsx` → duvar başına tek `<Line worldUnits lineWidth={wall.thickness}>`.

`worldUnits`, LineMaterial'ın kapsül shader'ını açar: parça, ışının doğru
parçasına uzaklığı yarıçapı aşınca atılır. Eğri **analitiktir** — hiçbir zoom'da
köşelenmez ve üçgenlenmiş geometri yoktur. `lineWidth` kapsülün TAM genişliğidir
(yarısı değil), birimi cm.

`alphaToCoverage` açık: kenar yumuşatma harmanlamayla değil örtme maskesiyle
yapılıyor. Duvarlar tek renk olduğu için çakışan kenarlarda dikiş oluşmaz —
maske hangi örneği seçerse seçsin yazılan renk aynı. Kapatılırsa shader sert
`discard` eder ve eğri uçlar tırtıklanır.

## ⚠️ Gizli bağımlılık: CAMERA_HEIGHT_CM düşürülmemeli

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
