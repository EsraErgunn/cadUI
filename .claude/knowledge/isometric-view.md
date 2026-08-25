# İzometrik görünüm

Editörün üçüncü görünümü (`ViewId = 'isometric'`). Çizimden OTOMATİK üretilir,
tüm katları tek parça gösterir. Kod: `src/isometric/` (`plumbing/` deseninin
aynası: `core/` + `scene/` + `store/` + `ui/`).

Adım adım ilerleyiş ve elle kontrol listeleri: repo kökündeki
`izometrik-adimlari.md`. Kararlar: `docs/kararlar.md` K120–K124.

## Kapsam

Yalnız TESİSAT çizilir (boru + elemanlar + etiketler). Mimari HİÇ çizilmez.
Aktif kat kavramı YOKTUR — tüm katlar aynı anda.

## İzdüşüm — işaretleri değiştirmeden önce oku

```
M₃(α, β) = Rx(α) · Ry(β) · Rx(π)        varsayılan α = 35,264°, β = 45°

right   = −M₃ satır 1
up      = −M₃ satır 2
forward = −M₃ satır 3
```

İlk iki çarpan WebCAD'in `getIsometryTransform3x3`'ü ile birebir aynı
(`izometrik.md`, derlenmiş bundle). `Rx(π)` bizim eksen düzenimize geçiş.

**Varsayılan açı WebCAD'inkinden FARKLI.** Onunki 40°/60°, yani bir dimetrik.
Bizimki gerçek izometri (atan(1/√2) = 35,264° / 45°): üç eksen ekranda eşit
kısalır, eksenler yatayla 30° yapar — "klasik 30°" denen okunuş (kullanıcı
kararı). İzdüşüm ailesi hâlâ WebCAD'inki, yalnız başlangıç açısı bizde farklı.
Hazır açılar: **Varsayılan** ve **Üstten** (α sınırda, 90°'de kamera yönelimi
tanımsız kalırdı). Yan görünümler yok — α = 0'da zemin düzlemi kenardan
görünüp kat yerleşimi tek çizgiye çöküyor, o iş plan görünümünün.

**⚠️ KÂĞIDIN İZDÜŞÜMÜ AYRI, SABİT ve OBLİK** (`getObliqueProjection`, K155).
PDF izometrik sayfası ekrandaki α/β'yı KULLANMAZ ve aynı izdüşüm ailesinde bile
değildir.

| Model ekseni | Kâğıttaki yön |
|---|---|
| plan x | TAM YATAY (0°) |
| plan y | 30° EĞİK (sol-aşağı, −150°) |
| kot | TAM DİKEY (90°) |

⚠️ Bu bir izometri DEĞİL, oblik (cavalier) izdüşümdür. İzometride üç eksen eşit
kısalır; kot dikeyken bu, kalan iki ekseni ZORUNLU olarak ±30°'ye oturtur — yani
hiçbir eksen yatay olamaz. Kullanıcının gerçek gaz paftası ve ona ait iki kat
planı ölçüldü, yatay segmentler var: o çizim izometri değil, kâğıt referansa
uyuyor. Önce gerçek izometri (β = 135°) yazılmıştı, referans görülünce DÖNÜLDÜ.

⚠️ Oblik hiçbir kamera açısıyla elde EDİLEMEZ: `Rx(α)·Ry(β)` ailesinde plan x'i
yatay yapan tek durum β = 0/180 ve orada plan y düşeyle ÇAKIŞIYOR (ölçüldü, +Y
ve +Z ikisi de 90°) — plan derinliği kayboluyor. Oblik ortografik bir bakış
değil, bir KESME dönüşümü.

**Bu yüzden ekran ile kâğıt AYRIŞTI.** Ekrandaki 3B görünüm gerçek ortografik
kamerayla çiziliyor ve kesme yapamaz; orada döndürülebilir izometri kalıyor.
K122 geçerli: α/β hâlâ projeye yazılıyor ve EKRANI yönetiyor, kalkan tek şey
kâğıda gitmesi. Eskiden gidiyordu ve "Üstten" ön ayarında (α = 89°) sayfa
neredeyse plan görünümüne çöküyordu.

⚠️ `IsometricAngles` yerine artık `IsometricProjection` geçiyor: `project` +
`offsetToWorld`. `buildIsometricScene`, `layoutIsometricLabels` ve
`buildIsometricSvg` açı DEĞİL izdüşüm alır; ekran `getCameraProjection(angles)`,
kâğıt `getObliqueProjection()` verir.

⚠️ **`project(offsetToWorld(o)) === o` sözleşmesi zorunlu** ve teste bağlı —
elle ayrılmış binmeler (`isometricOffsetCm`) 2B saklanıp 3B uygulanıyor, eşitlik
bozulursa yerlerinden oynarlar.

⚠️ Eğik eksenin yönü (sol-aşağı) okunabilirlik için: sağ-yukarı alınsa plan x
ile yalnız 30° ayrılır ve dikdörtgen kat ince bir dilime çöker. Aynı eksenin
öteki işareti, tek değişiklikle çevrilir.

⚠️ PDF sayfası SCREENSHOT DEĞİL ve hiç olmadı: 3B koordinat → izdüşüm → SVG →
bbox+autofit → `svg2pdf`. "PDF'teki canvas görüntüsünü kaldır" isteği geldiğinde
kaldırılacak bir şey bulunamadı — kusur açı kaynağında ve izdüşüm ailesindeydi.

Yönler `isometricPaperAxes.test.ts`'te kilitli (12 yön vakası, oran korunumu,
yatay eksenin KISALMAMASI, kaydırma gidiş-dönüşü).


## Kâğıtta etiket: künyesizler susar, halka yok (K156)

⚠️ Kâğıt ile ekran etiket konusunda da AYRIŞTI ve bu bilinçli.

**Kim etiketlenir:** kâğıtta yalnız `hasIsometricElementLabel` geçenler — sayaç
ve yakıcı cihazlar. Kalan sekiz tür (vana, solenoid vana, filtre, manometre,
regülatör, süzme sayaç, servis kutusu, izolasyon) etiket olarak yalnız kendi
ADINI yazıyordu; sembolün zaten söylediği şey, referans paftada hiçbiri yok.
Ekran hepsini yazmaya devam ediyor (orada etiket seçilebilir/sürüklenebilir).

⚠️ Künyesi olmayan yakıcı cihaz yine etiketlenir, türünün adıyla ("Ocak"):
hangi cihaz olduğu paftanın KONUSU.

**Nereye konur:** kâğıt `layoutLabelsBesideAnchors` (core/pdf) kullanır —
etiket kendi nesnesinin YANINDA, çakışanlar itilerek ayrılır, kılavuz çizgisi
İSTİSNA. Ekran `layoutIsometricLabels` (halka) ile kalıyor: yazı ekran-sabit
boyutta, etiket sürüklenebilir ve çizimden uzak durması gezinmeyi
kolaylaştırıyor. İki yerleşim YAN YANA durur, biri ötekinin yerine geçmedi.

⚠️ Yeni yerleşimde kayma sahne BOYUTUNDAN bağımsız (etiketin kendi boyu kadar).
Halka sahne boyutuyla ölçekleniyordu ve `PAPER_RING_TIGHTNESS` /
`PAPER_LABEL_PULL` bunu kâğıt için sürekli geri kısmaya çalışıyordu; ikisi de
`LABEL_SEPARATION_FACTOR` ve `distanceFactor` ile birlikte SİLİNDİ.

⚠️ Çakışma çözümünde geri çekme AYIRMADAN ÖNCE yapılır: tersi denendi, turun son
işlemi çekme olunca sıkışık öbekte ayrılan kutular geri biniyordu. Ayırma yönü
eşitlikte ANAHTARA bağlı — yoksa aynı proje her basımda farklı çıkar.

Ölçüm (iki katlı tesisat, 6 armatür + 2 sayaç + 2 kombi): 23 → 16 yazı satırı,
10 → 0 kılavuz çizgisi.

### Sonra eklenenler (K157)

**Servis kutusu** K156da susturulmuştu, geri açıldı: gazın binaya girdiği tek
nokta, armatürlerle aynı kefeye konamaz. ⚠️ Etiketi TEK SATIR kalıyor —
referanstaki "S200 / 21 mbar / Yandan Çıkış" satırlarının modelde karşılığı YOK
(servis kutusunun hiç özellik alanı yok), uydurulmadı.

**Sembol boyu** kâğıtta `PAPER_SYMBOL_SCALE = 0.55`. Ekran boyutuyla basılınca
semboller şemayı kaplıyor, boruların arasında yazıya yer bırakmıyordu; ekranda
o boyut doğru (tıklanabilir hedef, zoomla büyüyor), kâğıtta yalnız okunuyor.
Ayrı bir incelme ayarı gerekmedi: ölçek `stroke-width`e de uygulanıyor.

⚠️ **Çarpan ÇAPA KAYDIRMASINA da uygulanmak zorunda.** Kaydırma zaten
`element.scale` ile çarpılmış geliyor; yalnız ölçek küçültülseydi sembol
borudan KOPARDI. Teste bağlı: ölçek 1 → 2 → 3 giderken öteleme eşit
aralıklarla kaymalı.

### Denenip GERİ ALINAN: segment boyları (K157)

Referans paftadaki `L: 1 m` / `h: 0,3 m` etiketleri istendiği için her
segmentin kendi uzunluğu kendi yanına basıldı. Gerçek çıktıda kullanıcı geri
aldırdı: "inanılmaz kalabalık göstermiş".

⚠️ Sebep ÖLÇEK: referansta bir avuç segment var, gerçek bir binada gövde borusu
onlarca parçaya bölünüyor ve her parçaya bir yazı düşünce K156nın seyreltmesi
boşa gidiyor — `isConsumptionLine`i doğuran kararla aynı gerekçe.

⚠️ `getIsometricSegmentLengthLabel`, `VERTICAL_SEGMENT_TOLERANCE_CM`,
`MIN_LABELLED_SEGMENT_CM` ve `LabelBox.direction` SİLİNDİ — bu adlarla yeni kod
yazma. Yeniden istenirse eşik/seyreltme kuralıyla tasarlanmalı, koşulsuz
basılmamalı. Boru uzunluğu paftada yine var: tüketim künyesi hattın TOPLAM
boyunu veriyor.
**Üç eksi tesadüf değil.** WebCAD'in tuval çerçevesi SOL ELLİ: x doğuya, y
AŞAĞI (hem kotta hem plan y'sinde, EaselJS düzeni), z güneye. Bizim three
uzayımız sağ elli. Satırlar olduğu gibi alınırsa kamera yerin ALTINDA kalır:
kot ekranda yukarı gider ama derinlik ters döner ve **alt kat üst katı örter**.

⚠️ "Sadeleştirme" niyetiyle eksileri atma. İki aday sayısal olarak
karşılaştırılıp seçildi; testi var (`kamera her zaman YUKARIDA durur`,
`yüksek kot kameraya daha YAKIN olur`).

**Bedava gelen özellik:** `Rx(α)·Ry(β)`'nın 1. satırı yapı gereği
`(cosβ, 0, −sinβ)` — y bileşeni her zaman sıfır. Kot ekseni HER açıda ekranda
tam dikey kalır.

İzdüşüm ayrıca hesaplanmaz, KAMERA o yöne çevrilir: ortografik kamerada ikisi
aynı görüntüyü verir ve kamera yolunda sahne gerçek derinlik testiyle çizilir.

## Kot zinciri

```
mutlakKot = getFloorElevationsCm(floors)[katIndex]      // core/floorElevation.ts
          + getIsometricLineElevationsCm(...)[i]        // isometric/core
```

Kot alanı tür başına ayrı yerde duruyor (`pipe`/`chimney` iki uçlu, `branch`
tek değer). `isometricElevation.ts` bu ayrımı TEK yerde topluyor — hem sahne
geometrisi hem etiket boyu oradan okuyor, iki kopya olsaydı çizilen gövde ile
yazan boy ayrışırdı.

## Elle yerleştirmeler (izometriğe özel, plan çizimini BOZMAZ)

| Alan | Nerede | Ne |
|---|---|---|
| `isometricOffsetCm` | `InstallationLinePoint` | sürüklenen noktanın kendi kayması |
| `inheritedIsometricOffsetCm` | `InstallationLinePoint` | önceki noktadan miras — dal bütün kayar |
| `isometricLabelOffsetCm` | `InstallationElement`, `InstallationLine` | etiketin izometrikteki yeri |

Sürüklenen nokta kendi kaymasını, birlikte gelenler MİRASI alır. İki alan neden
ayrı: dal kaydırıldıktan sonra içindeki tek bir nokta ayrıca oynatılabilsin.
Uygulama `isometricOffset.ts` → `applyIsometricOffsets`; KİMİN kayacağına o
karar VERMEZ, ağ çözümü verir (aşağıdaki bölüm).

⚠️ Hepsi OPSİYONEL ve sıfıra dönen alan SİLİNİR — `docs/sample-project.json`
bit-bit round-trip testi "yoktan var edilmiş alan"ı yakalar. zod `.default()`
VERMEZ.

## Sürükleme: eksen kilidi + ağ yayılımı (K169)

- Tutamaç SERBEST değil: komşu parçalardan çekme yönüne EN YAKIN olanın
  ekseninde gider, dike düşen bileşen atılır
  (`isometric/core/isometricDragAxis.ts`). Yön 3B'den değil İZDÜŞÜMDEN okunur —
  sürükleme ekranda oluyor, kayma da izdüşüm düzleminde saklanıyor.
- Seçilen eksen aynı zamanda **hangi ucun SABİT kalacağını** söyler
  (`neighborIndex` → `anchorPointId`). İkisi ayrılamaz: çekilen parça uzarken
  karşı taraf durmazsa ya hiçbir şey ayrılmaz ya da komşu parça eğrilir.
- Yayılım TÜM AĞDA (`isometricNetworkDrag.ts` →
  `resolveIsometricDragTargets`): hattın ardışık noktaları + hat-hat bağlantısı
  (iki yönlü) + elemanın portuna oturan uçlar (eleman üzerinden) + düğüme
  oturan armatür. `anchorPointId`de DURUR.
- Bağlı dal RİJİT gelir, aradaki borular ESNEMEZ — esneselerdi eksen kilidi
  anlamını yitirirdi.
- ⚠️ Eski kural TEK hattın içinde kalıyordu; her sol tık kendi borusunu yazdığı
  için (K-W) pratikte iki noktaydı ve sürükleme neredeyse hiçbir şeyi
  ayırmıyordu. `applyIsometricDrag` SİLİNDİ, bu adla yeni kod yazma.
- ⚠️ `moveTargets.ts`/`resizeTargets.ts` yeniden kullanılmadı: onlar PLAN
  geometrisini değiştiriyor ve orada duraklar var (port çapası, `FloorPipeLink`
  konumu). İzometrik kayma plan konumuna dokunmadığı için o duraklar geçersiz.
- ⚠️ `applyIsometricLineDrag(pointId, anchorPointId, deltaCm)` — `lineId`
  kalktı (nokta kimliği zaten benzersiz).
- Eleman sembolü kaymayı tutunduğu boru UCUNDAN devralır
  (`IsometricElementAnchor.isometricOffsetCm`); kendi kayma alanı YOK.

## Kamera ve girdi

- İzometrikte plan kamerası, `ViewportControls` ve `Grid` **hiç mount edilmez**:
  iki kamera da `makeDefault` yazıyor, birlikte olsalar kazanan mount sırasına
  kalırdı.
- `CAMERA_HEIGHT_CM` **kullanılmaz** — o sabit drei `<Line worldUnits>`
  shader'ına bağlı ve yalnız plan kamerasının sözleşmesi (capsule-walls.md).
- `cameraViewport.ts` ve `useViewportControls.ts` KULLANILAMAZ: ikisi de
  kamerayı tepeden bakan plan kamerası varsayıp konumu
  `planToThree(..., CAMERA_HEIGHT_CM)` ile yazıyor — izometrik kamerada bu,
  kamerayı bir anda plan konumuna atardı. Kilitli kipin zoom/kaydırması
  `useIsometricCameraControls.ts`'te, kameranın KENDİ bazıyla (right/up).
- **Yönelim ve çerçeveleme AYRI effect'lerde.** Yönelim α/β değişince yeniden
  kurulur; zoom orada YAZILMAZ, yoksa kullanıcı açı kaydırıcısını her
  oynattığında yakınlaştırması sıfırlanırdı. Çerçeveleme ölçüsü açıdan BAĞIMSIZ
  köşegen (`getIsometricBoundsDiagonalCm`) + etiket payı — izdüşüm genişliği
  kullanılsaydı her açı değişiminde yeniden çerçevelenirdi. Etiket payı şart:
  gövdeye göre sığdırılsaydı etiketler kadraj dışında kalırdı.
- `useCameraZoomTracker` HER görünümde mount edilir (SceneRoot'ta dalın
  dışında): ekran-sabit boy `px / zoom` ile hesaplanıyor, izometrik etiketler de
  onu okuyor.
- Kilitli kip = teknik çizim (sabit α/β, sürükleme dal ayırır / etiket taşır).
  Kilit açık = drei `<OrbitControls>` kamerayı DEVRALIR; buradan kameraya hiç
  dokunulmaz, iki taraf aynı kareyi yazsaydı kamera titrerdi. Sürükleyerek
  düzenleme serbest kipte KAPALI — aynı jest kamerayı döndürüyor.

## `layers.ts` bu görünümde GEÇERSİZ

`RENDER_ORDER` + mikro-elevation (`WALL_ELEVATION_CM` 0, `HANDLE_ELEVATION_CM`
0.3) tepeden bakan kameranın z-fighting çözümü. İzometrikte o mikro farklar
GÖRÜNÜR hâle gelir. Derinlik gerçek geometriyle çözülür: segment başına
silindir + dirseklerde küre (`IsometricTube`). drei `<Line>` gövde için
kullanılmaz (aynı `worldUnits` gerekçesi + düz çizgi örtüşme vermez).

**Baca ve havalandırma KARE kesitli ve yarı saydam** çizilir: sahada da kanal
kesitleri dikdörtgen, üstelik ikisi en kalın gaz borusundan (DN100, 11 cm)
iki-üç kat kalın olduğu için opak çizilince arkalarındaki tesisatı tamamen
örtüyorlardı. Renk tek başına ayırt etmeye yetmiyordu.

## Etiketler

- **KALICI künye yalnız tüketim noktasına varan hatlarda** (`isConsumptionLine`):
  yakıcı cihaza (ocak/kombi/soba/şofben/kazan/diğer) bağlanan hat. Ara gövde
  parçaları etiketlenmez — bir binada gövde onlarca parçaya bölünüyor ve
  hepsine boy/çap yazılınca çizim rakam bulutuna dönüyordu. Sıra numarası
  SÜZÜLMÜŞ liste üzerinden verilir, yoksa "1, 4, 9" gibi atlamalı çıkardı.
  EKRANDA vurgulanan hat bu süzgecin dışında (K168): tıklanan her boru
  künyesini açar, NUMARASIZ.
- Metin `core/isometricLabels.ts`'te (testli), yerleşim
  `core/isometricLabelPlacement.ts`'te, bağlama `scene/`de. Etiket listesini
  kuran hook: `scene/useIsometricLabelEntries.ts`.
- EKRANDA künyeler HALKAYA dizilir (K170, `isometricLabelLayout.ts`), KÂĞITTA
  nesnenin yanında + itme (K156, `isometricLabelPlacement.ts`). Aşağıdaki iki
  bölüm.
- Künyesiz armatürler (vana, solenoid vana, filtre, manometre, regülatör, süzme
  sayaç, izolasyon) İKİ TARAFTA DA susar — `hasIsometricElementLabel` (K170).
- Ayırma payı EKRAN boyundan gelir (`px / zoom`): yazı ekran-sabit çizildiği
  için çakışmama mesafesi de piksel cinsinden.
- drei `<Text>` troika'nın font indirmesiyle ASKIYA ALINIR → etiketler KENDİ
  `<Suspense>`'inde. Sarılmasaydı askıya alma izometrik kamerayı da söker,
  `makeDefault` geri alınır ve çerçeveleme sıfırlanırdı.
- Font repodan (`/fonts/roboto-regular.woff`): verilmezse troika Google Fonts'a
  gider ve istek düşünce hata vermeden 0 piksel çizer.
- Sürükleme hedefi yazının arkasında GÖRÜNMEZ bir dikdörtgen — troika'nın kendi
  ışın testi yalnız glyph'lere değiyor, harf aralarında sürükleme kopuyordu.
- Sürükleme PENCEREYİ dinler, mesh'i değil: imleç dışarı çıkınca R3F olayları
  kesilir ve etiket parmağın altında kalırdı. Ekran pikseli → cm doğrudan
  zoom'la (zoom = piksel/cm); ekranın y'si aşağı büyüdüğü için işaret ters.

## Semboller

Mevcut SVG sembolleri BILLBOARD olarak çizilir (kameraya dönük), izdüşüme
girmez — referans çıktıda da semboller dik ve okunur. Plandaki `angleDeg`
dönüşü BİLEREK uygulanmaz: billboard zaten kameraya çeviriyor, üstüne plan
açısı eklenirse sembol ekranda eğilip okunmaz olur.

## Geri al/yinele

İzometrik TESİSAT aynasına yazar (`plumbingHistory`), tesisat görünümüyle aynı
dalda — `activeViewHistory.ts`. Her izometrik düzenleme `installationLines`/
`Elements` üstünde çalışıyor; proje geçmişine bağlansaydı Ctrl+Z en son çizilen
DUVARI geri alırdı.

## Cam paneller (HUD)

"Varsayılana döndür" düğmesi TEK tıkla her şeyi başlangıca çeker: elle
yerleştirmeler (dal ayırma + etiket konumları), bakış açısı ve kamera kilidi.
Katları düşey ayırma (exploded) özelliği kullanıcı isteğiyle TAMAMEN kaldırıldı. Yalnız konumları temizleyip açıyı bırakmak yarım bir sıfırlama
olurdu.

`--color-glass*` token'ları `.dark`'ta EZİLMEZ — `canvas-overlay` ile aynı
gerekçe: izometrik tuval iki temada da açık nötr gri. Saydamlık token
DEĞERİNİN içinde; `bg-glass/70` gibi bir değiştirici saydamlığı ikinci kez
çarpar ve paneli yok eder. `backdrop-blur` şart: yarı saydamlık tek başına,
arkasından boru geçince yazıyı okunmaz yapıyor.

Çap renk örneği SVG `fill` ÖZNİTELİĞİ ile veriliyor: renkler çalışma zamanında
geliyor, Tailwind sınıfı üretilemez ve `style={{...}}` yasak. `fill` bir sunum
özniteliği, satır içi CSS değil.

## Boru bilgisi ve açıklaması (K166)

Hat künyesi DÖRT satır: `(3)` / `4,74 m` / `DN25` / `Ø33,7 mm`. Son satır
K166'da eklendi — "DN25" bir ANMA çapı, borunun gerçek dış çapı 33,7 mm.
Biçimlendirmenin TEK yeri `plumbing/core/pipeTypes.ts` →
`formatPipeOuterDiameter`.

⚠️ Künye metni ekran ile KÂĞIDIN ortak kaynağı (`getIsometricLineLabelLines`):
satır eklemek PDF'i de değiştirir, bilerek yapıldı. K157'de geri alınan şey her
SEGMENTE boy yazmaktı; künye zaten yalnız tüketim hatlarında.

Sol alttaki açıklama yalnız KİMLİK verir: renk örneği + hat adı
(`getIsometricLegendRows` → `{ rowId, label }`). Dış çap ve toplam boy bir tur
denendi ve kullanıcı isteğiyle KALDIRILDI — açıklamanın tek işi "bu renk ne
demek", ölçü bilgisi çizim ekranlarında borunun kendi etiketinde (K166/1).

- Deşarj hatları (baca, havalandırma) açıklamada VAR, gaz çaplarından sonra.
  Eski açıklamada hiç yoktular; izometrikte çizildikleri hâlde renkleri
  açıklanmıyordu.
- Renk `core/`de DEĞİL: satır yalnız `rowId` taşır. Gaz rengi `PIPE_TYPES`ten,
  deşarj rengi `ISOMETRIC_COLORS`ten — `core/` sahneyi import edemez, çizen
  taraf çözer (`getIsometricLineColor` ile aynı iki kaynak).

## Etiket yerleşimi ve vurgu (K167)

Etiket kendi nesnesinin YANINDA durur, çakışanlar itilerek ayrılır —
`isometric/core/isometricLabelPlacement.ts` → `layoutLabelsBesideAnchors`,
EKRAN ve KÂĞIT ortak. Halka yerleşimi (`layoutIsometricLabels`) SİLİNDİ; K156
onu ekranda bırakmıştı, kullanıcı orada da kaldırttı ("daha toplu dursun, üst
üste gelmesin").

- Kutu ölçüsü ZOOM'a bağlı: yazı ekran-sabit boyda, dünya boyu px/zoom. Sabit
  cm alınsaydı yakınlaşınca etiketler gereksiz yere ayrılırdı.
- Karakter genişliği / satır yüksekliği oranları ekran (0.62 / 1.35) ile kâğıtta
  (0.55 / 1.25) farklı — kutuyu ÇAĞIRAN hesaplar, yerleşim yalnız ayırır.
- Kılavuz çizgisi İSTİSNA (kâğıtla aynı fikir): etiket nesnesinin dibindeyken
  kısa kılavuz yazının ortasına girip okunurluğu bozuyordu.
- Kamera çerçeveleme payı halka yarıçapına bağlıydı, oran oldu
  (`LABEL_MARGIN_RATIO`).
- ⚠️ Dağılma kısıtı (`MAX_PUSH_RATIO`) geri çekmeyle AYNI yerde, yani ayırmadan
  ÖNCE ve yalnız turların İLK YARISINDA (`CLAMP_PASSES`). K168'de turun SONUNA
  konmuştu ve ayrılan kutuları geri bindiriyordu — "ayırma hiç çalışmıyor"
  şikâyetinin sebebi buydu (K169).

Vurgu ETİKETLERİ de kapsar: eleman künyesi, vurgulanan hatta bağlı değilse
solar. Önce yalnız hat etiketleri soluyordu ve cihaz sembolü solmuşken künyesi
tam opak kalıyordu. Kuralın tek yeri
`isometric/core/isometricHighlight.ts` → `getConnectedElementIds`; sembol de
etiket de oradan okur.

⚠️ Tıklanabilir olan hâlâ yalnız HAT (`highlightedLineId`). Elemana tıklayınca
vurgu açılmaz — vurgu modeli tek kimlik taşıyor.

## Ekrandaki halka (K170)

Künyeler çizimin çevresinde İKİ halkaya oturur: hat etiketleri içte
(`LINE_LABEL_DISTANCE_FACTOR = 1`), eleman künyeleri dışta (`1.7`). Aynı
halkada olsalardı bir cihaz ile ona giden kısa kolun künyesi aynı açıyı
paylaşıp birbirini iterdi. Açılar en az bir etiket boyu ayrılır, sığmazsa eşit
dağıtıma düşülür.

- ⚠️ K167 kısmen GERİ ALINDI. Halkanın kusuru düzeninde değil YARIÇAPINDAYDI:
  eski oran 0,50 (+ eleman çarpanı 2) halkayı çizim boyunun yarısı kadar dışarı
  itiyor, kadraja sığmak için çizim ortada küçülüyordu. Yeni: oran **0,12**,
  alt sınır **120 cm**, çarpanlar 1 / 1,7.
- ⚠️ KÂĞIT bunu kullanmaz (K156, ölçülmüş): pafta hâlâ
  `layoutLabelsBesideAnchors`. Ekranda etiket sürüklenebiliyor ve gezinmeye
  yarıyor, kâğıtta yalnız okunuyor.
- ⚠️ Yükseklik etiketleri halkaya GİRMEZ (`distanceFactor === null`): künye
  değil ÖLÇÜ, ölçtükleri parçanın yanında kalırlar. Kendi aralarında itmeli
  yerleşimden geçerler.
- Kullanıcının elle taşıdığı etiket (`isometricLabelOffsetCm`) her iki
  yerleşimin de ÖNÜNDE gelir.

## Yükseklik etiketi, tıklama ve renk (K168)

- **`h=2,75 m`** — kot DEĞİŞTİREN hatta yükseklik yazılır
  (`getIsometricRiseLabel`). Çapası hat künyesiyle aynı: düşey hattın iki
  ucunun ortası. Ekran ve kâğıt ortak.
- Koşul plan görünümüyle AYNI (K129): ilk kot ≠ son kot. Segment segment
  YAZILMAZ — kot plan uzunluğuna göre dağıtıldığı için (`getLinePointElevationsCm`)
  eğimli hattın her parçası farkın bir kesrini taşır.
- İşaret YOK: h bir mesafe. Yön izometrik çizimin kendisinden okunuyor; planda
  okunmadığı için orada ▲/▼ var (K133).
- Tüketim süzgecinin DIŞINDA: kolon gövde borusunun parçası, süzgeç onu eler.
- `FloorPipeLink` etiketlenmez (döşeme geçişi, kullanıcının verdiği bir
  yükseklik değil). < 0,5 cm fark etiket üretmez ("0,00 m" olurdu).
- Yükseklik etiketi TAŞINAMAZ — hattın tek `isometricLabelOffsetCm` alanı
  künyeye ait. `IsometricLabel.onCommitOffsetCm` bu yüzden opsiyonel.
- **Dağılma sınırlı** (`MAX_PUSH_RATIO = 4`): etiket kendi payından en çok
  birkaç satır boyu uzağa itilir. Sınırsız itmede yoğun öbekler çizimden
  kopuyordu. Kısıt ayırmadan SONRA uygulanır.
- ⚠️ Etiketler EKRAN kamerasını etkilemez ve hiç etkilemedi: `IsometricCamera`
  `scene.bounds`a bakar, o da yalnız boru + elemandan hesaplanır. Etiketin
  sınırı büyüttüğü tek yer KÂĞIT.
- **Renk borudan** (K27'nin devamı): hat künyesi ve yükseklik etiketi
  `getIsometricLineColor(geometry)`. Eleman künyesi NÖTR kalır — sembolün kendi
  çizimi var. Tesisat görünümünde boru AÇIKLAMASI da hattın renginde
  (`LineDescriptionLabels`), ölçü etiketleri nötr (mimariyle ortak katman).

## Bilinen boşluklar

- **DN çap tablosu uyuşmazlığı**: WebCAD `DN25.radius = 2.69`, bizde
  `DN25.outerDiameterCm = 3.37` (2.69 bizde DN20). BİZİM tablomuz kullanılıyor.
- **`efficiency` (verim) alanı yok** — referans çıktıdaki "Verim: %90" satırı
  yazılamıyor, etiket o satırı atlıyor.
- **Hidrolik yok**: m³/h kapasite, basınç kaybı, kritik hat modelde hiç yok;
  hat etiketi kapasitesiz.
- **Elemanın kendi izo kaydırması** (`isometricPosition`) modele girmedi.
- **`hiddenInIsometry`** (izometride gizleme) modele girmedi.
- **PDF/izometrik çıktı** hiç açılmadı.
- 3B (katı) görünüm KAPSAM DIŞI; `src/threeD/` açılmadı.
