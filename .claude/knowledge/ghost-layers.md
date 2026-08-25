# Hayalet katmanlar: her görünüm karşı katmanı soluk gösterir

İki yönlü ve simetrik: tesisat görünümünde mimari (`ArchitectureGhost`), mimari
görünümde tesisat (`InstallationGhost`) soluk çizilir. İkisi de tek dosyada
(`src/plumbing/scene/Ghosts.tsx`), ikisi de **`SceneRoot`'ta** mount edilir.

**Neden SceneRoot?** Hayalet, çizen katmanın parçası değil *görünümün bağlamı*dır.
`PlumbingLayer` içinde dursaydı simetriği `ArchitectureLayer`'a yazılmak zorunda
kalırdı (başka sahibin dosyası + plan Bölüm 4.3 kapalı listesi dışı). SceneRoot
zaten görünüm anahtarının olduğu yer.

**Kat.** Her hayalet aktif katı KENDİ okur (`activeFloorId`); mount eden kimse
kat bilgisi geçirmez. Kat geçişi geldiğinde hayaletler kendiliğinden doğru katı
gösterir.

## İki hayalet aynı yöntemi kullanmaz — bilerek

| | Mimari hayalet | Tesisat hayaleti |
|---|---|---|
| Yöntem | Kâğıttaki kat planı diliyle: **içi boş kontur**, iki kademeli soluk ton | **Rengi korunur**, saydamlaşır (`opacity 0.35`) |
| renderOrder | `architectureGhost: 10` — tesisatın **altında** | `installationGhost: 70` — mimarinin **üstünde** |

Tesisat rengi bilgi taşıyor (renk = çap, K27); griye boyansa o bilgi kaybolurdu.
Mimari duvar rengi ise bilgi taşımıyor, boyanabiliyor.

## Mimari hayalet = KÂĞITTAKİ pafta, ekranda (K165)

Hayalet önce tek soluk renge boyanmış **dolu** bir kopyaydı. Kat planı paftası
K154'te içi boş çizim diline geçince ekran ile kâğıt ayrıştı: aynı kat, aynı
görünüm, iki farklı okuma. Şimdi hayalet paftanın diliyle çiziliyor.

- **Palet kâğıttan**: `PLUMBING_COLORS.architectureGhostWall/Faint/Text`,
  `core/pdf/svgPrimitives.ts` → `PLAN_COLORS`ten türer. Ekranda ikinci bir palet
  tutulsaydı biri değişip öteki unutulurdu. İki kademe: duvar (`wall`) baskın,
  geri kalan mimari (`faint`) ondan belirgin biçimde silik, yazı (`architectureText`)
  ayrı.
- **Duvar İKİ GEÇİŞTE**: önce TÜM duvarlar `kalınlık + 2×kontur` kontur renginde
  (`RENDER_ORDER.architectureGhost`), sonra TÜM duvarlar tam kalınlıkta zemin
  renginde (`architectureGhostWallVoid`). Duvar duvar konturlamak yanlış olurdu —
  kapsüller kavşakta üst üste biner (K23) ve her birinin konturu ötekinin
  İÇİNDEN geçerdi; iki geçiş polygon union yazmadan birleşimin dış çeperini
  veriyor (`planSvg.ts` ile aynı hesap). İki bandın AYRI renderOrder'da olması
  şart: aynı bantta kalsalardı bir duvarın içi komşusunun konturunu silerdi.
- **Kontur kalınlığı kâğıttaki sabitten** (`WALL_OUTLINE_CM`), yalnız piksele
  çevrilir (`getArchitectureStrokeWidthPx`) — duvar bandının kendisi de piksel
  yolundan geçiyor (`wallStyle.ts`), biri cm biri piksel kalsaydı yakınlaştıkça
  kontur kıl gibi incelirdi.
- **Açıklığın boşluğu ŞİŞİRİLİR**: poligon tam duvar kalınlığında, olduğu gibi
  bırakılsa duvarın iki yüz çizgisi deliğin önünden kesintisiz geçerdi. Zemin
  renginde `2 × kontur` kalınlığında bir çerçeve çizgisi payı veriyor — kâğıttaki
  `WALL_OPENING_BLEED_CM` ile aynı gerekçe ve aynı kat sayısı.
- **Hiçbir mimari yüzey DOLU değil**: oda, kiriş, alan nesnesi ve cihaz sembolü
  dolguları kalktı (kolonunki dahil). Altından geçen boru mimari yüzeyin
  arkasında kalmamalı — tesisat görünümünde konu gaz hattı.
- **Oda dolgusu gidince mahali gösteren tek işaret etiket**: ad + m² (kâğıtta da
  öyle). Rozet yok, `isRoomNamesVisible` anahtarına bağlı ve hayalet bandın en
  üstünde (`architectureGhostRoomLabel`) — yazı hiçbir konturun altında kalmaz.
- **Gömülü sembolün (pano, menfez) ayak izini "delme" çözümü kalktı**: duvarın
  dolu bir bant olduğu zamanın çaresiydi, duvar içi boşalınca gereksizleşti.

`installationGhost` mimarinin ÜSTÜNDE çünkü "hayalet"liği saydamlıktan geliyor,
derinlikten değil: altına konsaydı oda dolgusu (`Room.tsx`, henüz boş) devreye
girdiğinde tamamen kaybolurdu — [symbol-backface](./symbol-backface.md) ile aynı
sınıf sessiz görünmezlik.

## Hayalet açıklık = mimari görünümün simgesi, soluk hâli

Kapı/pencere hayaletinin geometrisi `core/openingSymbol.ts` → `getOpeningSymbol`'dan
gelir; mimari görünümle **tek kaynak**. Ayrı bir "kaba hayalet simgesi" tutulmuyor —
denendi, kapı duvara dik bir çubuk pencere tek çizgi olarak çıktı ve plandan koptu.
Dolgu `SCENE_COLORS.background` ile hayalet duvar bandını **deler**: açıklık bandın
üstüne çizilmiş bir kutu değil, gerçek boşluk gibi okunmalı. Kapı kanadı K165'ten
beri içi boş — kâğıtta da öyle.

Açıklık `architectureGhostOpening: 12` sırasında, duvarın içinin (`11`) bir tık
üstünde; kapı kanadı/pencere çizgileri de kendi açtıkları boşluğun üstünde
(`architectureGhostOpeningSymbol: 13`).
Aynı renderOrder'da bırakılamaz: three eşitlikte `material.id`'ye, yani mount sırasına
düşer ve sonradan eklenen bir duvar deliği kapatabilir.

Alt kat hayaleti (`FloorBelowGhost`, KK-13) aynı deseni kendi renginde ve daha ince
çizgiyle uygular (`floorBelowGhostOpening: 4`). Salt hizalama referansı olması tip
ayrımını GEREKSİZ kılmıyor, tam tersi: üst kat kapısı alttakine oturtulacaksa kapı
pencereden ayırt edilebilmeli. Böylece üç hayaletin de açıklık geometrisi tek kaynakta;
dolgu üçgenleri `src/scene/openingFill.ts`'te paylaşılır.

Hayalet material klonları `symbolLoader.ts` → `getGhostMaterial` ile RENK başına
önbelleklenir ve dispose EDİLMEZ (paylaşılan material'lerle aynı ömür); önizleme
klonu ise mount başına üretilip unmount'ta dispose edilir. Material sahipliği tek
dosyada: klon üretimi bir bileşen dosyasına konamaz da — `react-refresh/
only-export-components` bileşen dosyasından fonksiyon export'una izin vermiyor.
Her hayalet mesh'i `raycast` dışıdır.
