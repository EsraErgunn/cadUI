# decision: PDF çıktısı vektör; çizim önce SVG olur

Tür: decision · 2026-08 · K136

## Boru hattı

```
store → core/pdf/planSvg.ts        → SVG metni (plan cm, y çevrili)
      → core/pdf/paper.ts          → kâğıt/ölçek/yerleştirme (punto, sol-alt)
      → core/pdf/coverPage.ts     → kapak YERLEŞİMİ (çizmez, konum üretir)
      → core/pdf/sitePlanSvg.ts   → vaziyet planı SVG'si (ölçeksiz, şematik)
        ├ elevationSvg.ts          → kat yığını kesiti (gerçek kotlar)
        └ footprint.ts/footprintSvg.ts → kuşbakışı kontur + SERVİS KUTUSU
      → core/pdf/isometricSvg.ts   → izometrik şema (ölçeksiz, tek çizgi)
        └ isometricLabelSvg.ts     → halka yerleşimi + kılavuz çizgileri
      → core/pdf/projectPayload.ts → proje JSON'u XMP metadata'sına gömer/okur
      → ui/pdf/renderPlanPdf.ts    → jsPDF + svg2pdf, çok sayfa, Blob
```

`core/` saf kalır: DOM yok, jsPDF yok. svg2pdf gerçek bir SVG ELEMANI istediği
için çevirme adımı `ui/` altında (kural 1/2).

Belge TEK parça: kapak → vaziyet planı → kat planları. Menüde "Proje Dosyasını
İndir" tek madde, kapsam (hangi sayfalar, hangi katlar) pencerede seçilir.
Katlar ZEMİNDEN YUKARI basılır — `floors` dizisinin kendi sırası.

## Dosya hem pafta hem PROJE DOSYASI

⚠️ **K179 (2026-08): "Proje Dosyasını Aç" (bu dosyadan çizimi GERİ YÜKLEME)
SİLİNDİ.** Bu adlarla yeni kod yazma: `pages/useProjectFileOpen.ts`,
`cadStore.loadProjectDrawing`, `OPEN_PROJECT_FILE_ITEM_ID`. Kullanıcı kararı:
projeler arasında geçiş bir PDF yüklemeden, editörün İÇİNDEN olmalı — bkz.
`ui/projects/ProjectOpenDialog.tsx` (Dosya ▸ Aç), `docs/kararlar.md` K179.
Aşağıdaki gömme mekaniği hâlâ GEÇERLİ (yalnız "Proje Dosyasını İndir" için,
tek yönlü) — dosya artık yalnız bir pafta + kayıpsız yedek/arşiv formatı,
projeler arası geçişin aracı değil.

⚠️ **Sayfa OKUNMUYOR, okunamaz da:** PDF'te duvar yok, vektör yolu var.
Vektörden model üretmek ayrı ve kayıplı bir iş olurdu. Bunun yerine dışa
aktarırken proje JSON'u belgeye GÖMÜLÜYOR (`extractProjectJson` onu geri
çıkarabilir — yalnız round-trip testinde kullanılıyor,
`ui/pdf/__tests__/projectFileRoundTrip.test.ts`). Gömülen şey
`serializeProjectDataForBackend` çıktısı — "Dışa Aktar (JSON)" ve sunucuya
kayıtla AYNI kaynak.

Dosya adı `<proje numarası>.starcad.pdf` — kat adı gibi bir EK yok, dosya
projenin tamamını taşıyor.

⚠️ UZANTI `.pdf` KALIR. `.starcad` uzantı yapılıp GERİ ALINDI: dosya gerçekten
PDF ve uzantıyı değiştirmek onu işletim sistemi için başka bir tür yapıyordu
(çift tıklayınca görüntüleyici açılmıyordu). `.starcad` adın parçası.

⚠️ jsPDF 4.2'de attachment API'si YOK, `addMetadata` var → veri XMP akışında.
Okuma tarafı PDF'i DÜZ METİN olarak tarıyor; belge `compress` olmadan
kurulduğu için akış sıkıştırılmamış. **İkisi bağlı:** sıkıştırma açılırsa arama
sessizce boş döner.

⚠️ JSON base64: XMP bir XML paketi (`<`, `&`, tırnak paketi bozardı) ve proje
verisi Türkçe karakter taşıyor. Okurken baytlar `latin1` ile çözülüyor — `utf-8`
PDF'in ikili kısımlarını bozardı.

"İçe/Dışa Aktar (JSON)" kopya DEĞİL: onlar ham veri alışverişi, bunlar teslim
edilebilir dosya.

⚠️ **ANTET kısmen geri geldi.** Eski TAM künye bloğu (`core/pdf/titleBlock.ts`)
hâlâ SİLİNDİ — bu adla yeni kod yazma, proje künyesini kapak sayfası taşımaya
devam ediyor. Ama kat planı sayfaları artık TAMAMEN çizim değil: kenar boşluğu
şeridine (çizim alanının DIŞI) kat adı basılıyor (`getFloorPlanTitle` →
"Zemin Kat Planı" / "1. Kat Planı" / "Bodrum Kat Planı" / "Dubleks Planı" gibi,
`renderPlanPdf.ts`'teki `drawFloorTitle`) — hangi kata bakıldığı kapağa
dönmeden anlaşılsın diye (kullanıcı isteği, 2026-08).

⚠️ **Kapakta MOCK ALAN YOK** (K159): her değer ya gerçek bir uçtan ya çizimden.
`ProjectDetail.extras` bu yoldan TÜMÜYLE çıktı — detay EKRANI onu kullanmaya
devam ediyor, kâğıt kullanmıyor. Eskiden kapağın çoğu `extras`ten okunuyordu ve
o nesne üretimde `null` olduğu için tasarımcı/firma/onay blokları BOŞ basılıyor,
geliştirme çıktısı üretimden farklı çıkıyordu.

`useProjectSummary` DÖRT kaynağı birleştirir:

| Uç | Verdiği |
|---|---|
| `GET /api/projects/{id}` | ad, numara, adres, proje/ısınma tipi, mesken/dükkân adedi, alan |
| `GET /api/projectfirms/{id}` | firma ünvanı, vergi no, adres, telefon, yetkili |
| `GET /api/gasdistributionfirms/{id}` | onay bloğundaki firma adı |
| `GET /api/projects/{id}/history` | tasarımcı ve onaylayan |

Firma sorguları projeden gelen kimliğe bağlı (`projectFirmId`,
`gasDistributionFirmId`), bu yüzden zincirli.

⚠️ **Tasarımcı adı GEÇMİŞTEN, oturumdaki kullanıcıdan DEĞİL.** "PDF'i kim
alıyorsa onun adı" düşünüldü ve reddedildi: projeyi A çizip B bastırdığında
kapakta B yazardı, aynı belge her basımda farklı isim taşırdı — üstelik kapakta
İMZA satırı var. `projeKayit` satırı kim bastırırsa bastırsın aynı kalıyor;
sunucuya `createdByUserId` eklemeye gerek kalmadı.

⚠️ Sistem yöneticisi oluşturmuşsa adı BASILMAZ, firma yetkilisi yazılır: hesap
bir kişi değil ("Sistem Yöneticisi") ve projenin tasarımcısı da değil.

⚠️ Rol ayrımı METİN eşleştirmesi ve KIRILGAN — `OperationHistoryDto` yalnız
`roleSnapshot` (serbest metin) taşıyor, `roleCode` taşımıyor. Bilinen iki değer
listeli (`Admin`, `Yönetici`); uca `roleCode` eklenince `ROLE_CODES.admin`e
geçilecek.

⚠️ Onaylayan da geçmişten (`projeOnay`, EN GEÇ satır — yeniden onay olabilir);
`GET /api/projects/{id}` onay bilgisi HİÇ döndürmüyor. Satır sırasına
güvenilmez, `createdAt` karşılaştırılır. Ekranın "Bilinmeyen kullanıcı" yer
tutucusu kâğıda GEÇMEZ.

⚠️ Kapaktan KALKAN satırlar: `MAHALLESİ`, `SOKAK / KAPI NO`, `TESİSAT NO`
(sunucuda karşılığı yok; adresin tamamı `ADRESİ` satırında), `MÜH. GDF KAYIT NO`
(alan var ama KULLANICININ yetki kaydında, projeye bağlı değil), `YETER NO`
(sunucudan kaldırılmış). `VERGİ D. / VERGİ NO` → `VERGİ NO`: proje firması
gövdesinde `taxOffice` YOK, `joinTax` silindi. `ADI SOYADI` → `PROJE TASARIMCISI`.

⚠️ `KAT ADEDİ` uçta yok ama boş kalmıyor: çizimdeki kat sayısına düşülür — o da
uydurma değil, kullanıcının çizdiği katlar.

⚠️ **Vaziyet planının sokak/kapı ayrıştırıcısı düzeltildi** (K159): artık TAM
ADRESTEN türüyor ve eski desen orada bozuluyordu. Ölçüldü:
`"...No 12 Bornova/İzmir"` kapı numarasını `"va/İzmir"` diye okuyordu, çünkü
"Bornova" içindeki "no" hecesi eşleşiyordu. Üç düzeltme: `\b` kelime sınırı,
ardından RAKAM zorunluluğu ("Nolu Sokak" tetiklemesin), sona SABİTLEMEYİ
kaldırmak (numaradan sonra ilçe/il geliyor). "No" hiç yoksa kapı boş kalır —
paftaya yanlış numara yazmaktansa boş bırakmak doğru.

## İzometrik şema sayfası

Ekranla AYNI çekirdek fonksiyonlardan: `buildIsometricScene` geometriyi,
`isometricLabels` etiket metnini veriyor. Sayfa EN SONDA.

⚠️ İzdüşüm ve etiket YERLEŞİMİ ekranla AYRI (K155/K156): kâğıt
`getObliqueProjection` + `layoutLabelsBesideAnchors`, ekran kamera izdüşümü +
`layoutIsometricLabels` (halka) kullanıyor.

⚠️ Sayfa SABİT ve OBLİK bir izdüşümle basılır (K155): plan x yatay, plan y 30°
eğik, kot dikey. Ekranın α/β açısını KULLANMAZ — eskiden kullanıyordu ve
"Üstten" ön ayarında sayfa plan görünümüne çöküyordu. Ayrıntı:
knowledge/isometric-view.md.

⚠️ Sayfa ÖLÇEKSİZ: izdüşümde uzunluklar kısalır, cetvelle ölçülemez. Gerçek boy
etiketten okunur. Vaziyet planıyla aynı yoldan (`drawFittedSvg`) sığdırılıyor.

⚠️ Borular TEK ÇİZGİ (kullanıcı kararı, referans şemayla aynı okunuş); çap
yazıdan okunuyor.

⚠️ Eleman sembolleri BILLBOARD: plan açısı UYGULANMAZ, ekrandaki
`IsometricElement` de kameraya dönük çiziyor. Plan sayfasının
`toSymbolTransform`ından tek farkı bu; çapa kaydırması ölçekten ÖNCE ve 1:1 cm.
İlk sürümde semboller HİÇ çizilmemişti — sayfada yalnız boru ve yazı vardı.

⚠️ **Kâğıtta HALKA YERLEŞİMİ YOK** (K156): etiket kendi nesnesinin yanında
(`layoutLabelsBesideAnchors`), kılavuz çizgisi istisna. `PAPER_RING_TIGHTNESS`,
`PAPER_LABEL_PULL` ve `LABEL_SEPARATION_FACTOR` SİLİNDİ — bu adlarla kâğıt
tarafında kod yazma. Ekran halkayı kullanmaya devam ediyor. Kâğıtta ayrıca
yalnız KÜNYESİ olan elemanlar etiketlenir (sayaç, yakıcı cihaz, servis kutusu)
ve semboller `PAPER_SYMBOL_SCALE` ile küçültülür (K157). ESKİ GEREKÇE, artık
geçersiz: halka ekranda doğruydu çünkü yazı ekran-sabit boyutta ve kamera
uzaklaşınca okunur kalıyor. Kâğıtta her şey BİRLİKTE küçüldüğü için aynı halka
çizimi ortada minik bir leke yapıyordu (ölçüldü: 1500 cm'lik sahne 3883 cm'lik
kutuya yayılıyordu).

⚠️ Kutu ölçüsü artık etiket BAŞINA hesaplanıyor. Halkadayken tek bir "en geniş
etiket" payı yetiyordu (hepsi aynı çember üzerindeydi); yan yana dizilen
kutularda dar bir etikete geniş pay vermek onu boş yere uzağa itiyor.

⚠️ Kullanıcının elle taşıdığı etiket (`isometricLabelOffsetCm`) OLDUĞU YERDE
kalır; otomatik yerleşim yalnız taşınmamışlar için çalışır.

⚠️ Tesisatı olmayan projede sayfa HİÇ basılmaz. (Kat planında durum farklı:
orada boş sayfa "bu kat boş" bilgisini taşıyor.)

⚠️ Etiketlenen hatlar EKRANDAKİ kuralla aynı (`isConsumptionLine`): yalnız
tüketim noktasına varanlar. Numara süzülmüş liste üzerinden, atlama yok.

## Neden jspdf + svg2pdf

| | pdf-lib | jspdf + svg2pdf |
|---|---|---|
| Son yayın | 2022-05 | 2026-03 / 2026-01 |
| Test edilebilirlik | PDF baytları | **SVG metni** |
| Türkçe font | mevcut WOFF doğrudan | TTF gerekir (çevrildi) |

Ara SVG katmanının tüketicisi TESTTİR — başta "kimse tüketmiyor" diye
gereksiz sanılmıştı, yanlış çıktı.

## Tuzaklar

⚠️ **Gömülü font atlanamaz.** jsPDF yerleşik fontu Türkçe metni sessizce kabul
edip yanlış glif basar (ölçüm: 186,60 genişlik döndürdü). pdf-lib aynı yerde
açıkça patlıyor. Sessiz bozulma, gürültülü bozulmadan tehlikeli.

⚠️ **İki y ekseni var.** SVG y AŞAĞI, plan y YUKARI (`svgPrimitives.ts` → `sy`).
jsPDF y AŞAĞI, `core/pdf/paper.ts` y YUKARI (`renderPlanPdf.ts` → `toJsPdfY`).
Her çevirme TEK yerde; üçüncü bir yerde tekrarlama.

⚠️ **Ölçek kutsaldır.** Sığdırmak için ölçeği küçültme; taşmayı
`PageFit.isOverflowing` ile bildir. Ölçekli paftada cetvelle ölçüm yapılır.

⚠️ **Font dosyası üretilmiş bir varlık.** `public/fonts/roboto-regular.ttf`
`scripts/woffToTtf.mjs` ile `.woff`tan üretildi. WOFF değişirse TTF de
yeniden üretilmeli — ikisi elle ayrı ayrı güncellenmez.

⚠️ Kâğıtta ölçü katmanı HER ZAMAN açık (ekranda Görünüm menüsünden
kapatılabiliyor). Pafta ölçüsüz teslim edilmez. ⚠️ KÖŞE AÇILARI kat planında
basılmıyor (K154) — ekranda duruyorlar.

⚠️ Yazı-duvar boşlukları cm cinsinden sabit; ekrandaki `px / zoom` yolu
kâğıtta 1:50 ile 1:200 arasında farklı boşluk üretirdi.


## Renk hiyerarşisi: tesisat konu, mimari bağlam

Pafta tesisat çıktısıdır. Tesisat kendi renginde (hat çapından, sembol kendi
svg'sinden); mimari yalnız bağlam. İlk sürümde duvar neredeyse siyahtı ve
boruyu yutuyordu.

⚠️ İKİ palet var ve karıştırılmamalı:

- `PLAN_COLORS` — **yalnız KAT PLANI** (K154). Mimarinin tamamı İÇİ BOŞ, ince
  kontur; dolu hiçbir mimari yüzey yok.
- `SVG_COLORS` — görünüş, izometri, vaziyet ve oturum paftaları. Buradaki bir
  değeri değiştirmek kat planını ETKİLEMEZ, öteki dördünü birden etkiler.

Kat planı (`PLAN_COLORS`), iki kademe — tek ton DEĞİL (kullanıcı kararı; tek
tonda merdiven basamağı ile duvar aynı ağırlıkta okunuyordu):

| Katman | Renk | Rol |
|---|---|---|
| Duvar + kiriş | `#5b6674` kontur, içi beyaz | mimarinin en belirgini |
| Kapı/pencere, kanat, kolon, merdiven, şaft, cihaz sembolü | `#a8b0bb` kontur, İÇİ BOŞ | bağlam |
| Duvar ölçüsü | `#a8b0bb` | okunur ama sessiz |
| Oda adı + m², metin, yapı elemanı adı | `#8a94a1` | mimari yazı |
| Tesisat eleman etiketi + kılavuzu | `#334155` | KONU |
| Hat | çaptan (K27) | KONU |
| Eleman sembolü | kendi svg'sinden | KONU |

⚠️ Duvar İKİ GEÇİŞTE çizilir (`planSvg.ts`): önce TÜM duvarlar
`kalınlık + 2×WALL_OUTLINE_CM` kontur renginde, sonra TÜM duvarlar tam
kalınlıkta beyaz. Duvar duvar konturlamak yanlış sonuç verir — kapsüller (K23)
kavşakta üst üste biner ve her birinin konturu ötekinin İÇİNDEN geçer. İki geçiş
birleşimin dış çeperini polygon union yazmadan veriyor.

⚠️ İkinci geçiş OPAK: duvarın altındaki hiçbir şey görünmez. Oda dolgusu bu
yüzden tümden kalktı; oda adı ve alanı duruyor.

⚠️ Açıklığın beyazı, aynı renkte kontur verilerek ŞİŞİRİLİR
(`WALL_OPENING_BLEED_CM = 2 × WALL_OUTLINE_CM`). Poligon tam duvar
kalınlığında; olduğu gibi basılsa duvarın iki yüz çizgisi açıklığın önünden
kesintisiz geçer ve delik "delik" gibi okunmaz.

⚠️ Etiket rengi `buildLabelSvg`e PARAMETRE: yapı elemanı adı ile cihaz adı aynı
çizim yolundan geçiyor, sabit tek renkte cihaz adı plan yazısı gibi okunuyordu.

⚠️ Ekrandaki mimari renkler (K152) kâğıda ULAŞMAZ ve bu bilinçli — kat planında
mimari renksiz. Tesisat rengi tek istisna: `resolveLineColor` geri çağrımıyla
ekranla aynı yerden geliyor.

## Eleman sembolleri

Yeniden çizilmez: `plumbing/assets/symbols/*.svg` ham metin olarak gömülüp
(`?raw`) bir `<g transform>` içine konur. Dönüşüm zinciri sağdan sola —
origin sıfıra çekilir, ölçek, açı, konum.

⚠️ `symbolLoader.ts` (fay C) aynı varlıkları three.js geometrisine çeviriyor;
PDF metni istediği için AYRI bir okuyucu var (`ui/pdf/symbolMarkup.ts`).
Mantık kopyası değil, aynı dosyanın başka biçimde okunması.

⚠️ Sembolün 1 svg birimi = 1 cm. `element.scale` bunun üstüne çarpan.


## Sayfa sınırı: duvar uçları YETMEZ

Sınır şunların hepsini kapsar: duvar kapsülü (± yarım kalınlık), tesisat hat
noktaları, eleman konumları, eleman etiketi çapaları. Yalnız duvar uçlarına
bakıldığında duvarın dış yüzü ve duvara oturan menfez sayfa kenarında
kırpılıyordu.

## İçten/dıştan ölçü paftaya EKLENMEZ

Referans paftada var ama K95 onu DOĞRULUK sebebiyle kaldırdı (yanlış sayı
çiftleri). PDF'e eklemek hatayı kâğıda taşır ve ekran/kâğıt ayrışır. Gerekirse
önce ana çizimde çözülür; PDF aynı `getWallDimensionAnnotations`'ı okuduğu için
düzeltmeyi kendiliğinden devralır.


## Kâğıt ekranın aynısını basar

Pafta kendi çizim dilini uydurmaz. Her nesne sahnedeki geometri
fonksiyonundan geçer:

| Nesne | Kaynak |
|---|---|
| Alan nesnesi | `getAreaObjectPlanGeometry` |
| Kapı/pencere | `getOpeningSymbol` |
| Baca/havalandırma | `getDischargeRunGeometry` |
| Nokta sembolü | `getPointSymbolPlanGeometry` |
| Tesisat elemanı | `plumbing/assets/symbols/*.svg` (ham) |
| Kiriş | `getBeamCorners` + KESİKLİ kontur |

⚠️ Baca/havalandırma boru DEĞİL: çift çizgili kanal, kendi rengi
(`DISCHARGE_STROKE_COLORS`), çaptan renk ALMAZ.

## Etiket + kesikli kılavuz: TEK yol

`planSvgLabels.ts` → `buildLabelSvg`. Kılavuz nesneden çıkar, yazının
KUTUSUNDA durur (`clipLeaderEndToRectCm`). Bugün tesisat elemanı ve alan
nesnesi besliyor; yeni bir nesneye ad eklenince buraya bir madde daha verilir,
ikinci bir çizim yolu açılmaz.

⚠️ Kimin adlanacağı ekrandaki kuralla aynı (`hasAreaObjectNameLabel` /
`hasElementNameLabel`): merdiven ve vana etiketsiz. Yazan şey TÜRÜN adı.

## Vaziyet planı: iki güven düzeyi

Kat yığını kesiti (`elevationSvg.ts`) GERÇEK veriden — `Floor.heightCm`,
`isBasement`; kot sıfırı ZEMİN katın tabanı, bodrumlar aşağı iner. Bodrumun kot
etiketi TABANINDAN yazılır: tavandan yazılsaydı en üstteki bodrumun tavanı 0
çıkıp zemin çizgisinin etiketiyle çakışırdı (ölçüldü).

Parsel ÇERÇEVESİ boş — projede parsel/ada geometrisi yok, uydurulmuş sınır
yanlış bilgi olurdu. Çerçevenin İÇİ gerçek: zemin katın kuşbakışı konturu ve
SERVİS KUTUSUNUN yeri (`footprint.ts` veriyi, `footprintSvg.ts` çizimi
üretir). Sayfanın asıl işi gazın binaya hangi kenardan girdiğini göstermek.

⚠️ Kontur duvarı TEK ÇİZGİ çizer, kalınlık yok sayılır: bu ölçekte bir piksel
etmez, kapsül geometrisini (K23) buraya taşımak boşuna karmaşa olurdu.

⚠️ Servis kutusu SINIRLARA katılır — bina dışında (bahçe duvarında) olabilir ve
kontur ona göre yerleşmezse çerçevenin dışında kalır. Ayrıca kat FİLTRESİZ
aranır: bodrumda konumlanmış olabilir.

⚠️ Sayfa ÖLÇEKSİZ; `fitPlanToPage` ile değil, alana SIĞDIRILARAK yerleşir.
"Ölçek kutsaldır" kuralı kat planı içindir, şematik kesit cetvelle ölçülmez.

## Kapak

⚠️ Logo RASTER ve kaynak 2 MB / 1536×1024; kutu yüz punto civarı. Doğrudan
gömülseydi HER PDF 2 MB ağırlaşırdı — önce tuvale çizilip küçültülüyor
(`planPdfLogo.ts`). Yüklenemezse kapak yine basılır, kutuya "STARCAD" yazılır.
Görselin altına uygulama adı YAZILMAZ: logo zaten "StarCAD" diyor.

⚠️ Kutular DEĞERİ OLMASA DA çizilir; boş hücre elle doldurulur.

⚠️ Onay kutularının başlığı künye etiketlerinden BÜYÜK punto
(`CoverField.labelSizePt`) ve ALTI ÇİZİLİ: künye hücresinde asıl bilgi etiketin
altındaki değer, onay kutusunda ise etiketin KENDİSİ başlık. Kutunun ortası
kaşe için boş, künye SAĞ ALTA iniyor (`stampLines`) — solda çizen kişi +
firması, sağda dağıtım şirketi + onaylayan mühendis.

⚠️ Bölüm başlıkları DOLGUSUZ (beyaz). Dolgulu denendi, kâğıtta ağır durdu;
başlık olduğunu punto farkı söylüyor — gömülü fontta kalın yüz yok.

⚠️ **Sayfa ÜÇ DİKDÖRTGEN**, aralarında ince beyaz şerit: (1) logo + kaşe/onay,
(2) tesisat özeti + BİNANIN, (3) tasarımcı/firma + pafta künyesi. DIŞ ÇERÇEVE
YOK — olsaydı boşluklar çerçeve içinde kalan şeritlere döner, üç blok tek tablo
gibi görünürdü. Sütunlar EŞİT (yarı yarıya): ortadaki dikey çizgi kaşe
kutularından tasarımcı/firma bloğuna kadar hizalı kalıyor. Tesisat satırının
kendi başlığı yok — tek satır, bölüm açacak kadar dolu değil.

⚠️ Bant yükseklikleri birbirine göre SABİT punto; sabit bantlar bir katsayıyla
ölçekleniyor, KALAN kaşe bandına gidiyor. Katsayı `MAX_BAND_SCALE` ile sınırlı
(büyük kâğıtta hücreleri büyütmek yazıyı boşlukta yüzdürüyordu). Denenip düşen
ikisi: oranların toplamı 1 (satır eklenince taşıyordu) ve tek katsayıyla her
şeyi ölçeklemek (kaşe bandı A4 dikeyde sayfanın yarısına çıkıyordu).

⚠️ Kapakta satır KAYDIRMA yok: hücre yükseklikleri sabit. Taşan ünvan/adres
`fitTextToWidth` ile küçültülüyor; küçültme YETMEZSE en küçük puntoda "…" ile
kısaltılıyor. İki adım birlikte uygulanınca tam sınırdaki metin hem küçültülüp
hem kırpılıyordu (ölçüldü: sığan bir vergi numarası kesiliyordu). Genişlik
tahmini kaba (`CHAR_WIDTH_PER_PT`) çünkü `core/` fontu göremez — bilerek cömert,
gereksiz küçültmek taşmaktan iyi.

⚠️ **Tesisat satırı ÇİZİMDEN** (`installationSummary.ts`): sayaç adedi, cihaz
adedi, toplam debi, kullanım basıncı. Kaynağı `buildMeterReport` — sayaç/cihaz
ilişkisini borular üzerinden izleyen TEK yer orası; ikinci bir sayım yazılsaydı
sayaca bağlı olmayan cihaz da toplama girer, kapak birim/cihaz raporundan farklı
sayı gösterirdi. Sayaçların basıncı farklıysa alan BOŞ; girilmemiş değer SIFIR
yazılmaz.

**Dosya:** core/pdf/{paper,planSvg,planSvgObjects,planSvgAnnotations,
planSvgInstallation,svgPrimitives,coverPage,coverPageCells,coverPageFields,
sitePlanSvg,elevationSvg,footprint,footprintSvg,floorLevels,installationSummary,
projectPayload,isometricSvg,isometricLabelSvg}.ts · core/floors.ts
(getFloorPlanTitle) ·
ui/pdf/{renderPlanPdf,planPdfFont,planPdfLogo,ExportPdfDialog,ExportPdfOptions,
exportPdfDefaults,useExportPdf,useDownloadProjectInfoPdf}.ts(x) ·
ui/projects/{ProjectOpenDialog,ProjectRow,useMyProjects}.ts(x) ·
pages/useProjectSummary.ts ·
scripts/woffToTtf.mjs
