# decision: duvar ölçü etiketleri

Tür: `decision` · 2026-08 · İlgili: K72, K73 (docs/kararlar.md)

## Ne ölçülüyor

Duvar, üzerindeki açıklıkların kestiği PARÇALARA bölünerek ölçülür (K73):
kapı/pencerenin iki yanında kalan dolu parçalar + açıklığın kendi genişliği.
İmalatta ölçülen budur, duvarın toplam boyu değil. Açıklığın etiketi FARKLI
renkte (mor) — aynı hizada yan yana duran sayıların hangisinin boşluk olduğu
konumdan okunamıyordu.

Bölme yalnız GÖSTERİM içindir: modelde açıklık duvarı bölmez, tek parça duvarın
üstünde bir deliktir (opening-placement.md).

Her parça İKİ uzunlukla gelir (K74): `innerLengthCm` (içten — köşedeki dik
duvarların kütlesi düşülmüş) ve `outerLengthCm` (dıştan — o kütle eklenmiş).
Komşunun ekseni köşede durduğu için etkisi kalınlığının YARISI kadar:
`içten = eksen − Σ(komşu/2)`, `dıştan = eksen + Σ(komşu/2)`.

Hesap `getNeighbourThicknessCm`'i yeniden kullanır. DİKKAT: açıklığın köşe payı
(K11) aynı fonksiyonu TAM kalınlıkla okur — o bilinçli olarak temkinli bir pay,
buradaki gerçek geometri. İkisini birbirine çevirme.

Köşe payı yalnız duvarın UCUNA dayanan parçayı ilgilendirir: iki açıklık
arasında kalan parçanın komşusu yoktur, içi ve dışı eşittir. Açıklık parçasında
her zaman eşit.

Bu, "dışarısı hesaplanmıyor" kuralını bozmaz: hesaplanan yön değil, iki uzunluk. Duvar bir kapsül olarak
çiziliyor (bkz. capsule-walls.md) ve kavşakta komşusuyla iç içe giriyor: "yüz
boyu" için önce hangi komşunun nereden kestiğini çözmek gerekirdi ve iki komşu
duvar farklı kalınlıktayken aynı duvarın iki yüzü farklı sayı verirdi.

Modelde `lengthCm` alanı YOK ve eklenmemeli: uzunluk her karede geometriden
hesaplanır. Alan olsaydı köşe taşındığında bayatlardı (tesisattaki
`LengthLabels` ile aynı gerekçe).

## Yazının yönü ve yanı — sıra önemli

`core/wallDimensions.ts` → `getWallDimensionAnnotations`:

1. Ham açı (-90°, 90°] dışına düşerse duvar TERS yönde okunur → yazı hiçbir
   zaman baş aşağı durmaz.
2. Etiketin düştüğü yan, bu normalleştirmeden SONRA eksenin sol normalinden
   alınır.

Sıra ters olsaydı yan, hangi ucun `p1` olduğuna bağlı kalırdı: aynı duvar ters
yönde çizildiğinde ölçüsü öbür yana atlar, plan çizim sırasına göre farklı
görünürdü. Bu sırayla yan yalnız geometriden çıkıyor.

**"Dışarısı" ancak ÇEVRİMDE tanımlı.** Kapalı çevrime giren duvarda oda tarafı
biliniyor ve kullanılıyor (K75). Serbest duvarda tanımsız: orada sol normal
olduğu gibi kalır, iki sayı yine karşılıklı yanlara düşer ama hangisinin oda
tarafı olduğu İDDİA EDİLMEZ.

Kaydırma = `wall.thickness / 2 + gapCm`. Kalınlığın yarısını core ekler (kalınlığı
bilen taraf orası), ekran-sabit boşluğu çağıran `px / zoom` olarak verir.

## Görünürlük

İç ölçü duvarın ODA tarafına, dış ölçü karşı yanına yazılır (K75). Oda tarafı
`buildWallInteriorPoints` ile bulunur: `findRoomFaces` her kapalı çevrimi verir,
`getRoomLabelAnchor` çevrimin en ferah noktasını (ağırlık merkezi DEĞİL — içbükey
odada dışarı düşer ve iç/dış ters çevrilir), sol normal o noktaya bakacak şekilde
çevrilir. Sonuç çağıranda `useMemo` ile önbelleğe alınır; zoom her karede
oynuyor, çevrim araması ise duvar/nokta değişmedikçe aynı.

İki değer eşitse TEK satır (aynı sayıyı duvarın iki yanına yazmak "bunlar
farklı" der ve yalan söyler); içten sıfıra düşerse yalnız dıştan yazılır.

İKİ BAĞIMSIZ anahtar (K76): `isDimensionsVisible` duvar parçalarını,
`isOpeningDimensionsVisible` açıklık genişliklerini açar. Dördü de anlamlı bir
hâl; biri kapalıyken diğeri çalışmaya devam eder. Core'da iki ayrı seçenek:
`isWallVisible` / `isOpeningVisible`.

`wallIds` kısıtı (sürükleme sırasındaki geçici gösterim) YALNIZ duvar
parçalarını daraltır. Açıklık ölçüsü aynı kısıttan geçseydi "duvar kapalı,
açıklık açık" hâlinde ekran boş kalırdı — kısıt o durumda boş dizi oluyor.

Duvar ölçüsü anahtarı tesisatla ORTAK: `uiStore.isDimensionsVisible`. Kullanıcı için tek bir
"ölçüleri göster" tercihi var — ayrı bayrak olsaydı menü çubuğundaki tek
"Ölçüleri Göster" maddesi hangisini kastettiğini söyleyemezdi.

Katman kapalıyken de sürükleme sırasında çizilir, ama YALNIZ düzenlenen duvarlar
(taşınan duvarlar ya da oynatılan köşeyi paylaşan duvarlar — `getWallsAtPoint`).
Tüm planı açmak, kullanıcının kapattığı katmanı geri açmak olurdu.

Canlılık bedava: `scene/WallDimensionLabels.tsx` noktaları `useArchitecturePoints()`
ile okuyor, o da sürüklenen köşenin geçici konumunu veriyor. `core/` React'ten
habersiz kalır — noktalar parametre olarak girer.

## Tuzaklar

- Yazı `RENDER_ORDER.measurement` katmanında, tutamaçların (`handle`) ALTINDA:
  sayı köşe tutamacını örterse köşe tutulamaz hâle gelir.
- `raycast={() => null}` şart; ölçü yazısı ışın hedefi olursa altındaki duvar
  seçilemez.
- Dönüş `[-π/2, 0, açı]` sırasıyla veriliyor. Three.js 'XYZ' Euler sırasında Z
  önce uygulanır (yazı kendi düzleminde döner), sonra X ile plana yatırılır.
  Sıra değişirse yazı düzlemden kalkar.
- Biçimleyici `core/lengthFormat.ts`'te ve tesisatla ORTAK; `core/coords.ts`'teki
  `formatLengthAsMeters` nokta ondalık üretiyor, tuvalde kullanılmaz.
- React anahtarı `wallId` DEĞİL (K73): bir duvar birden çok etiket üretiyor.
  `annotation.key` kullanılır — `wall-<duvarId>-<sıra>` / `opening-<açıklıkId>`.
- Taşan açıklık span'i duvar boyuna kelepçelenir: duvar kısalınca sığmayan
  açıklık siliniyor (K16) ama silinme ile yeniden çizim arasındaki karede taşan
  span gelebilir, ölçü negatife düşmemeli.

## Bilinen sınır

İki komşu duvarın uçlarındaki kısa parçalar (20–25 cm) aynı noktada buluştuğunda
etiketleri üst üste biniyor. Ekranda doğrulandı, bilinçli olarak bırakıldı: ekran
boyuna göre eleyen bir eşik çözerdi ama kullanıcının görmek isteyebileceği sayıyı
gizlerdi. Karar verilmeden eklenmesin.

## K95 — içten/dıştan KALDIRILDI

Yukarıdaki K74/K75 bölümleri artık GEÇMİŞ kaydıdır: duvar parçası tek sayı
yazıyor, kendi EKSEN boyu. `innerLengthCm`/`outerLengthCm` ve `interiorPoints`
yok; `WallDimensionAnnotation` = `lengthCm` + `position` (okunur yönün sol
normali). `buildWallInteriorPoints` silindi, bu yolda `findRoomFaces` çağrısı
kalmadı.

Sebep: planda yanlış çalışıyordu — aynı duvarda komşu kalınlığının yarısıyla
açıklanamayacak çiftler ve 2 cm'lik sayılar çıkıyordu; kullanıcı doğru çiftle
bozuk olanı ayırt edemiyordu. Doğru tek sayı, yanlış iki sayıdan iyidir.

K73 (açıklıkların duvarı parçalara bölmesi) ve K76 (iki anahtarın bağımsızlığı)
DURUYOR.
