# Etiket görünürlüğü ve kot yazımı (K130–K133)

Ekranda okunan yardımcı yazıların — ölçü, kot, alt kat izi — hangi görünümde,
hangi anahtarla ve hangi biçimde çıktığı.

## Alt kat izi tesisatta YOK (K130)

`plumbing/scene/InstallationBelowGhost.tsx` SİLİNDİ. Yanındaki
`INSTALLATION_BELOW_GHOST_ELEVATION_CM` (plumbingLayers.ts) ve
`RENDER_ORDER.installationBelowGhost` (scene/layers.ts) de kalktı — bu adlarla
yeni kod yazma.

Mimarideki `scene/FloorBelowGhost.tsx` DURUYOR. Asimetri bilinçli: üst kat
duvarı alttakinin üstüne oturmak zorunda olduğu için orada iz bir hizalama
referansı; borularda öyle bir kısıt yok, iz yalnız aktif katın borusuyla
karışıyordu.

## Ölçüler varsayılan AÇIK (K131)

`uiStore.isDimensionsVisible` başlangıç değeri `true`. Bayrak hâlâ TEK: mimaride
duvar parçalarını, tesisatta boru boylarını açar (ViewOptionsMenu'deki tek
"Ölçüler" maddesi). Kaydedilmez, geçmişe girmez.

Bağımsız kalan anahtarlar (K76/K77 duruyor): `isOpeningDimensionsVisible`,
`isCornerAnglesVisible`, `isElementLabelsVisible`.

## Boru ölçüleri mimari görünümde de var (K132)

`Ghosts.tsx` → `InstallationGhost` artık `<LengthLabels />` mount ediyor.
Hayaletin aksine SOLUKLAŞTIRILMAZ: hat bağlam, ölçü ise okunmak istenen bilgi.

Etiket biçimi iki görünümde AYNI (yalnız uzunluk). Çap etikete girmez — çizgi
renginden (K27) ve özellik panelinden okunuyor, yazıyı iki katına çıkarmak sık
köşeli planlarda üst üste bindiriyordu. `LengthLabels` ölçünün TEK çizim yolu
olmayı sürdürüyor; ikinci bir uzunluk yazımı açma.

## Kot yazımı: fark + varılan kot (K133)

Biçimleyicilerin tek yeri `core/lengthFormat.ts`:

- `formatSignedMeters(cm)` → `+2,00` / `-0,50` / `0,00`. Birim EKİ YOK (parantez
  içinde, birimi zaten söylenmiş bir uzunluğun yanında duruyor). Uzunluğun
  aksine İŞARET taşır: kot mesafe değil, zemine göre yönlü konum. Yuvarlandığında
  sıfıra düşen negatif değer `-0,00` yazmaz.
- `formatElevationMeters(cm)` → `+0,15 m`. Tek başına duran kot.

Nerede çıkıyor:

- `PipeElevationGlyph` → `▲0,75 m (+2,00)`. Fark K129'un koruduğu bilgi, parantez
  içindeki varılan kot yeni. Koşul değişmedi: `firstElevationCm !== lastElevationCm`.
- `ServiceBoxElevationLabels` (`plumbing/scene/ServiceBoxElevationLabel.tsx`) →
  servis kutusu sembolünün ALTINDA `+0,15 m`. Yalnız `serviceBox` türü: sayaç ve
  cihazların kotu bağlı oldukları borudan türüyor (K102) ve her elemana kot
  yazmak planı sayıya boğardı. Çapası `plumbing/core/elementLabel.ts` →
  `getElementElevationLabelAnchorCm`, ad etiketinin AYNASI (o üste, bu alta) —
  kot etiketi sürüklenemiyor, ikisi aynı tarafta olsaydı ayrılamazlardı.

İki gösterge de "Ölçüler" anahtarına BAĞLI DEĞİL (K129: kot göstergesi
kaybolmaz). Kot store'da durmaz, `getElementElevationCm` ile türetilir.

## Sayaç etiketi: birim + abone bilgisi (K134)

Plandaki sayaç etiketi tür adının altına şunları yazar:
`Birim: 3` / `FATMA ÇELİK` / `Abone No: 10045`. İki NUMARA alanı etiketli, abone
ADI etiketsiz — yan yana duran iki çıplak sayı ayırt edilemiyordu.

Detay satırları artık sabit şekilli bir nesne değil SIRALI dizi
(`getElementLabelDetailLines`, `plumbing/core/elementLabel.ts`); tür başına
farklı alan kümesi taşınabiliyor. Diğer türler hâlâ marka + model + açıklama.

İzometriğin sayaç etiketi AYRI (`isometric/core/isometricLabels.ts`,
`Sayaç Daire 3` + sınıf + alan + debi) — WebCAD düzenini izliyor, plan
etiketiyle ortaklaştırılmadı.
