---
type: decision
date: 2026-08-03
---

# Duvar grafı düzlemseldir: kesişimde ve T birleşiminde düğüm açılır

## Karar

Duvarlar birbirini kesip geçemez. Her düzenlemeden sonra graf **düzlemsel**
hale getirilir: kesişen duvarlar kesişim noktasından, gövdesine başka bir
duvarın ucu değen duvar o noktadan BÖLÜNÜR.

- **T birleşimi:** değen ucun var olan `Point`'i PAYLAŞILIR, yeni nokta
  üretilmez. Aynı yerde iki nokta olsaydı duvarlar kopuk kalır ve mahal
  çevrimi kapanmazdı.
- **Kesişim:** iki duvar da bölünür, ortak TEK yeni `Point` üretilir.
- Bölünen duvarın ilk parçası **kendi id'sini korur**; seçim, açıklık ve geri
  alma o id'ye bakıyor.

Nerede: `core/wallGraph.ts` (saf: nerede bölüneceğini bulur),
`store/architectureSplit.ts` (uygular). `addWall`, `addWallChain`, `movePoint`
ve `moveWall` çağırır — hepsi kendi `set()`'i içinde, yani bölme onu tetikleyen
hareketle TEK geri alma adımı.

## Neden: mahal tespitinin ön koşulu

`core/room.ts` yüz taramasıyla çalışacak ve bu ancak kenarların YALNIZ
düğümlerde buluştuğu bir grafta doğrudur. Kesişip geçen duvarlar bu koşulu
bozar; oda algoritması onları görmez ve kapalı görünen alan kapanmaz.

## Açıklıklar: bölme reddedilir, açıklık kaybolmaz (K24)

Bölme noktası bir kapı/pencerenin İÇİNE düşüyorsa o bölme **yapılmaz**.
Açıklık silinmez, kaydırılmaz — K13'ün "geçersiz yerleştirme reddedilir"
kuralının aynısı.

Kesişimin bir tarafı reddedilirse **öbür tarafı da düşer**: yoksa bir duvar
bölünür, diğeri bölünmez ve ortada hiçbir şeye bağlanmayan bir düğüm kalır.

Reddedilmeyen bölmelerde açıklık kendisini İÇEREN parçaya taşınır ve
`offsetCm` o parçanın başına göre yeniden hesaplanır.

Sonucu: kapının üstünden geçen bir duvar orada düğüm AÇMAZ, dolayısıyla o
noktada oda çevrimi kapanmaz. Kullanıcıya bunu anlatan bir uyarı henüz yok.

## Kolineer örtüşme: split sonrası birleştirme (K34)

`getInteriorCrossing` paralel doğrularda `undefined` döner — üst üste binen
(kolineer) duvarlar `findWallSplits`'in kesişim/T-birleşimi ikilisiyle
YAKALANMAZ. Bitişik iki oda farklı boyda çizilip ortak kenarları kısmen
çakışınca (ya da bir duvar öbürünün tamamen içinde kalınca) her iki duvar da
kendi T birleşiminde AYRI AYRI doğru bölünüyor, ama ikisi de örtüşen aralık
için birer parça üretiyordu — aynı iki köşe arasında duran iki AYRI duvar.

Çözüm SPLIT'İN İÇİNDE değil, `splitWallsAtIntersections`'ın SONUNDA:
`mergeDuplicateWallsInDraft` aynı iki köşeyi paylaşan duvarları bulur, en
ferah olanı ("ilk çizilen") bırakır. "İlk", parçanın kendi id'sine değil
`originByWallId` üzerinden bu turda türediği ORİJİNAL duvarın id'sine göre
belirlenir — split'te üretilen yeni id, sonradan çizilmiş ama hiç bölünmemiş
bir duvarınkinden küçük de büyük de çıkabilir. Kaybedenin açıklığı kazanana
taşınır, kaybedeni sınırında sayan oda kaydı kazanana güncellenir (K31).
Detay: `docs/kararlar.md` K34.

## Açıklığın içinden geçen VEYA üstünde başlayan/biten duvar hiç yerleştirilemez (K35)

Yukarıdaki K24 "bölme reddedilir" diyor, duvar yine de yazılıyordu. Daha katı
bir kural var — ve yalnız ÇİZİM için: `findBlockingOpening` (`core/wallGraph.ts`)
adayın açıklığı GERÇEKTEN kesip kesmediğine bakar. Kolineer devam sorun değil
(kapı zaten o duvarın üstünde bir delik). **T birleşimi (duvarın UCU açıklığın
ortasına değmesi) DE reddedilir** — ilk yazımda "K24'ün senaryosu, sorun
değil" diye muaf tutulmuştu, kullanıcı geri bildirimiyle bunun yanlış
olduğu anlaşıldı: bir kapı/pencere boşluğunda duvar ne geçebilir ne başlayıp
bitebilir. `getInteriorCrossing`'in uç değerleri (0/1) zaten kesişim sayıyor,
ekstra bir ayrım gerekmiyor.

Bu yalnız YENİ duvar yerleştirmeyi (`appendWall`) kapsar; var olan duvarı
TAŞIYARAK aynı noktaya getirmek (`movePoint`/`moveWall`) `appendWall`'dan
geçmiyor. Detay: `docs/kararlar.md` K35.

## TAŞIMA da reddedilir; imlece yapışık kalma (K36)

K35'in "yalnız yeni yerleştirme" sınırı kaldırıldı: köşe/duvar TAŞIRKEN de
(`usePointDragTool.ts`, `useWallSelectionTool.ts`) hedef bir açıklığı
kesiyorsa/üstünde bitiyorsa bırakma reddedilir. UX modeli "bas-sürükle-bırak"
değil "tut, geçersiz bırakma denemesi başarısızsa imlece yapışık kal, geçerli
yere TEKRAR TIKLAYINCA bırak" — `drag`/`grab` reddedilince SIFIRLANMAZ,
`onPointerMove` buton durumundan bağımsız çalıştığı için köşe/duvar imleci
takip etmeye devam eder; aktif bir sürükleme varken `onPointerDown` yeni bir
tutma BAŞLATMAZ, karar hep `onPointerUp`'ta verilir. Esc her zaman temizler.

Saf etki hesabı `core/wall.ts`'e çıkarıldı (`getPointMoveImpact`,
`getWallMoveImpact`) — hook'lar R3F gerektirdiği için doğrudan test edilemez,
saf kısmı test edilebilir kalsın diye. Bilinen sınır: duvar taşımada esneyen
komşular (paylaşılan köşeyi taşıyan ama seçili olmayan duvarlar) kontrol
edilmiyor, yalnız doğrudan taşınan nesne. Detay: `docs/kararlar.md` K36.

⚠️ **Kontrol İKİ YÖNLÜ olmak zorunda (K48).** `findBlockingOpeningInSegments`
yalnız "hareket eden segment SABİT bir açıklığı kesiyor mu" diye sorar; taşınan
duvar `stationaryWalls`'tan çıkarıldığı için ONUN açıklığı hiç sorulmuyordu ve
kapısı olan bir duvar başka duvarın üstüne sürüklenebiliyordu — hata SESSİZDİ.
Ters yön `findBlockingOpeningOnMovedWalls`'ta; çağıranlar ikisini birleştiren
`findBlockingOpeningForMove`'u kullanır, ayrı ayrı çağırmaz (biri unutulursa
hata yine sessiz olur).

⚠️ Taşınan segmentin uçları duvarın `p1Id → p2Id` sırasında olmak ZORUNDA
(`MovedWallSegment`): `Opening.offsetCm` p1'den ölçülüyor, ters segmentte
açıklık öbür uçta aranır.

## Bilinen sınırlar

- **Uca MIN_WALL_LENGTH_CM'den yakın değme bölme üretmez** — güdük duvar
  oluşmasın diye. O mesafe zaten gözle köşeden ayırt edilemiyor, ama
  topolojik olarak bağlanmamış olur.
- **Bölünme geri BİRLEŞMEZ.** Duvarlar ayrılınca parçalar ayrı kalır
  (bilinçli: öngörülür davranış). Tekrarlanan taşımalarda parça birikir;
  ileride "seçili iki parçayı birleştir" komutu gerekebilir.
- **Maliyet duvar sayısında karesel.** Çizim ölçeğinde sorun değil; büyürse
  rbush ile aday daraltma gerekir (geometry SKILL'i).

## gotcha: kavşakta `alphaToCoverage` hale yapar (K98)

`scene/Wall.tsx` duvarları drei `<Line>` + `worldUnits` ile çiziyor.
`alphaToCoverage` AÇIK olmamalı: kavşakta birden çok yuvarlak UÇ üst üste
biniyor, her uç örnek maskesini ekleyerek değil yazarak koyuyor ve benzer kenar
alfaları aynı altkümeyi doldurduğu için birleşim tam örtmüyor — kavşakta
duvardan açık renkli bir hale kalıyor.

Tek duvarın gövdesinde sorun görünmez; belirti yalnız 3–4 kollu kavşakta okunur.
Kapalıyken uçlar tırtıklanmıyor (MSAA açık), yani takas yok.

## Normale kilitli taşıma ve köşe ayrılması (K102)

Duvar YALNIZ kendi normali boyunca taşınır (`core/wallMove.ts` →
`getWallNormal`, `constrainDeltaToNormal`). Kendi ekseni boyunca kaydırmak boyu
da açıyı da değiştirmiyor, sadece köşeleri komşuların üstünde kaydırıp
geometriyi bozuyordu.

Aynı jestte, ötelemeyi BOYUNU değiştirerek karşılayamayan komşular köşeden
koparılır (`store/architectureDetach.ts` → `detachRigidCornersInDraft`). Ölçüt
saf geometri: `canNeighbourAbsorbMove` — öteleme komşunun doğrultusuna paralelse
komşu uzar/kısalır ve açısı korunur, değilse eğilmesi gerekir ve kopar.

Pratikte: taşınan duvara **dik** komşular gelir, **aynı hizadakiler** kopar.

İKİNCİ ölçüt: köşede kopan bir duvar varsa, KISALAN paralel komşu da yerinde
bırakılır (`isMoveShorteningNeighbour`). Uzayan komşu köşeyi izlese de eski köşe
gövdesinde kalır ve K24 T kurar; kısalan komşu köşeden geri çekilip klonu havada
bırakıyordu — duvar AŞAĞI çekildiğinde yan odalar düşüyordu. "Köşede kopan var
mı" koşulu şart: kapalı dikdörtgenin üst duvarını içeri çekerken yan duvarlar
kısalır ama kopan yoktur, koşulsuz uygulansa yukarı taşan güdükler kalırdı.

Sürükleme ÖNİZLEMESİ de aynı kararı gösterir (`scene/useArchitectureDraft.ts`):
kopan komşular köşenin önizleme klonuna bağlanır, karar store yazımıyla AYNI
fonksiyondan (`planCornerDetachments`) gelir. Duvar çizen her yer önizlemeden
hem noktayı hem DUVARI okumalı; yalnız noktayı okumak kopmayı göstermez.

⚠️ Önizleme klon id'leri NEGATİF ve geçici, store'a girmez.

⚠️ Oda tespiti KULLANILMIYOR. Önceki tasarım "aynı odayı paylaşıyor mu" diye
ayırıyordu; `findRoomFaces` çağrısını, odasız duvar istisnasını ve eğik komşu
belirsizliğini getiriyordu. Normal kısıtıyla hepsi düştü.

⚠️ Shift'in ilgisi YOK — kopma ana davranış. Ara tasarımda Shift'e bağlanmıştı
ve `pointerdown`'daki "seçime ekle/çıkar" anlamıyla (KK-10) çakışıyordu.

⚠️ Kısıt yalnız TEK duvar sürüklerken; çoklu seçimde ortak normal yok, öteleme
serbest kalır (`WallGrab.normal === undefined`). Döndürme/aynalama kapsam dışı,
bayrak yalnız `kind === 'translate'` iken okunur.

⚠️ Izgara yapışması kısıtı bozmamalı: eksene paralel duvarda yalnız oynayan
koordinat, eğik duvarda normal boyunca MESAFE yuvarlanır (`snapNormalMoveToGrid`).

⚠️ Kopma taşımadan ÖNCE ama klonlar özgün koordinatta doğuyor; hareket yoksa
K24 onları geri birleştirir ve kopma boşa gider.

⚠️ Klon eski köşede kaldığından çoğu zaman komşunun gövdesine denk gelip K24 ile
T birleşimi kurar — yan odanın çevrimi böyle kapanıyor. Denk gelmezse oda düşer.


## Çizimi yırtan taşıma reddedilir (K102)

`core/wallMoveValidity.ts` → `findWallMoveBlocker`. Jestte uygulanır
(`useWallSelectionTool`), store action’ında değil — K36 ile aynı ayrım: `grab`
korunur, duvar imlece yapışık kalır.

- **`freeEnd`**: taşınan duvarın ucu hiçbir duvara değmiyor. Komşunun ucunun
  ötesine itilince değecek gövde kalmıyor ve duvar serbest kalıyordu.
- **`collapse`**: bir duvar MIN_WALL_LENGTH_CM altına iniyor. Duvarı komşusunun
  üstüne itmek sıfır boylu duvarlar ve çakışan kopyalar üretiyor, oda çevrimi
  kopuyor, yan odalar dolgusu ve etiketiyle kayboluyordu.

⚠️ İkisi de "önceden de böyleydi" durumunu geçirir; kural YENİ bozulmayı önler.

⚠️ Önizleme, denetim ve store yazımı aynı simülasyondan geçer (`applyWallMove`).


## Duvar taşıma modeli: PARALEL KAYDIRMA (K102, son hâli)

`core/wallOffset.ts` → `planWallOffset`. Duvar kendine paralel kayar, her ucu
komşusunun DOĞRUSU boyunca kayarak yeni kesişime oturur. Komşunun açısı korunur,
yalnız boyu değişir.

⚠️ Eski KATI öteleme modeli TERK EDİLDİ. O model komşu hareket yönüne paralelken
çalışıyordu — dik açılı planda tesadüfen hep doğru, EĞİK planda hiç doğru değil:
yamuk odada hiçbir duvar hiçbir yöne taşınamıyordu. `canNeighbourAbsorbMove`,
`isMoveShorteningNeighbour`, `planCornerDetachments` ve `store/architectureDetach.ts`
SİLİNDİ — bu adlarla yeni kod yazma.

⚠️ Taşınan duvarın BOYU değişebilir. Dik açılı planda değişmez.

⚠️ Kaydırma kendi store eylemidir (`offsetWall`), `transformSelection` değil:
iki uç farklı vektörlerle gidiyor, tek `translate` ile ifade edilemez. Çoklu
seçim blok olarak ötelenmeye devam eder.

Kopma yalnız komşu taşınan duvara PARALEL olduğunda (kesişim yok). Köşede kopan
biri varsa KISALAN kazanan da yerinde bırakılır, yoksa klonu havada bırakır.


## Taşıma artığı düğümler temizlenir (K103)

Duvar taşındıkça komşu kenar her seferinde yeni köşede bölünüyor; önceki bölme
noktası geride kalırsa parça birikir. Üç önlem:

1. `planWallOffset` kesişimi kazananınkiyle AYNI olan komşuyu koparmaz — bölünmüş
   kenarın iki parçası aynı köşeyi istiyor, ortak köşe ikisini birden karşılar.
2. `mergeCollinearWallsInDraft`: köşede yalnız iki duvar var ve eş doğrultuluysa
   birleşir. Kalınlık/yükseklik farklıysa BİRLEŞMEZ. Açıklıklar taşınır (K10).
3. `mergeCoincidentPointsInDraft`: duvar eski yerine dönünce kopan köşe klonunun
   üstüne geliyor; aynı yerdeki iki nokta kaynar (K24 ilkesi).

⚠️ Birleştirme YALNIZ taşıma yolunda. `splitWallsAtIntersections` içine konsaydı
"bölünme geri birleşmez" sözleşmesi her yerde değişirdi.
