# Kiriş (Beam) — çizgisel yapı elemanı (K47)

## Model neden AreaObject'e girmedi

`Beam { id, floorId, x1, y1, x2, y2, thicknessCm, label }` — çizgisel.
`AreaObject` merkez + boyut + açı taşıyan bir ALAN; kiriş iki UÇLA tanımlı ve
uçlarından uzatılıyor. Referans formatta da ayrı: `Beam{x1,y1,x2,y2,width,height}`.

⚠️ **Duvarın `Point` havuzunu KULLANMAZ.** Havuza girseydi duvar bakımının
tamamı kirişi de görürdü — `getOrphanPointIds` (sahipsiz köşe temizliği),
`splitWallsAtIntersections` (kesişimde bölme), `recomputeRoomsInDraft` (oda
çevrimi). Kirişe açıklık takılmıyor, oda çevirmiyor, bölünmesi istenmiyor:
üçü de kirişi SESSİZCE bozardı. Bedeli: kirişin ucu bir duvar köşesine
"bağlanmaz", yalnız snap ile aynı noktaya OTURUR — duvar sonradan taşınırsa
kiriş yerinde kalır. Bugün istenen davranış bu.

Yükseklik alanı YOK (duvarın `height`'ı 3B içindi, kiriş 3B'de yok).

## Görünüm

**KESİK konturlu dikdörtgen + alan nesnesiyle AYNI soluk dolgu** (kullanıcı
isteği: "duvarlarımızla aynı şekilde ve kalınlıkta, içi kolonlar gibi").

⚠️ Duvarın KAPSÜLÜ (yuvarlak uçlu tek kalın `<Line>`, K23) kullanılamadı:
kesikli kontur ancak gerçek bir dikdörtgen çevrimi çizilerek elde edilir. Sonuç:
**kirişin uçları DÜZ, duvarınki yuvarlak.** `getBeamCorners` dört köşeyi
eksene dik ötelemeyle üretir; sıfır boyda yön belirsiz olduğu için `undefined`
döner ve çizilmez.

Renk duvarla AYNI (`ARCHITECTURE_COLORS.wall`). Kirişi duvardan ayıran tek şey
konturun kesik olması — plan geleneğinde kiriş, kesitin dışında kalan üstteki
elemandır. Dolgu `areaObjectFill` token'ını paylaşır (K46).

Kalınlık `DEFAULT_WALL_THICKNESS_CM` ile doğar ama SABİT BAĞLI DEĞİL: panelden
değiştirilir.

## Katman sırası (K47'de yeniden numaralandı)

`opening 30 → beamFill 31 → beam 32 → pointSymbol 33 → areaObjectFill 34 →
areaObject 35 → installationGhost 36`

Kiriş açıklığın ÜSTÜNDE: altına düşerse duvar kütlesi onu yutar ve **duvara
oturan bir kiriş seçilemez hâle gelir**. Sembol/alan nesnesinin ALTINDA: ikisi
de kirişten küçük, üstte durmalılar.

⚠️ `core/architectureHover.ts`'teki hedef sırası bu sırayı AYNEN izler. İkisi
ayrışırsa vurgu "şunu tutarsın" der, basış başka şeyi tutar
(knowledge/gesture-bus-precedence.md).

## Çizim jesti: duvarınki, ama ZİNCİRSİZ

İlk sol tık başlangıç, ikinci tık kirişi yazar, sonra yeni başlangıç gerekir.
Zincir YOK: kirişler duvarlar gibi kapalı çevrim kurmuyor, zincir kullanıcıya
istemediği ikinci kirişi kazayla çizdirirdi. Sağ tık yarım jesti atıp paleti
Seçim Aracı'na döndürür (K42). Snap `resolveSnap` — duvar aracıyla aynı; Ctrl
ızgarayı kapatır.

Önizleme yalnız BİRİNCİ uç konduktan sonra çizilir: tek nokta dikdörtgen
tanımlamıyor.

## Uç tutamaçları — K44 dersinin tekrarı

İki uçtaki tutamaç kirişin gövdesinin İÇİNDE duruyor, yani aynı pointerdown'ı
kiriş TAŞIMA da görüyor. `findSelectedBeamHandle` isabet ederse diğer hook'lar
jesti hiç başlatmıyor; kontrol yine BEŞ hook'ta: `useAreaObjectSelectionTool`,
`useSelectionTool`, `useWallSelectionTool`, `usePointSymbolSelectionTool`,
`usePointDragTool`.

**Yeni bir tutamaç/dışa taşan etkileşim eklerken bu listeyi yeniden gözden
geçir.** Hata sessiz değil ama garip: iki jest aynı anda çalışır.

Tutma alanı ve tutamaç boyu EKRAN pikselinde (`px / zoom`, K45 kuralı).
Sürükleme boyunca cadStore'a yazılmaz; önizleme `architectureUiStore`
(`beamHandleDrag`), tek yazım bırakma anında — tek markDirty, tek Ctrl+Z.
`moveBeamEnd` minimum boyun altına inen sonucu REDDEDER.

## Bilinen sınırlar

- **Grup dönüşümü (KK-11 döndür/aynala) ve Ctrl+D çoğaltma kirişi KAPSAMIYOR.**
  Alan nesnesi de kapsamıyor — `store/transformOps.ts` yalnız duvar ve sembol
  biliyor. Yeni tür oraya eklenirken ikisi BİRLİKTE düşünülmeli.
- Panelde **uzunluk salt okunur**: bir sayı hangi ucun oynayacağını söylemiyor.
- **K35/K36 açıklık koruması UYGULANMADI**: kiriş tavan seviyesinde, kapının
  üstünden geçmesi normal — o kural düşey elemanlar (kolon, merdiven) içindi.

Tarayıcıda doğrulandı (çizim, dolgu, kesik kontur, uçtan uzatma).
