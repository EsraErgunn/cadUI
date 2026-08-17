# decision + gotcha: Hat çizimi (boru / branşman)

## Her sol tık KENDİ borusunu yazar (2026-08, ürün isteği)

Bir çizim jesti artık tek bir çok noktalı hat üretmiyor: **iki tık arası bir adım
= bir `InstallationLine`**. Ardışık adımlar ortak köşede buluşur ve ikincinin başı
birincinin ucuna `line` bağlantısıyla tutunur — köşe sürüklenince ikisi birden
gelir (`core/lineCornerLink.ts`). Böylece her boru tek başına seçilebiliyor,
silinebiliyor ve kendi çapını alabiliyor; her adım kendi Ctrl+Z adımı.

> Eskiden burada "taslak kalıcı state'e girmez, tek addLine = tek Ctrl+Z"
> yazıyordu. O kural **adım başına** geçerli: bir adımın hattı + noktaları +
> segmentleri + bağlantıları hâlâ TEK `set()` içinde üretilir. Değişen, jestin
> tamamının değil adımın atomik olması.

`plumbingUiStore.draftLine` artık yarım bir hat değil, zincirin **nerede kaldığı**:
`anchor` (lastik bandın kökü) + `startTarget` + yazılmış `steps`. Zincir
aritmetiği saf: `core/lineChain.ts` → `startChain`/`advanceChain`/`rewindChain`.

`addLine` 2 noktadan azını **reddeder** (`null` döner); yazılan borunun
`{ lineId, startPointId, endPointId }` kimliği döner — zincirleme buna dayanır.

**Tuzak:** zincirin ucunun oturduğu boru snap adayı DEĞİLDİR (`useLineTool`
→ `resolveSnap`). Aday bırakılsaydı yakalama yarıçapından kısa bir adım, az önce
yazdığı boruyu AYIRARAK zinciri kapatırdı.

## Jestler (şartname)

| Jest | Sonuç | Araç sonrası |
|---|---|---|
| Sol tık | Adımı YAZAR ve köşe bırakır (port snap > mevcut boru > duvar ekseni > ızgara) | aktif kalır |
| Sol tık **boş bir porta / mevcut boruya** | Adımı yazar, oraya bağlar, zinciri BİTİRİR | **aktif kalır** |
| Sağ tık (zincir sürerken, taslak DOLU) | Taslağı orada DURDURUR — yazılmış adımlar KALIR, geri ALINMAZ | **aktif kalır** — başka bir yerden hemen yeni zincire başlanır |
| Sağ tık (taslak BOŞ) | Araçtan çıkar | Seçim aracına döner |
| Esc | Zinciri BIRAKIR — yazılmış adımlar kalır, silinmez | aktif kalır |

Esc'in artık geri aldığı bir şey yok: her adım kullanıcının görerek koyduğu
kalıcı bir borudur (başlangıç elemanıyla aynı gerekçe). Yanlış adımı silmek için
elemanı seçip Delete/Ctrl+Z kullanılır — sağ tık artık "geri alma" değil "durdurma".

Sağ tık artık İKİ ADIMLI ama tek/çift TIK AYRIMI **yok** (duvar aracıyla aynı
desen, K84): karar tek bir sağ tıkla, taslağın dolu/boş oluşuna bakarak anında
verilir (`useLineTool.ts` → `applyRightClick`). Eskiden burada `core/
pointerGestures.ts` → `resolveRightClick` ile tek/çift sağ tık ayrımı vardı
(`DOUBLE_CLICK_WINDOW_MS` = 300 ms bekleyip "tek → geri al, çift → bitir"
kararı veriyordu) — kullanıcı bunu "tek sağ tık son noktayı geri almasın, orayı
durdursun" diye AÇIKÇA reddetti (2026-08). `pointerGestures.ts` hâlâ duruyor
çünkü `useDischargeTool.ts` (tahliye borusu) onu kullanmaya devam ediyor — o
akış TEK bir çok noktalı hat biriktirip bitişte yazıyor (`useLineTool`'daki
"her adım kendi borusu" modeliyle aynı değil), oradaki geri-al/bitir ayrımı
hâlâ geçerli bir tasarım. `useLineTool` için yeniden kullanma.

`contextmenu`'yü `DrawSurface` yakalayıp `preventDefault` ediyor — araç hook'unda
ikinci kez yakalanmaz.

`useEscapeToSelectionTool` polyline araçlarını **atlar**: hat aracında Esc taslağı
siler ama araçtan çıkmaz. Yerleştirme araçlarında davranış eskisi gibi.

**Tuzak — `useRightClickReturnsToSelection`:** mimari ve tesisat araçları AYNI
`useUiStore.activeToolId`'i paylaşıyor, bu hook `ArchitectureLayer`'da mount
edilip HER sağ tıkta çalışıyor ve KARA LİSTE'deki (`SELECTION_TOOL_ID`,
`WALL_TOOL_ID`) dışındaki her aracı Seçim aracına düşürüyor. Boru aracı bu
listede yoksa kendi iki adımlı sağ tık jesti hiç çalışmadan araç kapanır — çift
katmanlı "kim önce davranıyor" hatası. `INSTALLATION_PIPE_TOOL_ID` bu listeye
eklendi; yeni bir tesisat aracı kendi sağ tık jestini yazarsa aynı listeye
eklenmesi gerekir.

> 2026-08'de kısa süre "tek sağ tık bitirir, Esc son noktada bitirir" denendi ve
> şartname metni gelince geri alındı; sonra "tek sağ tık son adımı siler, çift
> sağ tık bitirir" tasarımına geçildi. O da kullanıcı geri bildirimiyle
> yukarıdaki "durdur, silme" modeline döndü — değiştirmeden önce bu geçmişe bak.

## Çizgi kalınlığı ve rengi

Renk **çaptan** gelir (`core/pipeTypes.ts`, K-W2) — "tuvalde sarı = gaz hattı"
kuralı kalktı. Kalınlık gerçek dış çaptır: drei `<Line>` + `worldUnits` (duvar
kapsülüyle aynı shader yolu, bkz. capsule-walls.md).

**Tuzak:** `worldUnits` ile kalınlık cm'dir, yani uzaklaşınca DN15 (2.13 cm) piksel
altına düşüp kaybolur. Alt sınır (1.5 px) zoom'dan türetilir ve kapsayıcıda **bir
kez** hesaplanır — hat başına `useFrame` kurulsaydı her kare hat sayısı kadar geri
çağrım çalışırdı.

## Çap kataloğu tamam, seçim arayüzü İLERİDE

Dokuz çapın (DN15–DN100) **hepsinin rengi tanımlı**: dördü WebCAD'den birebir,
kalan beşini ekip belirledi (K-W1'deki boşluk kapandı). Renkler tekil ve tuvalde
ayrılmış renklerle çakışmıyor — marka sarısı, seçim mavisi, snap yeşili, duvar
grisi. Test bunu koruyor (`pipeTypes.test.ts`).

Çizim **her zaman varsayılan çapla** (DN25) yapılır: çap seçme arayüzü, hat
seçilince açılacak **sağdaki işlev paneline** saklandı. Sol palette denendi ve
kaldırıldı. Altyapı hazır ve testli, panele yalnız arayüz kalıyor:

- `plumbingUiStore.activePipeTypeName` — çizilecek hattın çapı (araç ayarı)
- `plumbingSlice.setLinesPipeType(lineIds, name)` — seçili hatların çapı

## Hat çiziminin ilk tıklaması eleman koyabilir

`core/lineSeed.ts` → `getLineSeedElementType`:

- **Branşman her zaman sayaçla gelir**: ilk tık sayacı koyar, hat sayacın ÇIKIŞ
  portundan başlar.
- **İlk boru servis kutusunu kendisi koyar** (projede hiç kutu yoksa). Kutu zaten
  varsa boru serbest başlar — servis kutusu proje başına TEKTİR.

Eleman kendi geçmiş adımında yazılır, hatla aynı adımda değil: Esc'lenen yarım
çizimde eleman da kaybolsaydı kullanıcının görerek koyduğu şey silinirdi.

## Önizleme yalnız LASTİK BANTTIR

`LineDraftPreview` artık YALNIZ zincirin ucundan imlece uzanan bandı çizer:
yazılmış adımlar gerçek borulardır, sahnede zaten duruyorlar. (Eskiden bant +
"yerleşmiş taslak parçası" birlikte çiziliyordu; her adım anında yazıldığı için
o kısım kalktı — kalsaydı aynı boru iki kez, üst üste çizilirdi.)

Renk ve kalınlık `scene/lineStyle.ts`'ten, ikisi de aynı fonksiyondan gelir.
Yerleşmiş hat da bant da **tek bileşenden** (`PipeLine`) geçer — ayrı ayrı
kurulsalardı bir prop birinde unutulur ve önizleme farklı (ör. daha ince)
görünürdü. Yeni bir prop eklerken `PipeLine`'a ekle, kullanan yerlere değil.

> **⚠️ Tuzak: drei `<Line>`'a `visible` PROPU VERİLMEZ.** drei bilmediği propları
> hem Line2 nesnesine hem de MATERIAL'e yayıyor; `material.visible = false` de o
> hattı kalıcı olarak görünmez yapıyor (`object.visible = true` yazmak kurtarmaz).
> Aynısı `transparent`, `opacity`, `userData` gibi propların ikisine birden
> gitmesi için de geçerli — görünürlük yalnız nesne üzerinden, useFrame'de ayarlanır.

**Lastik bant kare başına geometri üretmez:** iki köşesi her karede geometrinin
içine yazılır (`instanceStart`/`instanceEnd` — `LineGeometry` ikisini araya
dizilmiş TEK tamponda tutar, `needsUpdate` bir kez yeter). drei `<Line>`'ın
`points` propu her değiştiğinde yeni `BufferGeometry` ayırdığı için bant propla
sürülemez.

Denenip vazgeçilen iki yol:
- **Birim parçayı `scale.x` ile uzatmak.** Kalınlığı bozmuyor (`worldUnits`
  shader'ı `linewidth`'i `modelViewMatrix`'ten SONRA uyguluyor), ama önizlemeyi
  gerçek hattan farklı bir çizim yoluna sokuyordu.
- **Elle ayrılmış `BufferAttribute` + `lineBasicMaterial`.** `LineBasicMaterial`
  kalınlığı her platformda 1 px'te kaldığı için gerçek çap çizilemiyordu.

## ⚠️ Boru kalınlığı PİKSEL cinsinden verilir, `worldUnits` ile DEĞİL

Duvar `worldUnits` kullanıyor (kalınlık = cm), boru **kullanmıyor**. Sebep bir
shader varsayımı: `worldUnits` yolu göz ışınının bir NOKTADAN çıktığını kabul
ediyor (perspektif) — hem vertex shader'da `cross(start.xyz, worldDir)` hem de
fragment shader'da `normalize(worldPos.xyz) * 1e5`. Kameramız ortografik, ışınlar
paralel; üstelik kamera 100.000 cm yukarıda olduğu için bu hesap float32
hassasiyetini yiyor. Hata ekran MERKEZİNDEN uzaklaştıkça büyüyor:

> **Hat ekranın kenarlarına doğru inceliyordu.** 20 cm'lik duvarda görünmüyor,
> 3.37 cm'lik DN25 borusunda görünüyor. `CAMERA_HEIGHT_CM`'i düşürmek de çözüm
> değil — capsule-walls.md'deki ters yönlü uyarıya bakın, o değer duvar için
> yüksek tutulmak zorunda.

Piksel yolunda (`worldUnits` yok) shader ekran uzayında çalışıyor: küçük sayılar,
ışın varsayımı yok, yuvarlak uçlar korunuyor. Kalınlığı biz veriyoruz:

```
lineWidth(px) = max(dışÇap(cm) × zoom, MIN_LINE_WIDTH_PX)
```

Görünen boyut `worldUnits`'in amaçladığıyla aynı — plan fiziksel olarak doğru
okunur — ama kenarlarda incelme yok. Zoom değişince kalınlık yeniden hesaplanmalı,
bu yüzden `useCameraZoom` zoom'u state'te tutar (Grid.tsx deseni: değer değişmezse
render yok).

`MIN_LINE_WIDTH_PX = 3`: uzaklaşınca hat kıl gibi kalmasın. 1.5 px denendi, kat
geneli görünürken (zoom ~0.2) yetmiyordu. Sınır çapları birbirinden ayırt etmeyi
bozmaz — oran ancak bu sınırın altında kaybolur.

## Hat seçimi

Boruya tıklama `core/linePicking.ts` → `pickLineAt`: tutma bandı çizilen
kalınlığın YARISI + snap toleransı, yani ince boru da tıklanabilir kalır.
Sıra elemandan sonra gelir — eleman bulunamazsa hat aranır, o da yoksa çerçeve
başlar. Seçili hat mavi çizilir.

`selectedLineIds` ayrı listede: eleman ve hat aynı id evreninde ama iki farklı
nesne türü — tek listede tutulsaydı her okuyan tür ayrımını yeniden yapardı.

**Silme TEK adımdır:** `removeSelection(elementIds, lineIds)` ikisini de aynı
`set()` içinde siler. İki ayrı action çağrılsaydı bir silme jesti için iki kez
Ctrl+Z gerekirdi. Bağlantı temizliği de aynı yerde — eleman ve hat silme aynı
temizliği istiyor.

**Yapıştırma İMLECE düşer** (2026-08): panonun sınır kutusunun MERKEZİ imlecin
altına gelir (`getPasteDeltaCm`). Kayma ızgaraya yuvarlanır — yuvarlanan konum
değil KAYMA, yoksa merkezi yarım adım kaçık bir seçim tüm köşeleri ızgara dışına
taşırdı. İmleç tuvale hiç girmediyse (klavyeyle Ctrl+V) eski paylı yerleşime
düşülür, o yüzden `pasteStepCount` duruyor. Eleman sınırı SEMBOL kutusu değil
ORIGIN: metadata bu katmana girmiyor ve tek eleman yapıştırınca origin tam
imlecin altına düşüyor.

**Pano BAĞLARI da kopyalar** (2026-08): eskiden yalnız geometri kopyalanıyordu,
yapıştırılan boru ile sayaç bitişik GÖRÜNÜP bağlı olmuyor, ilk taşımada
ayrılıyorlardı. Artık üç bağ da kopyaya taşınır — port, hat-hat köşesi ve
boruya oturan armatür (`inlineElementId`).

- Bağ **dizinle** taşınır, id ile değil (kural 6): `ClipboardConnection`
  panodaki eleman/hat sırasına bakar, `pasteEntries` bunları yeni id'lere
  çevirir. Üç liste (eleman/hat/bağ) TEK fonksiyonda üretilir
  (`toClipboardPayload`) — ayrı ayrı süzülselerdi sıralar ayrışır ve bağ
  YANLIŞ nesneye bağlanırdı.
- Yalnız **iki ucu da seçimin içinde** kalan bağ kopyalanır. Yoksa yapıştırılan
  boru KAYNAĞIN sayacına bağlanır, bir portu iki hat paylaşırdı.
- Kısa süre denenip kaldırıldı: uçları çakışan hatları geometriden bağlamak
  (`getCoincidentEndConnections`). Gerçek bağlar kopyalanınca gereksizleşti ve
  zararlıydı — kaynakta yalnızca DEĞEN (bağlı olmayan) iki boru kopyada
  birbirine kaynardı.

## Hat GÖVDESİNDEN taşınamaz, yalnız köşelerinden — SEÇİLİ GRUP hariç

Tek bir boru gövdesine basıp sürüklemek onu taşımaz, yalnız SEÇER; boru
köşelerinden taşınır. **Ama zaten seçili bir GRUBUN parçasına basmak seçimin
tamamını taşır** (2026-08 ürün isteği: "hepsini seçtikten sonra hepsini
taşıyabilelim") — elemanlar + hatlar tek `moveElements` çağrısıyla, tek Ctrl+Z.

- Grup = seçimde birden çok nesne (`selectedElementIds.length +
  selectedLineIds.length > 1`). Tek boru seçiliyken köşe düzenleme çalışmaya
  devam eder; grup varsa seçili boruya basış köşe sürüklemesinin ÖNÜNE geçer —
  kullanıcı "hepsini taşıyorum" derken tek köşe çekmek istemez.
- Seçim DIŞINDA bir şeye basmak seçimi ona indirger (eski kural), dolayısıyla
  yanlışlıkla grup taşımak mümkün değil: önce seçmek gerekir.
- Dayanak (ızgara yakalaması) elemana basışta elemanın konumu, boruya basışta
  ızgaraya yakalanmış BASIŞ noktasıdır — ikisinde de kayma ızgara katı çıkar,
  seçim kendi içindeki göreli düzenini korur.
- Canlı önizleme: sürüklenen hatlara `InstallationLines` → `DragOffsetGroup`
  tek `group` ofseti uygular (nokta başına hesap yok). Bu sarmalayıcı YALNIZ
  sürüklenen hatlar için mount edilir — her hatta bir `useFrame` kurulsaydı
  kare başına hat sayısı kadar geri çağrım çalışırdı.
- Önizlemenin eleman kümesi commit'le AYNI fonksiyondan (`expandMoveSelection`)
  geçer: taşınan borunun üstündeki armatür ve ucundaki cihaz sürükleme boyunca
  geride kalıp pointerup'ta yerine ZIPLAMAZ.

## Taşımada KOPMA YOK — `core/moveTargets.ts`

**Seçim rijit taşınır, kaynak yerinden ayrılmaz.** Model üç bağı KAYNAK sayar:
hat ucu ↔ eleman portu, hat ucu ↔ başka bir hattın köşesi (zincirin adımları,
branşman, cihaz kolu), düğüm ↔ üstündeki armatür. Kayan bir köşeye kaynaklı her
uç da kayar (o hatlar esner); yayılım SABİT NOKTAYA kadar sürer, çünkü zincir
çok halkalı olabilir (adım → adım → cihaz kolu).

Yayılımı durduran tek şey **ÇAPA**: taşınmayan bir elemanın portuna oturan uç.
Konumunu porttan alıyor, yerinden oynayamaz — çapa olmasaydı ağın bir ucundan
çekmek bütün tesisatı sürüklerdi. Aynı çapa köşe sürüklemesini de bağlar:
köşede porta oturan bir uç varsa o köşe HİÇ oynamaz (kısmen oynatmak koparırdı),
`useSelectionTool` sürüklemeyi hiç başlatmaz.

> **Tuzak — bu iş neden saf ve TEK hesap:** önce arka arkaya geçişlerle
> yapılıyordu (önce elemanlar, sonra "pim", sonra takip) ve karar SIRASI sonucu
> değiştiriyordu: bir köşenin kayacağı, ona bakan pim kararından sonra belli
> oluyordu; aynı nokta iki geçişte iki kez kaydırılabiliyordu. İkisi de gerçek
> kopmalara yol açtı. Artık küme önce kapanıyor, kayma sonra BİR KEZ uygulanıyor.
> Yeni bir bağ türü eklerken kuralı `resolveMoveTargets`'a ekle, store'a değil.

Aynı hesabı sahne de kullanır (`useSelectionTool` → `startElementDrag`):
önizleme ile bırakınca oluşan sonuç ayrışmasın. Bütünüyle kayan hatlar tek group
ofsetiyle çizilir; yalnız bir UCU çekilen komşu hat önizlenmez, bırakınca yerine
oturur (bilinen ve kabul edilen fark).

Testler: `store/__tests__/moveInvariant.test.ts` 4 eleman + 4 hattın **255
seçim birleşiminin hepsinde** hiçbir bağın kopmadığını sınar — senaryo testleri
ara birleşimleri kaçırıyordu. Okunur senaryolar
`store/__tests__/plumbingMove.test.ts`'te, ortak sahne `plumbingMoveFixture.ts`.
- Köşe düzenleme `useSelectionTool.ts` → `tryStartCornerDrag`, `core/lineSnap.ts`
  → `findNearestPointOnLines` ile var olan bir köşeyi yakalar. Gövdeye basmak
  YENİ köşe AÇMAZ (her sol tık zaten çizerken kalıcı köşe bıraktığı için buna
  gerek kalmadı — eski `insertPoint`/`insertLineCorner` yolu kalktı). Store
  yazımı `plumbingSlice.moveLinePoint`.
- Köşeye basıp SÜRÜKLEMEDEN bırakmak boruyu SEÇER (Shift ile seçime ekler) —
  her adımın iki ucu köşe olduğundan (yukarıdaki karar) köşeye basış "seçemedim"
  hissi vermemeli. Yer değişmediyse store'a hiç yazılmaz.
- **Yalnız bir ELEMAN PORTUNA bağlı uç** köşe sürüklemesi BAŞLATMAZ: o uç yalnız
  bağlı elemanı taşıyarak hareket eder (`isLineEndOnPort`). Hat-hat bağı engel
  DEĞİLDİR — zincirin her ara köşesi böyle bir bağdır, `isLineEndConnected`'e
  bakılsaydı çizilen borunun hiçbir köşesi tutulamazdı.
- **Zincirin komşu adımı ve sonradan eklenen branşman/cihaz kolu KOPMASIN diye**:
  bir köşeye `line` bağlantısıyla tutunan tüm hat uçları (`getLinkedLinePoints`,
  `core/lineCornerLink.ts`) AYNI konuma taşınır — tek `set()`, tek Ctrl+Z.
  Kapanış GEÇİŞLİ (zincirin üçüncü halkası da gelir) ve İKİ YÖNLÜ: köşe hangi
  adımdan tutulursa tutulsun aynı küme çıkar. Tek yön taransaydı zincir
  yazılışının tersine çekilince kopardı. Köşede oturan bir armatür
  (`inlineElementId`) de birlikte gelir.
- Canlı önizleme store'a sürükleme boyunca YAZILMAZ: `InstallationLines`
  sürüklenen köşenin bağlı kümesini BİR kez hesaplar (`useDraggedCorners`) ve
  her hat kendi payına düşen geçici konumu prop olarak alır; hat TEK PARÇA,
  geçici köşesiyle çizilir.
- Uç işaretinin biçimi `getLineEndRole`'dan gelir: porta bağlı uç dolu daire,
  zincirin ortak köşesi küçük nokta, gerçekten serbest uç içi boş halka. Ortak
  köşeyi iki komşu adım da çizer, ikisi de nokta olduğu için üst üste tek nokta
  görünür.
- Bugün YOK: çerçeveyle köşe seçme, birden çok köşeyi birden sürükleme, köşe
  silme (yalnız borunun/elemanın kendisi silinebilir — bir adımı silmek zincirde
  boşluk bırakır, komşuları yerinde kalır).

## Açılmayan alanlar

- `InstallationLineSegment.isInsulated` **yok**: izolasyon segment boolean'ı değil
  kendi nesnesidir (K-W4, Aşama 8).
- Ortogonal (yatay/dikey) ZORUNLU kısıt bu aşamada **yok** — CLAUDE.md'deki
  "borular duvarlara paralel" kuralı hâlâ tam kodda değil. Yalnız YUMUŞAK bir
  yardımcı var: zincire devam ederken imleç bir duvara yakınsa yeni köşenin
  YÖNÜ o duvara paralele kelepçelenir (`core/wallSnap.ts` →
  `findNearestWallParallel`, `useLineTool.ts`'teki `resolveSnap` sırası port >
  mevcut boru > duvara paralel yön > ızgara — aşağıdaki bölüme bkz.). Bu bir
  BAĞLANTI kaydı üretmez — boru grafiği duvarı tanımaz (`core/model.ts`
  sözleşmesi), yalnız YÖNÜ çeker, konumu değil; paralellik ZORUNLU değildir.
- Porta yakalanma ve uç bağlantısı Aşama 6'da.

## Duvar yakalaması KONUM değil YÖN kelepçeler (2026-08, iki aşamalı düzeltme)

İlk denemede `findNearestWallPoint` imleci duvarın belirli bir NOKTASINA
(önce eksene, sonra yüzden paylı bir noktaya) yapıştırıyordu. İkisi de
kullanıcının asıl isteğini karşılamadı: eksene yapıştırma "duvar+boru üst üste
binmez" kuralını çiğniyordu, yüze paylı nokta ise duvarın YUVARLAK (kapsül,
`capsule-walls.md`) uçlarına yakınken "en yakın nokta" belirsizleşip
zıplıyordu — kapsülün render'daki yuvarlak görünüşü ile altındaki düz segment
geometrisi orada örtüşmüyor.

Son karar: `findNearestWallPoint` kalktı, yerine `findNearestWallParallel`
geldi. Konuma prensipte dokunmaz — yalnız zincirin devam eden bir ANCHOR'ı
varken (`draftLine` doluyken) yeni köşeyi, imlece en yakın duvarın AÇISINA
(`getSegmentAngleDeg`, sabit bir değer — kapsülün yuvarlak görünüşünden
etkilenmez) paralel bir doğruya projekte eder: `anchor + yönVektörü ×
((imleç−anchor)·yönVektörü)`. Sonucun duvara olan dik uzaklığı anchor'ın ZATEN
sahip olduğu uzaklıkla AYNI kalır (izdüşüm anchor'ı içeren paralel doğru
üzerinde) — ayrı bir "payı" hesaba katmaya gerek kalmadı, boru anchor nereden
başladıysa o mesafede duvara paralel gider.

**GÜVENCE — boru duvara hiçbir zaman değmez** (kullanıcı iki kez tekrarladı):
paralel-doğru sonucu anchor'ın dik ofsetini miras aldığı için normalde zaten
duvara değmez, ama anchor'ın KENDİSİ (ayrı bir jestle, ör. Ctrl'lu serbest
tıklamayla) duvara `wall.thickness/2 + WALL_CLEARANCE_CM` (5 cm payla)'dan
yakın konmuşsa, bu MİRAS da duvarın içine düşerdi. Bu yüzden sonuç ayrıca bu
asgari paya KELEPÇELENİR: dik uzaklık payın altındaysa nokta duvardan uzağa
DİK itilir (yön hâlâ paralel kalır). Ender bir köşe — anchor'ın kendisi zaten
neredeyse hep bu payın dışındadır — ama garanti KOŞULSUZ olmalı.

Zincirin İLK noktasında (henüz `draftLine` yokken) duvarın bu adımda HİÇ
etkisi yok: "paralele" iki noktalı bir segmentin özelliğidir, tek bir
başlangıç noktasının değil — ilk nokta düz ızgaraya düşer, `useLineTool.ts`
→ `resolveSnap` bunu `draftLine` doluluğuyla ayırt eder. Yakınlık hâlâ imlecin
duvarın EKSENİNE (segment, uçlarda kelepçeli) dik uzaklığıyla ölçülür — "hangi
duvarın açısı kullanılacak" sorusunun cevabı bu, sonucun konumuyla ilgisi yok.

## Duvar kilidi SIKI + kalıcı, duvar hattı BİTİNCE de bırakmaz (2026-08)

`core/wallParallelLock.ts` → `createWallParallelLock()`: bir duvara ayak
uydurulunca (`useLineTool.ts`'in kapanışında tek bir `wallLock` nesnesi,
adım başına değil ARAÇ ÖMRÜ boyunca yaşar) o duvarın açısı bu ADIMIN SONUNA
kadar YARIÇAPSIZ uygulanır — kullanıcı isteği: "boru bitse (duvarın kendi
uzunluğu tükense) bile aynı eksende düz çizmeye devam et, ben durdurana
kadar". Eskiden yarıçaplı arama HER karede tekrarlanıyordu: imleç duvarın
UCUNU geçince `projectOntoSegment`in kelepçelenmiş mesafesi büyüyüp kilidi
kırıyordu. Kilit yalnız İKİ yolla açılır: **anchor değişir** (yeni adım —
`findNearestWallParallel`/`getWallParallelPosition` ayrımı budur, ikincisi
yarıçapsız) ya da araç değişir (`wallLock` effect'in kapanışında yeniden
yaratılır). İlk histerezisli tasarım (`RELEASE_RADIUS_MULTIPLIER` ile geniş
bir "bırakma" yarıçapı) DENENİP KALDIRILDI — kullanıcı "her ne olursa olsun
durana kadar sürsün" dedi, mesafe tabanlı bir bırakma bunu hiç sağlamazdı.

## Duvar YOKKEN genel 45°'lik açı yardımı (2026-08)

`core/angleSnap.ts` → `snapToNearestAngle`: duvar kilidi devrede değilken
(uzakta ya da hiç duvar yokken) yön en yakın 45°'lik hedefe (0/45/90/135…)
YALNIZ yakınken (`ANGLE_SNAP_TOLERANCE_DEG`, 6°) yakalanır — kullanıcı isteği
"her zaman dümdüz ilerlemesin, 45/90 derece de yapsın, biraz oynasın". Duvar
kilidinin AKSİNE SIKI/toleranssız değil: hedefin dışındayken imleç serbest
kalır, her karede yeniden hesaplanır (stickiness YOK) — kilit "gerçek bir
duvara" bağlanıyor ve rijit olması doğru, bu ise duvar yokken genel bir
yardımcı, rijit olsaydı serbest çizim hissini bozardı. Mesafe imleçten aynen
gelir, ayrıca ızgaraya yuvarlanmaz. Öncelik: port > mevcut boru > duvara
paralel (SIKI) > 45° açı yardımı (TOLERANSLI) > ızgara.

## Görünüm ▸ Izgarayı Göster (2026-08, tesisat için)

Kullanıcı çizimin ızgara yüzünden zorlaştığını, kapatabilmek istediğini
söyledi. Bayrak `uiStore.isGridVisible` (D'nin dosyası, `isDimensionsVisible`
ile AYNI desen) — kapalıyken hem `scene/Grid.tsx` çizgileri kaybolur hem de
`plumbing/scene/placementSnap.ts` → `resolvePlacementPosition` tesisat
araçlarının ızgara yakalamasını (`getPlacementPosition`) devre dışı bırakır,
ham imleç noktası kullanılır. Kapsam BİLEREK yalnız tesisat: mimari tarafın
kendi araçları (`useWallTool.ts` vb.) hâlâ doğrudan `getPlacementPosition`
çağırıyor, bu bayrağı hiç okumuyor — kullanıcı isteği "tesisat için" diye
sınırlıydı, B'nin araçlarına dokunulmadı. Ctrl ile GEÇİCİ ızgara kapatmadan
(`event.ctrlKey ? ... : ...`) ayrı bir mekanizma: ikisi de aynı "ham nokta"
sonucuna varır ama biri anlık jest, öbürü Görünüm menüsünden kalıcı tercih.
Testler: `core/__tests__/wallSnap.test.ts`.

## Servis kutusu KONUNCA da boru çizimi kendiliğinden başlar (2026-08)

`usePlacementTool.ts` → `startPipeFrom` eskiden yalnız `lineEnd` modundaki
sayaç için çağrılıyordu. Artık `free` moddaki servis kutusu için de aynı
yardımcı çağrılır (elemanın `out` portundan taslak hat açılır, araç boruya
geçer) — "ilk boru servis kutusunu kendisi koyar" akışıyla simetrik: kullanıcı
kutuyu PALETTEN kendi koyduğunda da elle boru aracına geçmek zorunda kalmaz.
Baca/havalandırma kanalı (aynı `free` modun diğer türleri) bu davranışın
DIŞINDA bırakıldı — onlar cihazın deşarj portundan ayrı bir güzergah aracıyla
çizilir, bu akıştan hiç geçmez; `free` modda arka arkaya eleman eklenebilmesi
(araç aktif kalması) onlar için hâlâ geçerli.

## Boru duvardan uzakken TAMAMEN serbest, kilit YOK, duvarın üstü (köşe dahil) yasak (2026-08, üçüncü düzeltme — ÖNCEKİ İKİ KARARI SÜPÜRÜR)

Yukarıdaki **"Duvar kilidi SIKI + kalıcı"** ve **"Duvar YOKKEN genel 45°'lik açı
yardımı"** bölümleri BAYATLADI, `wallParallelLock.ts`/`angleSnap.ts` silindi.
Kullanıcı iki turda netleştirdi: "borular her zaman serbest hareket edebilsin",
"hiçbir zaman tek eksene yapışmasın", "duvara snap değilse serbest çizim" —
yani hem SIKI duvar kilidi hem TOLERANSLI 45° yardımı hem de (aradaki, bu
oturumda kısa süre denenip geri alınan) TOLERANSSIZ dünya-ekseni kelepçesi
YANLIŞ çıktı. Güncel model tek katmanlı ve **kilitsiz**:

- Bir duvar `radiusCm` (yakalama yarıçapı) içindeyse yön o duvarın AÇISINA
  paralel/dik iki eksenden imlece en yakın olana kelepçelenir
  (`core/wallSnap.ts` → `findNearestWallParallel`) — HER karede yeniden
  hesaplanır, önceki karar hiç hatırlanmaz (kilit YOK, "wall lock" nesnesi de
  YOK). İmleç iki eksene yakınken kare kare farklı eksen seçilebilir; bu artık
  KASITLI, hata değil.
- Duvar `radiusCm` içinde değilse boru **tamamen serbest**: imleç çapraz dahil
  aynen izlenir, hiçbir açı/eksen kelepçesi yok.
- `core/orthogonalAxis.ts` → `projectOntoClosestOrthogonalAxis` hâlâ duruyor
  ama artık YALNIZ duvara yakınken çağrılır (`getWallParallelPosition`
  içinden) — dünya ekseni (0°/90°) fikri koddan tamamen kalktı.
- CLAUDE.md'deki "borular duvarlara paralel (yatay/dikey)" cümlesi bu yeni
  kurala göre güncellendi: kısıt yalnız duvara YAKINKEN geçerli.

**Duvarın üstü — gövdesi VE köşeleri — YASAKLI ALAN** (yeni, 2026-08): boru
hiçbir zaman tam duvar ekseninde/köşesinde durmaz.
- Gövdeye yakınken pay artık sabit 5cm değil, EKRAN PİKSELİ
  (`scene/snapRadius.ts` → `WALL_EDGE_GAP_PX`/`getWallEdgeGapCm`, `≈2px`) —
  her zoom'da "neredeyse bitişik ama asla üstüne binmiyor" hissi sabit kalır.
  Uygulayan fonksiyon `core/wallSnap.ts` → `applyWallEdgeClearance`
  (`WALL_CLEARANCE_CM` sabiti kalktı, artık çağıranın verdiği `clearanceCm`).
- Köşeye (uç/T/X birleşim) yakınken yapışma KESKİN ama sonuç köşenin KENDİSİ
  DEĞİL: `findNearestWallCorner` en yakın köşeyi bulur, sonra orada BİRLEŞEN
  duvarların HER BİRİ için `applyWallEdgeClearance`'ı sırayla uygulayıp imleç
  tarafına doğru iter. Dik köşelerde tam sonuç verir (iki duvarın payını da
  tam karşılar); dik olmayan birleşimlerde yaklaşık bir çözüm — kapsam dışı.
- Aynı fonksiyon (`applyWallEdgeClearance`/`findNearestWallFace`) köşe
  taşımasında da kullanılıyor (`useSelectionTool.ts` → `resolveCornerPosition`,
  bkz. plumbing-selection.md) — çizim ve taşıma AYNI "duvar üstü yasak" kuralına
  uyar, iki ayrı payla ayrışmaz.

## Köşe işareti KARE, cap'ler YUVARLAK (2026-08, görsel düzeltme)

three.js `LineMaterial` (drei `<Line>`'ın altında) piksel modda her segmentin
UCUNA yuvarlak bir cap çiziyor — kütüphanenin tek desteklediği şekil, `linecap`
seçeneği yok. İki segment bir köşede buluşunca bu iki yuvarlak cap üst üste
biner ve köşe duvarın kapsül görünümü gibi OVAL durur; ama duvar BİLEREK
yuvarlak (`capsule-walls.md`), boru öyle döşenmez. Mimariye (duvar render'ına)
dokunmadan yalnız boru köşesini düzeltmek için `scene/LineMarkers.tsx` →
`CornerMarker` artık `CircleGeometry` değil `CORNER_SQUARE_GEOMETRY` (kenarı
boru genişliğinin ~1.15 katı, eksene hizalı kare) kullanıyor — iki segmentin
yuvarlak uçlarını örtüp köşeyi köşeli gösteriyor. Kare eksene hizalı olduğu
için dik açılı (yatay/dikey) köşelerde tam gönye verir; dik olmayan nadir
köşelerde tam miter değildir ama yuvarlak bloba göre yine de belirgin şekilde
köşelidir — pipe segmentinin yönüne göre döndürülen gerçek bir miter şekli
bilerek yapılmadı (kapsam dışı, karmaşıklığı haklı çıkarmıyor). Hat UCU
işaretleri (`LineEndMarker`, bağlı/serbest) bu değişikliğin DIŞINDA — onlar
"nereye tutunduğu" anlamını taşıyor, boru gövdesinin şeklini değil.
