# decision: Alan nesnesi (merdiven/kolon/baca şaftı/kolon havalandırması) — K38-K41

**Model:** `AreaObject` (`core/model.ts`) — serbest, döndürülebilir dikdörtgen:
`{id, type, floorId, x, y, widthCm, lengthCm, angleDeg, label}`. PointSymbol'ün
(Desen A) bilerek dışarıda bıraktığı "ölçü taşıyan" nesneler (Desen B) için.
`AreaObjectType`: `stairs` | `structuralColumn` | `flueShaft` | `columnVentilation`
— `core/tools.ts` toolId'leriyle BİREBİR aynı isim (PointSymbolType ile aynı
desen). Kiriş buraya GİRMEZ: o çizgisel (x1,y1,x2,y2), ayrı bir model.

⚠️ **Bilinen sapma:** `model.ts`'in PointSymbolType yorumu (K38'den ÖNCE
yazılmıştı) Baca Şaftı + Kolon Havalandırması'nı "Desen C — katlar arası eksen
kimliği" diye ayrı, Riser gibi kat-bağımsız bir modele koyuyordu. İkisi de
burada, basit KAT-BAŞI `AreaObject` olarak modellendi — bilinçli sadeleştirme,
kat-bağımsız kimlik gerekirse ayrı karar.

## Çizim etkileşimi v1: tıkla-yerleştir + panelden ayarla

Tuvalde sürükleyerek boyutlandırma/döndürme (gizmo) YOK — kod tabanında hiçbir
yerde böyle bir tutamaç deseni yok (PointSymbol'ün döndürmesi bile panelde bir
sayısal alan, sahnede değil), sıfırdan inşa etmek ayrı bir iş. `scene/useAreaObjectTool.ts`
tıklanan noktaya `DEFAULT_AREA_OBJECT_SIZE_CM[type]` boyutunda yerleştirir;
`ui/properties/AreaObjectProperties.tsx` width/length/angle'ı SONRADAN
düzenler (yalnız TEK nesne seçiliyken — PointSymbolProperties'in açı alanıyla
aynı kısıt).

**Jesti SAĞ TIK bitirir (K42).** Araç yerleştirdikten sonra aktif kalır (arka
arkaya ekleme), sağ tık hem önizlemeyi siler hem paleti `SELECTION_TOOL_ID`'ye
döndürür — tesisattaki `useEscapeToSelectionTool` ile aynı gerekçe. Sağ tık
yerleştirme yapmaz (`onPointerUp` zaten sol tuş dışını eliyor; tarayıcıda
`contextmenu`, `pointerup`'tan sonra gelir). Duvar/oda araçlarında sağ tık
zinciri bitirir ama araç AKTİF KALIR — zincir çizimi arka arkaya sürüyor,
bilinçli fark. Nokta sembolü araçlarında sağ tık hâlâ hiçbir şey yapmıyor
(kapsam dışı bırakıldı).

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
kopyalandı: `worldUnits` + cm cinsinden `lineWidth` — artık fiziksel kalınlık
zoom'dan BAĞIMSIZ sabit.

⚠️ **Ama ilk değerler (2.5 / 1.2 cm) ÇOK İNCEYDİ ve uzakta kayboluyordu (K43).**
Zoom 1'de 1 cm = 1 px; en uzak zoom'da (`ZOOM_MIN = 0.1`) 2.5 cm yalnız
0.25 px eder → nesne ekrandan silinir. Duvar aynı yolu 20 cm ile kullandığı
için bu sorunu yaşamıyordu. Değerler duvardan TÜRETİLDİ (sabit sayı yazılmadı
ki ilişki kodda görünsün): gövde `DEFAULT_WALL_THICKNESS_CM / 4` (5 cm),
ayrıntı `/ 8` (2.5 cm). **`worldUnits` kullanan her yeni çizgide bu hesabı
yap:** en uzak zoom'da kaç piksel eder? 1 px'in altına düşen çizgi görünmez.

⚠️ **Doğru değeri bulmak İKİ TUR sürdü — kalınlık tek başına çözüm değil.**
Önce duvarın yarısı (10 cm) denendi, kullanıcı "aşırı kalın" dedi; yarıya
indirildi. Yani "kaybolmasın" ile "kalın durmasın" arasında dar bir bant var
ve 5 cm en uzak zoom'da yine 0.5 px eder. Bir daha aynı şikâyet gelirse
kalınlığı ARTIRMA — `Wall.tsx`'teki `alphaToCoverage` ekle (sert `discard`
yerine kısmi örtme); önizlemenin `transparent` malzemesiyle etkileşimi
doğrulanmadığı için bugün eklenmedi.

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

## Kolon Havalandırması (K41): Baca Şaftı'nın karesiz hâli

Roadmap notu: "WebCAD'de RoofVent{radius,x,y}, basit nokta+yarıçap."
`getAreaObjectPlanGeometry`'de AYRI bir dal — yalnız `circle` stroke'u döner,
`outline` (kare) YOK. Varsayılan boyut 30×30cm, etiket öneki `KH`. Toolbar
zaten hazırdı (`core/tools.ts` → `columnVentilation`, `toolIcons.ts` → `Wind`
ikonu) — `AREA_OBJECT_LABEL_PREFIXES`'e eklemek yerleştirme aracını otomatik
bağladı (`getAreaObjectTypeForTool` genel `toolId in RECORD` kontrolü).

## Main'de ayrı bir entegrasyon boşluğu bulundu ve düzeltildi (K41 sırasında)

`feat/floor-management-dialog` (ayrı bir kişinin dalı, bu işten bağımsız) yeni
`core/floorContent.ts` eklemiş; `FloorContentSource` tipi K38'in
`FloorCloneSource`'unu (artık `areaObjects` zorunlu) genişletiyordu ama iki
çağıran (`floorContent.test.ts`, `ui/floors/useFloorPlanDraft.ts`)
`areaObjects` eklemeyi unutmuştu — **main derlenmiyordu**, benim dalımdan
bağımsız. `getFloorContent` o alanı hiç okumuyor, yalnız tip yapısı için
gerekiyordu — iki yere eklemek yetti. Ayrıca `docs/sample-project.json`'da
(aynı merge'den, `heightCm`/`isBasement` eklenirken) dosya başı/sonunda
fazladan boş satır kalmıştı, kabul testini ("bit bit aynı", ham metin `toBe`)
kırıyordu — tek satıra düzeltildi.

**Ders:** `git fetch` + yeni dal açtıktan hemen sonra `npx tsc -b` çalıştırmak
ucuza mal oluyor — kendi değişikliklerine başlamadan ÖNCE main'in gerçekten
yeşil olduğunu doğrular, aksi hâlde "ben mi bozdum" sorusuyla vakit kaybedilir.

## Tarayıcıda KISMEN doğrulandı

Kullanıcı bu turda gerçekten tarayıcıda denedi — zoom out'ta çizgi kalınlaşması
(K40) ve ilk yerleştirmede Ctrl'in ızgarayı kapatmaması (K40) tarayıcı
testinden çıktı. Yerleştirme/seçim hook'ları yine de R3F gerektirdiği için
birim testsiz kaldı (K36 ile aynı sınır); Kolon Havalandırması'nın kendisi
ayrıca tarayıcıda denenmedi.

**Dosya:** core/model.ts · core/serialize.ts · core/areaObject.ts ·
core/areaObjectGeometry.ts · core/selection.ts · core/architectureHover.ts ·
core/propertyFields.ts · core/floorClone.ts · store/areaObjectOps.ts ·
store/architectureSlice.ts · store/architectureUiStore.ts · store/floorOps.ts ·
store/floorCloneOps.ts · store/selectionOps.ts · scene/useAreaObjectTool.ts ·
scene/useAreaObjectSelectionTool.ts · scene/AreaObject.tsx ·
scene/ArchitectureLayer.tsx · ui/properties/AreaObjectProperties.tsx ·
ui/PropertyPanel.tsx · (ilgisiz düzeltme) ui/floors/useFloorPlanDraft.ts ·
docs/sample-project.json
