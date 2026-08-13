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

## Çizim etkileşimi: tıkla-yerleştir + tutamaç + panel

`scene/useAreaObjectTool.ts` tıklanan noktaya `DEFAULT_AREA_OBJECT_SIZE_CM[type]`
boyutunda yerleştirir; `ui/properties/AreaObjectProperties.tsx` width/length/angle'ı
sayısal olarak düzenler (yalnız TEK nesne seçiliyken — PointSymbolProperties'in
açı alanıyla aynı kısıt).

**Tutamaç (K44):** seçili TEK nesnede üst kenardan çıkan saplı daire DÖNDÜRÜR,
sağ-alt köşedeki kare BOYUTLANDIRIR. Kod tabanındaki İLK gizmo — öncesinde
böyle bir desen yoktu, sıfırdan kuruldu. Ayrıntı için aşağıdaki "Tutamaç"
bölümü.

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

## Tipe göre farklı çizim (K39, üç tur revize edildi)

**İçi ÇOK SOLUK DOLGULU (K46).** K39'un "tamamen şeffaf" kararı KALKTI: bir
kolon duvar köşesinin üstüne oturunca içi boş nesne "burada bir şey yok" gibi
okunuyor, kullanıcı ortasına tıklayınca altındaki köşeyi tutuyordu.
`AreaObjectGeometry.fill` gövdenin DIŞ HATTINI izleyen tek poligon (kolon
havalandırmasında ÇEMBER, diğerlerinde dikdörtgen); üçgenleştirme odadan
devralınıyor (`core/roomFill.ts` → `triangulatePolygon`). Opaklık 0.12 (oda
dolgusu 0.22'den soluk), renk konturla aynı.

⚠️ Dolgunun KENDİ `renderOrder`'ı var (`areaObjectFill: 31`, önizlemede 69):
konturla aynı sırada opak çizgiler önce çizilir, saydam mesh sonradan onların
ÜSTÜNÜ boyardı (hepsinde `depthWrite` kapalı).

⚠️ Dolgu şikâyeti tam çözmez: `architectureHover.ts`'te köşe hâlâ alan
nesnesinin ÜSTÜNDE, nesnenin merkezi bir köşeye denk gelirse jest yine köşenin.
Önceliği çevirmek merdiven altındaki köşeleri erişilemez yapar — AÇIK SORU.

Renk: `ARCHITECTURE_COLORS.areaObjectStroke` duvar renginden
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

## Tutamaç — kod tabanındaki İLK gizmo (K44/K45)

Kesik çizgili sınır kutusu + iki küçük ikon: kutunun üst-ortasının dışında `↻`
DÖNDÜRÜR, sağ-alt köşesinin dışında `↘` BOYUTLANDIRIR. Yalnız Seçim Aracı'nda
ve TEK alan nesnesi seçiliyken görünür.

**İkonlar DOM (drei `<Html>`), WebGL değil (K45).** Glyph + imleç + tooltip
WebGL'de pahalı/imkânsız, DOM'da bedava — `RoomNameEditor` de aynı gerekçeyle
`<Html>` kullanıyor.

⚠️ **Overlay `pointer-events: none` olmak ZORUNDA.** Tıklama tuvale ulaşmalı:
tutma kararı `findAreaObjectHandleAt` ile saf geometriden veriliyor. Overlay
olayı yeseydi sürükleme hiç başlamaz, üstelik `<Html>`'in AYRI react-dom
kökünden yapılan store yazımı R3F ağacını tazelemezdi (RoomNameEditor'ı native
dinleyiciye iten tuzak). Bunun sonucu: **hover'ı overlay kendi anlayamaz**,
tuval tarafı `areaObjectHandleHover` ile yayınlar; imleç biçimi de oradan
`gl.domElement.style.cursor`'a yazılır (elle yazıldığı için temizlikte elle
geri alınır).

🐞 **`pointer-events: none` `wrapperClass` ile verilir, `className` ile DEĞİL.**
drei `<Html>` iki div üretir: portala eklenen SARMALAYICI + içerik div'i.
`transform` propu kapalıyken sarmalayıcıya pointer-events HİÇ yazılmıyor
(yalnız `transform` modunda `none`), yani sarmalayıcı `auto` kalıp basışı
yutuyor — tutamaçlar tümüyle çalışmaz hâle gelmişti. `className` içerik div'ine
gider ve sarmalayıcıyı kurtarmaz. Doğrusu: `<Html wrapperClass="pointer-events-none">`.

**Konum BOUNDING BOX'tan gelir, modelin width/length'inden değil (K45).**
`getAreaObjectLocalBounds` kutuyu `getAreaObjectPlanGeometry`'nin ürettiği
noktalardan okur — tip başına elle yazılmaz, yeni şekilde kendiliğinden doğru
çalışır. Kolon havalandırması (daire, çap `min(w,l)`) için şarttı: modelden
türetilen kutu ikonları dairenin görünür kenarından uzağa düşürüyordu.

**Ekran-sabit boy:** `useCameraZoom` + `px / zoom`. İkon 14 px, görünmez tutma
alanı 28 px, kutuya uzaklık 18 px. Hook `scene/useCameraZoom.ts`'te (ortak
kamera altyapısı); `plumbing/scene/useCameraZoom.ts` yalnız yeniden dışa
aktarım — tesisatın 5 dosyasının import yolu değişmesin diye.

**Boyutlandırmada KARŞI KÖŞE sabit** (kullanıcı seçti). Bunun sonucu: merkez de
kayar → konum ve boyut BİRLİKTE değişir → ayrı action'lar tek sürükleme için
iki Ctrl+Z adımı üretirdi. Bu yüzden `resizeAreaObject(id, {x,y,widthCm,lengthCm})`
eklendi; panelin kullandığı `setAreaObjectSize` (merkezi sabit tutan) ayrı kaldı.
Matematik `resizeAreaObjectFromCorner`: sabit köşeden imlece giden vektör
nesnenin YEREL eksenine izdüşürülür, böylece döndürülmüş nesnede de kenara
paralel büyür.

(K44'te tutamaç boyu DÜNYA birimindeydi — "zoom kamerada duruyor, bileşen
yeniden render olmaz" gerekçesiyle. K45 bunu `useCameraZoom` ile çözdü ve boy
ekran-sabite geçti; `PointHandle.tsx` hâlâ dünya ölçüsünde.)

⚠️ **Gövdenin DIŞINA taşan etkileşim: sahiplenme kontrolü BEŞ hook'a gerekti.**
Sap tepede, kare köşede yarı dışarıda; aynı pointerdown'ı bütün mimari araçlar
görüyor. `findSelectedAreaObjectHandle` isabet ederse şu hook'ların hepsi jesti
hiç başlatmıyor: `useAreaObjectSelectionTool` (taşıma), `useSelectionTool`
(ÇERÇEVE seçimi — sap gövdenin dışında olduğu için "boşluk" sayılıyordu,
kullanıcı döndürürken lastik dikdörtgen görünce fark edildi),
`useWallSelectionTool`, `usePointSymbolSelectionTool`, `usePointDragTool`.
**Yeni bir dışa taşan etkileşimde bu listeyi yeniden gözden geçir** — tek
kontrol yetmiyor, hata sessiz değil ama garip: iki jest aynı anda çalışıyor.

Bilinen sınırlar: döndürme HER ZAMAN 15°'ye yakalanır (Ctrl kapatmaz; panelle
aynı kural, ama boyutlandırmada Ctrl ızgarayı kapatıyor — tutarsızlık bilinçli
değil, henüz gerekmedi); tek tutamaç var (dört köşe/kenar ortası istenmedi);
boyutlandırma KUTUYU ölçtüğü için kolon havalandırmasında genişlik≠uzunluk ise
nesneyi kareye indirger (daire zaten `min`'i kullanıyordu).

**Tarayıcıda doğrulandı** (yukarıdaki `wrapperClass` hatası düzeltildikten
sonra): kesik çizgili kutu, ikon yerleşimi, ↘ ile boyutlandırma, ↻ ile
döndürme (15°'ye yakalanarak) ve tek adımlık Ctrl+Z. Sınanmadı: nesne sağ
panelin (K37 overlay) altında kalınca ikonlara erişilemiyor.

## Ad etiketi (K50)

Kolon, baca şaftı ve kolon havalandırmasında; **merdivende YOK** (oku ve
basamakları zaten anlatıyor, kullanıcı seçti). Çizim de tutma sınavı da
`hasAreaObjectNameLabel`'dan okur — ayrışsalar görünmez bir etiket tutulabilir
olurdu.

Yazan şey **TÜRÜN adı** ("Kolon"), nesnenin `label` kodu ("K-01") DEĞİL: kod tek
başına ne olduğunu söylemiyor, panelde düzenlenebilir olarak duruyor.

`AreaObject.labelOffsetCm` opsiyonel ve nesneye GÖRELİ: mutlak konum saklansaydı
nesne taşınınca etiket yerinde kalırdı. Alan yoksa varsayılan yer = çizilen
geometrinin DÜNYA kutusunun üstü (yerel kutu döndürülüp eksen hizalıya
çevriliyor, çünkü yazı dik duruyor). `JSON.stringify` undefined'ı atladığı için
dokunulmamış nesnede alan dosyaya hiç yazılmaz — bit-bit tur korunur.

⚠️ Kılavuz kırpması `core/labelLeader.ts`'te. Tesisat tarafındaydı, mimari onu
fay sınırı yüzünden import edemiyordu; ikinci kopya yerine `core/`'a taşınıp
`plumbing/core/elementLabel.ts`'ten yeniden dışa aktarıldı.

⚠️ Etiket gövdenin DIŞINDA ve serbestçe taşınabiliyor → **jest sahipliği yine
BEŞ hook'a eklendi** (K44 dersinin üçüncü tekrarı). `findAreaObjectLabelAt`
isabet ederse çerçeve seçimi/taşıma hiç başlamaz. Silgi etikete değmez.

Kayma ızgaraya yakalanmaz: etiket açıklama notu, çizim geometrisi değil.

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
