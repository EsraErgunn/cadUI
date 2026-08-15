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

Her parçanın uzunluğu **EKSEN üzerinden** ölçülür, yüz boyu değil. Duvar bir kapsül olarak
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

**"Dışarısı" hesaplanmıyor.** İdeali ölçünün odanın dışına düşmesi olurdu ama dış
taraf ancak kapalı bir oda çevriminde tanımlı; serbest duvarda tanımsız. Tutarlı
bir yan, bazen doğru bazen tanımsız bir yandan iyi.

Kaydırma = `wall.thickness / 2 + gapCm`. Kalınlığın yarısını core ekler (kalınlığı
bilen taraf orası), ekran-sabit boşluğu çağıran `px / zoom` olarak verir.

## Görünürlük

Anahtar tesisatla ORTAK: `uiStore.isDimensionsVisible`. Kullanıcı için tek bir
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
