# decision + gotcha: Eleman yapışma modları (yerleştirme)

Tesisat elemanı artık tuvale serbestçe bırakılmaz. Nereye tutunacağı TÜRDEN gelir
(`plumbing/core/attachModes.ts` → `ELEMENT_ATTACH_MODES`), araç kimliğinden ya da
bileşenin içinden değil: dört mod var ve her biri farklı bir geometri çözücüsüne
(`core/elementAttach.ts`) düşer.

| Mod | Kimler | Davranış |
|-----|--------|----------|
| `onLine` | vana, selenoid vana, regülatör, manometre, filtre kiti, süzme sayaç, izolasyon | Boruya oturur, boru orada AYRILIR |
| `lineEnd` | sayaç | Boş (bağlantısız) bir boru ucuna takılır, araya vana girer |
| `nearestLine` | ocak, soba, şofben, kombi, kazan, diğer yakıcı cihaz | İmleçte durur, en yakın AÇIK BORU UCUNA kısa kolla bağlanır |
| `free` | servis kutusu, baca, havalandırma kanalı | Izgaraya oturur, serbest |

## open-question: Serbest eleman döndürme tutamacı YARIM kaldı, DOĞRULANMADI (2026-08)

Kullanıcı isteği "mimari çizimdeki döndürmeyi (AreaObject tutamacı)
kullanabiliriz" üzerine `free` modlu VE hiçbir portu bağlı olmayan elemanlar
için (kullanıcı kararı — `onLine`/`lineEnd`/`nearestLine` elemanların açısı
port ekseninden TÜRER, elle döndürme onu ezerdi) bir döndürme tutamacı
yazıldı: `core/elementRotateHandle.ts` (saf geometri, testli), `PlumbingSlice
.rotateElement`, `scene/useElementRotateTool.ts` + `ElementRotateHandle.tsx`,
`useSelectionTool.ts`'e K44 tipi bir sahiplenme kontrolü. Tarayıcıda
DOĞRULANAMADI — geliştirme ortamındaki gerçek API'ye (`.env` → dahili IP)
kimlik bilgisi yoktu, oturum açılamadı. Kullanıcı işi bu turda BIRAKTI
("döndürme işini bıraktık") ama kod SİLİNMEDİ — bir sonraki oturumda önce
tarayıcıda deneyip doğrulanmalı, özellikle: (1) tutamaç gerçekten görünüyor
mu, (2) sürükleme AreaObject'teki gibi hissediyor mu, (3) servis kutusuna
boru bağlandıktan SONRA tutamacın kaybolması beklendiği gibi mi davranıyor.

## nearestLine artık yalnız AÇIK UÇLARA bağlanır (2026-08 güncelleme)

`resolveNearestLineAttachment` başlangıçta `findNearestSegment` ile borunun
HERHANGİ bir noktasına (ortasına dahi) bağlanıyordu. Artık `findNearestFreeLineEnd`
kullanıyor — `lineEnd` modunun (sayaç) kullandığı AYNI aday havuzu: yalnız
bağlantısız/armatürsüz uçlar aday, `connections` parametresi bu yüzden
fonksiyona eklendi. Sonuçları:

- Vana artık boruyu AYIRMAZ (`onLine`'daki gibi bir bölme yok): borunun zaten
  var olan ucuna `inlineElementId` ile oturur. `NearestLineAttachment.endPointId`
  hattın hangi noktasına oturulacağını taşır, `segmentIndex` YOK (bölme yok ki).
- Bir uca ikinci bir cihaz takılamaz — port kuralıyla aynı, `findNearestFreeLineEnd`
  hem bağlı (`connections`) hem armatürlü (`inlineElementId`) uçları eler.
- Cihaz kolu (`applianceStub` hat türü) çap sınıfından BAĞIMSIZ, hep KIRMIZI ve
  KESİKLİ çizilir (`PLUMBING_COLORS.applianceStub`, `PipeLine`'a `isDashed`) —
  görsel olarak "bu bir boru değil, cihazın kısa bağlantısı" ayırt edilsin diye.

**Tuzak — kesikli önizleme hep DÜZ görünüyordu:** kolun canlı önizlemesi
(`DrawPreview.tsx` → `StubPreviewLine`) lastik bant tekniğini kullanıyor —
`points` PROPU sabit kalır (`RUBBER_BAND_SEED`), iki köşe her karede tamponun
İÇİNE yazılır. drei `<Line>` kesikli deseni yalnız `points` prop REFERANSI
değiştiğinde `computeLineDistances()` ile hesaplıyor (`Line.js`); tampon elle
yazıldığında bu hiç tetiklenmiyor ve mesafe sıfır uzunluklu ilk kareye takılı
kalıyor → desen hep SOLİD görünüyordu. Çözüm: buffer'ı yazdıktan sonra
`line.computeLineDistances()` ELLE çağrılıyor. Yerleşmiş (kalıcı) kol bu
tuzağa girmiyor — `InstallationLineMesh`'te `positions` gerçek `useMemo`'dan
geliyor, `points` prop'u mount'ta zaten doğru uzunlukla bir kez değişiyor.

## Regülatör: SVG artık yalnız gövde, iki manometre koda taşındı (2026-08, sıkılaştırıldı)

`regulator.svg` eskiden vana + manometre görselini de BAKIYORDU — bunlar zaten
`ELEMENT_COMPANIONS`'ta GERÇEK, ayrı elemanlar olarak ekleniyordu; SVG'deki
kopyalar yalnız görsel gürültüydü ve yanlışlıkla iki katı armatür varmış izlenimi
veriyordu. SVG artık yalnız boş gövde dairesi (`viewBox` 76×68 → 24×24).

Eskiden yalnız ÇIKIŞ tarafında bir manometre vardı; artık HER İKİ tarafta da var
(vana ile regülatör arasında, regülatöre YAKIN). Sıra `[valve, manometer,
regulator, manometer, valve]` — beş eleman, beş bölme (dört değil).

### Tuzak: `bounds` gerçek çizimden İKİ KAT genişti, grup hâlâ çok geniş görünüyordu

Paylar iki kez daraltıldıktan SONRA bile grup hâlâ geniş duruyordu — sebep
paylar değil, **vana ve manometrenin `meta.json`'daki `bounds`'u kendi gerçek
SVG çiziminden İKİ KAT genişti**: vana kulakçık çizgileri kaldırılıp yalnız iki
üçgene (bowtie) indirilmişti ama `viewBox`/`bounds` hâlâ eski 60 cm'lik tam
genişliği taşıyordu (görünen çizim yalnız 32 cm); manometre de aynı şekilde 44
cm `bounds` bildirirken çizim (daire çapı) yalnız 22 cm'ydi. `attachModes.ts`
bu ayarlanmamış `bounds`'a göre elle yazılmış `VALVE_HALF_CM`/`MANOMETER_HALF_CM`
kullanıyordu — sembol küçültülmüş görünse de ARALIKLAR hâlâ eski (hayali) geniş
gövdeye göre hesaplanıyordu. Düzeltme: `valve.svg`/`valve.meta.json`,
`solenoid-valve.svg`/`.meta.json`, `manometer.svg`/`.meta.json` gerçek çizimin
sınırlarına göre yeniden boyutlandırıldı (vana 60→32 cm, manometre 44→22 cm) —
port konumları da AYNI oranda içeri çekildi. `VALVE_HALF_CM` 30→16,
`MANOMETER_HALF_CM` 22→11.

**Genel ders:** bir sembolün `bounds`'u SVG çiziminden manuel türetilen bir
alan — çizim değiştiğinde (kulakçık silme gibi) `bounds`/`viewBox`/`ports` da
AYNI adımda güncellenmezse aralık hesapları sessizce yanlış (burada: hayali
geniş) kalır. `getHalfLengthCm` bounds'tan okuduğu için bu tip sürüklenmeler
testte YAKALANMAZ — sayı üretir ama yanlış sayı üretir.

Paylar da ayrıca iki kez daraltıldı: `REGULATOR_MANOMETER_CLEARANCE_CM` 8→4→3,
`VALVE_MANOMETER_CLEARANCE_CM` 20→10→6 — kullanıcı "daha yakın olsun" dedikçe
grup tek bir bileşenmiş gibi sıkı durmalı. Bounds düzeltmesiyle BİRLİKTE
ofsetler ±42/±114'ten önce ±38/±100'e, sonra (bounds düzeltmesiyle) ±26/±59'a
indi.

## Vana/selenoid vana: kulakçık çizgileri KALDIRILDI (SVG düzenlemesi)

Filtre kitiyle aynı gerekçe: gövde dışına taşan giriş/çıkış "kulakçık"
çizgileri (2026-08'de önce kalınlaştırılıp sonra) tamamen kaldırıldı — boru
zaten arkasından geçtiği için tekrar gerekmiyor, vana artık yalnız iki
üçgenin (bowtie) kendisi. `viewBox`/`bounds`/port konumları da (yukarıdaki
tuzak notuna bkz.) gerçek 32 cm genişliğe küçültüldü — eski 60 cm'lik
`bounds` artık yok.

## Süzme sayaç: portlar gaz sayacından KOPYALANMIŞTI, düzeltildi (2026-08)

`strainer-meter.svg`/`.meta.json` gaz sayacının (yukarı bakan, `lineEnd`
modu için tasarlanmış) port düzenini birebir taşıyordu — oysa `strainerMeter`
`onLine` modunda (bkz. tablo). Yukarı bakan portlarla akış ekseni DİKEY
çıkıyordu, `getFlowAxisAngleDeg`/`getOnLineAngleDeg` de buna göre yanlış
hizalıyordu; eleman boruya "üstten" değil yan yatık oturuyordu. Artık valve'la
AYNI düzende: yatay giriş/çıkış (x=0/60, y=20), akış ekseni yatay — boruya
doğrudan, merkezden oturuyor (2 portlu elemanların hepsiyle aynı `ORIGIN`
çapa kuralı, aşağıdaki "Sembol boruya PORT EKSENİNDEN hizalanır" bölümüne bkz.).

## Vana/selenoid vana/filtre/süzme sayaç: port yuvarlağı ÇİZİLMEZ (2026-08)

`attachModes.ts` → `NO_PORT_MARKER_TYPES`/`hasPortMarkers`. `PortMarkers.tsx`'in
paylaşılan bileşeni bu dört tür için erken `null` döner. Sebep: bunlar akış
geçişli `onLine` elemanlar, portları boruyu AYIRAN gerçek bir düğüm — WebCAD'deki
"buraya bağlan" anlamında serbest bir hedef DEĞİL. `isPortOccupied` bu
elemanların portları için zaten HİÇBİR ZAMAN `true` dönmeyecekti (armatür bir
bağlantı kaydı değil `inlineElementId`'dir) — işaret çizilseydi her zaman "boş"
(mavi) görünüp yanlış sinyal verirdi. Regülatör ve manometre bu istisnaya
DAHİL DEĞİL (kullanıcı yalnız bu dördünü istedi).

## Armatür taşınınca kolun ucu KOPMASIN (2026-08 düzeltmesi)

`nearestLine`'ın otomatik vanası, ana borunun VAR OLAN bir düğümüne
`inlineElementId` ile oturur; cihaza giden kol ise AYRI bir hat, o düğüme
yalnız bir `{kind:'line'}` bağlantı KAYDIYLA değer — kolun kendi başlangıç
noktası (`points[0]`) ana borudaki düğümle AYNI nesne DEĞİLDİR, konumu ayrı
tutulur. `moveElements` vanayı taşırken (üçüncü döngü) ana borudaki düğümü
doğru taşıyordu ama kolun kendi ucunu unutuyordu → vana sürüklenince kol
görsel olarak KOPUYORDU. Düzeltme: dördüncü bir döngü, `target.kind==='line'`
bağlantılarını tarayıp hedef noktası az önce taşınmış bir inline elemana aitse
(`movedInlinePointIds`) kolun o ucunu da AYNI deltayla taşıyor.

## Boruya oturan eleman sürüklenince BORU BÜKÜLMEZ, eleman ÜZERİNDE KAYAR (2026-08)

Önceki davranış: `moveElements` bir `onLine` armatürü serbest kaymayla
taşıyordu, düğüm de onunla birlikte HERHANGİ bir yöne gidiyordu — bu boruyu
büküyordu (bilinen sınır olarak K28'de not edilmişti). Artık TEK bir `onLine`
eleman sürüklenirken `core/elementAttach.ts` → `resolveOnLineSlide` devreye
girer:

- Düğümün İKİ SABİT komşusu bulunur (`line.points[index-1]`/`[index+1]`) —
  bunlar KENDİSİ hareket etmez, yalnız aralarındaki düz hat üzerinde bir
  izdüşüm hesaplanır (`projectOntoSegment`, [0,1] aralığına zaten kelepçeli).
  Komşular arası zaten DÜZ bir çizgi olduğundan (split bir gerçek köşe
  DEĞİLDİR) bu izdüşüm borunun görünen şeklini hiç DEĞİŞTİRMEZ.
- Açı SABİT tutulur — komşular kıpırdamadığı için yeniden hesaba gerek yok.
- İki komşusu da yoksa (eleman hattın tam UCUNDA, örn. nearestLine'ın boş uca
  oturan vanası) `null` döner: bu elemanlar KAYDIRILMAZ, eski serbest
  `moveElements` yoluna düşer (kol-kopma düzeltmesi zaten onları kapsıyor).

Store'da AYRI bir eylem var: `slideOnLineElement(lineId, pointId, elementId,
nodePosition, elementPosition)` — `moveElements`'in kayma (delta) mantığından
FARKLI, MUTLAK yazım yapar (tek elemanlık kaydırma zaten mutlak bir hedefe
projekte ediliyor). `useSelectionTool.ts`'te `SelectionGrab.slide` alanı:
yalnız TEK eleman seçiliyken ve `resolveOnLineSlide` `null` dönmüyorken devreye
girer, grup taşımasında hep eski serbest kayma kullanılır. Canlı önizleme
`dragDeltaRef`'e (elementPosition − ilk konum) yazılır — SymbolInstance zaten
bunu okuyor, ekstra bir bileşen gerekmedi.

**Bilinen sınır:** boru segmentleri (InstallationLineMesh) sürükleme boyunca
CANLI güncellenmez — store yalnız `pointerup`'ta yazılır (moveElements'teki
bağlı eleman/hat ucu davranışıyla AYNI sınırlama, yeni değil). Sembol geçici
olarak komşu köşelerin arasındaki (henüz store'a yazılmamış) hatta kayar,
bırakınca boru da o noktaya "yapışır".

## Vana/sayaç payı da sıkılaştırıldı

`elementAttach.ts` → `ATTACH_CLEARANCE_CM` 20→10 (gasMeter'ın otomatik vanasının
gövdeden uzaklığı). Regülatörün `VALVE_MANOMETER_CLEARANCE_CM`siyle (10) AYNI
değer — kullanıcı "vana ve sayaç için de yap" dedi.

## Armatür = düğüm, ayrı bir bağlantı kaydı değil

Boruya oturan eleman `InstallationLinePoint.inlineElementId` ile o düğüme bağlanır.
`InstallationConnection` bunu ifade EDEMEZ: o kayıt bir hattın UCUNU tarif ediyor
(`end: 'start' | 'end'`), oysa armatür hattın ortasındadır. WebCAD de aynı şeyi
yapıyor (`InstalmentPoint.inlineApplianceId`, K-W3).

Sonuçları:
- Eleman silinince düğüm boşa çıkar. Komşu iki segmentle AYNI DOĞRU üzerindeyse
  (armatür zaten DÜZ bir boruyu ayırarak oraya oturmuştu — `onLine` yerleşiminin
  doğal sonucu) köşe artık geometrik anlam taşımaz ve **birleştirilir**
  (`plumbingSlice.ts` → `applyRemoval`, saf karar `core/lineSimplify.ts` →
  `findCollapsiblePassThroughIndex`, 2026-08 ürün isteği: "filtre kiti silinince
  boru üzerinde nokta bırakmasın"). Kullanıcı köşeyi sonradan sürükleyip açı
  verdiyse (artık kolinear değil) **dokunulmaz** — o zaman gerçek bir geometridir
  ve silinmez; aynı şekilde köşe başka bir hattın ucuna `line` bağlantısıyla
  ANKRAJ oluyorsa da (başka bir boru/branşman oraya tutunmuş) birleştirilmez,
  yoksa o bağlı ucun hedefi kaybolurdu.
- **Hat silinince üstündeki armatürler de gider**: düğümü kalmayan bir vana
  çizimde tutunacak yer bulamaz, sahipsiz bir sembol olarak asılı kalırdı.
- Armatür taşınınca oturduğu düğüm **aynı kaymayla** gelir. İkisi ayrılsaydı vana
  borunun dışında durur, boru da o noktada boşuna bölünmüş görünürdü.

## Önizleme yoksa yerleştirme de yok

`onLine` modunda imleç boru üstünde değilse çözücü `null` döner: önizleme çıkmaz
**ve** tıklama hiçbir şey koymaz. Tek karar noktası — önizlemenin göründüğü an ile
tıklamanın iş gördüğü an aynı koşula bağlı, ikisi ayrı yazılsaydı "hayalet
görünmüyor ama eleman düşüyor" hâli doğardı.

Aynı sebeple geçersiz yerleşim **kaydırılmaz, reddedilir** (açıklık yerleştirmesiyle
aynı kural): düğüm bir köşeye `MIN_NODE_GAP_CM`'den yakınsa sıfıra yakın boyda
parça doğardı.

## Sembol boruya PORT EKSENİNDEN hizalanır, boru açısından değil

`getFlowAxisAngleDeg` giriş → çıkış portunun plan açısını verir; eleman açısı
`segmentAçısı − akışEkseniAçısı`. Vana/regülatör gibi portları yatay olan
sembollerde bu boru açısının aynısıdır, ama **sayacın portları gövdesinin
ÜSTÜNDEDİR** (`gas-meter.meta.json`: origin [30,13], portlar y = −20): boru açısı
doğrudan kullanılsaydı sayaç boruya ters otururdu.

Çapa (elemanın hedefe oturan noktası) moda göre değişir:
- `onLine`: akış geçişli armatür **merkezinden**, tek bağlantılı eleman (manometre)
  **portundan** tutunur → manometrenin gövdesi borunun yanında kalır, üstünde değil.
- `lineEnd`: **giriş portu** hattın uzatıldığı yeni köşeye oturur.
- `nearestLine`: gövde imleçtedir; eleman, giriş portu boruya BAKACAK şekilde
  döndürülür → kol hep porttan çıkar, gövdenin içinden geçmez.

## Refakatçiler tabloda, kodun içinde değil

Regülatör tek başına konmaz: giriş ve çıkış tarafına BİRER vana VE birer manometre
gelir (`ELEMENT_COMPANIONS`, 2026-08'de tek manometreden ikiye çıktı — bkz. "Regülatör"
bölümü yukarıda). Ofsetler semboller üst üste binmeyecek şekilde seçildi. Bir
refakatçi bile parçaya sığmıyorsa **yerleşimin tamamı reddedilir** — yarısı
konsaydı kullanıcı eksik bir grup görürdü.

`getInlineSpecs` diziyi ofsete göre ARTAN sırada verir ve `getPlacementPreviewTypes`
aynı sırayı döndürür. Sıra iki yerde ayrı hesaplansaydı önizlemedeki sembol başka
bir düğüme yerleşirdi. Store da bu sıraya güvenir: i. bölme, kendinden önceki
bölmelerin ikiye ayırdığı parçaya düştüğü için `segmentIndex + i` kullanılır.

## Sayaç konunca boru çizimi kendiliğinden başlar

`placeElementAtLineEnd` sayacın id'sini döndürür; araç boruya geçer ve taslak
sayacın **çıkış** portundan açılır. Kullanıcı sayacı koyup paletten boruyu ayrıca
seçmez.

## Tek jest = tek Ctrl+Z

Üç yerleştirme aksiyonu da (eleman + refakatçileri + boru ayırma + kol + bağlantı
kayıtları) TEK `set()` içinde çalışır. Regülatör dört eleman ve dört bölme yazar,
tek Ctrl+Z hepsini geri alır.

## İzolasyon artık bir eleman

`insulation` `TOOLBAR_ONLY_SYMBOL_IDS`'ten çıkıp `INSTALLATION_ELEMENT_TYPES`'a
girdi; araç davranışı `segment-toggle` değil `placement` (K-W4 zaten bunu
söylüyordu). Portu yoktur, boruya `onLine` modunda oturur.
`InstallationLineSegment.isInsulated` alanı hâlâ AÇILMADI.

### SVG YENİDEN ÇİZİLDİ: taban+sap+daralan taraz asimetrik tasarımı hep "ters" duruyordu

İlk sürüm taban çizgisi + yukarı sap + aşağı daralan üç enine çizgiden oluşan
ASİMETRİK bir şekildi. Çapayı (`getOnLineAnchorOffset`, 0 portlu elemanlarda
`metadata.origin`'in KENDİSİ) önce gövde ortasına, sonra "ince uca" taşımak
sorunu çözmedi — sorun ÇAPA noktası değil, şeklin kendisiydi: asimetrik bir
taraz hangi ucundan tutunursa tutunsun, SVG'nin y'si planın −y'sine ters
düştüğü için (`svgLocalToPlanOffset`, +Y aşağı → −Y yukarı) kullanıcıya hep
"ters" (baş aşağı) görünüyordu.

Çözüm: **simetrik bir zikzak/sarma deseni** (`insulation.svg`, tek `polyline`,
yukarı-aşağı dalgalanan bir çizgi, viewBox 40×16). Çapa dalganın TAM ORTASI
(`origin: [20, 8]`) — üstte de altta da eşit miktarda dalga var, dikey ayna
görüntüsü YİNE aynı desen gibi görünür. Bu şekil YAPISI GEREĞİ "ters"
duramaz: yön belirsizliği doğuran asimetri en baştan yok edildi.
