# decision: Alan nesnesi (merdiven/kolon/baca şaftı) — K38/K39

**Model:** `AreaObject` (`core/model.ts`) — serbest, döndürülebilir dikdörtgen:
`{id, type, floorId, x, y, widthCm, lengthCm, angleDeg, label}`. PointSymbol'ün
(Desen A) bilerek dışarıda bıraktığı "ölçü taşıyan" nesneler (Desen B) için.
`AreaObjectType`: `stairs` | `structuralColumn` | `flueShaft` — `core/tools.ts`
toolId'leriyle BİREBİR aynı isim (PointSymbolType ile aynı desen). Kiriş buraya
GİRMEZ: o çizgisel (x1,y1,x2,y2), ayrı bir model.

## Çizim etkileşimi v1: tıkla-yerleştir + panelden ayarla

Tuvalde sürükleyerek boyutlandırma/döndürme (gizmo) YOK — kod tabanında hiçbir
yerde böyle bir tutamaç deseni yok (PointSymbol'ün döndürmesi bile panelde bir
sayısal alan, sahnede değil), sıfırdan inşa etmek ayrı bir iş. `scene/useAreaObjectTool.ts`
tıklanan noktaya `DEFAULT_AREA_OBJECT_SIZE_CM[type]` boyutunda yerleştirir;
`ui/properties/AreaObjectProperties.tsx` width/length/angle'ı SONRADAN
düzenler (yalnız TEK nesne seçiliyken — PointSymbolProperties'in açı alanıyla
aynı kısıt).

## K35/K36 açıklık koruması — İKİ kontrol gerekti (biri sonradan eklendi)

`core/areaObject.ts` → `findBlockingOpeningForAreaObject` ÖNCE nesnenin dört
kenarını segment olarak `findBlockingOpeningInSegments`'e (K35/K36,
`core/wallGraph.ts`) geçirir. Bu YETMEDİ: kolon/baca şaftının varsayılan
boyutu 1m'e büyüyünce (K39) gerçek bir boşluk çıktı — 100cm'lik bir nesne
90cm'lik bir kapıyı tam ortalarsa, kenarların duvarı kestiği iki nokta
(offset ±50cm) açıklığın aralığının (±45cm) TAM DIŞINA düşüyor, nesne kapıyı
fiziksel olarak sarmalıyor ama hiçbir kenar aralığın İÇİNDE kesişmiyor — ilk
kontrol bunu KAÇIRIYORDU. 25×25 kolonla yazılan ilk test bunu YAKALAYAMAMIŞTI
(kenarlar aralığın içine düşüyordu tesadüfen), boyut büyüyünce ortaya çıktı.

**Düzeltme: ikinci kontrol eklendi.** Kenar-kesişimi boşsa, açıklığın MERKEZ
noktası (`getWallFrameAtOffsetCm`, `core/wallPath.ts`) nesnenin içinde mi diye
de bakılıyor (`isPointInAreaObject`). İkisi birden de wall-graph.md'deki
"üst üste binen duvarlar" sınırını miras alıyor — nesnenin kenarı açıklığı
taşıyan duvarla PARALEL ve üst üsteyse (`getInteriorCrossing` kesişim
üretmez) VE açıklığın merkezi nesnenin dışında kalıyorsa, ikisi de kaçırabilir.

**Ders:** boyut varsayımlarını (küçük test nesnesi = küçük risk) değiştirmek
geometrik kontrolün gerçek kapsamını ortaya çıkarabilir — "testler geçiyor"
her senaryoyu kapsadığı anlamına gelmez, özellikle sınır-durumu (nesne
açıklıktan büyük/küçük) testleri eksikse.

## Seçim/vurgu zincirine yeni `'area'` türü

`core/selection.ts` (`SelectableKind`), `core/architectureHover.ts`
(`ArchitectureTarget`, sıra: köşe → sembol → **alan nesnesi** → açıklık →
duvar), `core/propertyFields.ts` (`PropertySelectionKind`) — PointSymbol'ün
`'symbol'` dalıyla birebir aynı desende genişletildi.

## Kat kopyalama ve silme unutulmadı

`core/floorClone.ts` → `cloneFloorArchitecture` alan nesnelerini de kopyalar
(yeni id + yeni etiket — sembolle aynı gerekçe, KK-10 çakışması kat içinde
tanımlı). `store/floorOps.ts` → `removeFloorFromDraft` katı silinen alan
nesnelerini düşürür. İkisi de unutulsaydı kat işlemlerinde sessizce veri
kaybederdi — kod derlenir, testler geçer, ama üretimde kayıp fark edilmezdi.

## Model sözleşmesi: aynı commit'te migration şart

`ProjectData` "dört kişi arasındaki sözleşme, izinsiz alan eklenmez" diyor —
`model.ts`/`serialize.ts` bu oturumda sahipsizdi. Yeni dizi eklenince
`serialize.ts`'e AYNI commit'te `.default([])` + `docs/sample-project.json`'a
`"areaObjects":[]` eklenmesi ZORUNLU, yoksa kabul testi ("bit bit aynı") kırılır
(bkz. point-symbols.md'deki aynı tuzak).

## Tipe göre farklı çizim, İÇİ ŞEFFAF (K39, iki tur revize edildi)

**İçi TAMAMEN ŞEFFAF — hiçbir tip dolgu taşımaz.** İlk taslakta açık gri
dolgu vardı; kullanıcı "hepsinin içi şeffaf olsun" dedi.
`AreaObjectGeometry.fills` alanı YOK — `scene/AreaObject.tsx` mesh üretmiyor,
yalnız `<Line>`. Renk: `ARCHITECTURE_COLORS.areaObjectStroke` duvar renginden
(`wall: '#3e4a5a'`) bir tık koyu (`#232a34`); gövde çizgisi kalın (3),
ayrıntı ince (1.5) — "daha soft" istendi.

- **Kolon / Baca şaftı:** varsayılan boyut 1m × 1m (eski 25×25/40×40 çok
  küçüktü — kullanıcı görsel referansla büyüttü). Baca şaftının iç çemberi
  (`FLUE_SHAFT_CIRCLE_RATIO = 0.92`) karenin dış hattıyla AYNI kalınlıkta
  (`role: 'body'`, açıkça istendi — varsayılan "ince ayrıntı" değil).
- **Merdiven:** varsayılan uzunluk 200cm (tek kol, tam kat yüksekliği DEĞİL);
  basamak çizgileri (~28cm aralık, salt görsel); iniş yönünü belirten İNCE
  ÇİZGİ ok (gövde + V başlık — kullanıcı üç stil arasından seçti, DOLU üçgen
  değil).

⚠️ **Ok yönü sabit bir çizim kuralı, VERİ DEĞİL, ve -Y'ye bakar.** Model hangi
ucun "iniş" olduğunu taşımıyor; `buildStairArrowLines` her zaman yerel -Y
ucuna bakar — `Cameras.tsx`'te ekranda "yukarı" plan +Y'ye denk geldiği için
"aşağı" -Y'dir (ilk tur yanlışlıkla +Y'ye bakıyordu, kullanıcı düzeltti).
Nesne döndürülünce ok da onunla döner ama "gerçek" iniş yönü tersse
düzeltecek bir alan yok (`AreaObject`'e `isArrowFlipped` gerekirse sonra
eklenir).

Çok kısa merdivende ok hiç üretilmez (`buildStairArrowLines` boş dizi döner) —
dejenere çizgi çizilmez.

**Önizleme farklı renk değil, AYNI rengin SAYDAM hâli.** Eskiden mavi
(`previewValid`) idi; kullanıcı "yerleştirdiğimde normal hâlini alsın,
önizlemede aynı şeklin bir tık saydamı gözüksün" dedi — `opacity: 0.45`,
aynı `areaObjectStroke` rengiyle.

**Çizgi kalınlığı `worldUnits` — Wall.tsx ile aynı gerekçe.** İlk hâlde drei
`<Line>` piksel-bazlı (worldUnits YOK) kalınlık kullanıyordu: ekranda SABİT
piksel genişlik, yani uzaklaşınca (zoom out) nesneye göre ORANTISIZ
kalınlaşıyordu — kullanıcı "garip gözüküyor" dedi. `Wall.tsx`'teki desen
kopyalandı: `worldUnits` + cm cinsinden `lineWidth` (gövde 2.5cm, ayrıntı
1.2cm) — artık fiziksel kalınlık zoom'dan BAĞIMSIZ sabit.

**Ctrl ile ızgara kapatma İLK yerleştirmede de çalışıyor.** Taşırken zaten
vardı (`useAreaObjectSelectionTool.ts`); `useAreaObjectTool.ts`'te YOKTU —
kullanıcı fark etti. `readPosition` artık `event.ctrlKey`'e bakıyor, ilk
tıklama da dahil.

**Dosya ikiye bölündü (200 satır kuralı).** Çizim fonksiyonları yeni
`core/areaObjectGeometry.ts`'de; `core/areaObject.ts` etiket + geometri
yardımcıları + K35/K36 çarpışma mantığında kaldı.

**Tutamaç (resize/rotate gizmo) hâlâ v1 dışı** — kullanıcı bunu K38'de
onaylanan kapsam daraltmasının DIŞINDA bir şey olarak değil, aynı kararın
devamı olarak İKİ KEZ teyit etti ("tutamaçları sonra halledelim").

## Tarayıcıda doğrulanmadı

Yerleştirme/seçim hook'ları R3F gerektirdiği için birim testsiz kaldı (K36 ile
aynı sınır) VE bu oturumda backend ayakta olmadığı için tarayıcıda da manuel
doğrulanmadı. `npm run build`/`lint`/`test:run` yeşil. **Sıradaki kişi mutlaka
tarayıcıda dener.**

**Dosya:** core/model.ts · core/serialize.ts · core/areaObject.ts ·
core/selection.ts · core/architectureHover.ts · core/propertyFields.ts ·
core/floorClone.ts · store/areaObjectOps.ts · store/architectureSlice.ts ·
store/architectureUiStore.ts · store/floorOps.ts · store/floorCloneOps.ts ·
store/selectionOps.ts · scene/useAreaObjectTool.ts ·
scene/useAreaObjectSelectionTool.ts · scene/AreaObject.tsx ·
scene/ArchitectureLayer.tsx · ui/properties/AreaObjectProperties.tsx ·
ui/PropertyPanel.tsx
