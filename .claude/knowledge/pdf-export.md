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
      → core/pdf/projectPayload.ts → proje JSON'u XMP metadata'sına gömer/okur
      → ui/pdf/renderPlanPdf.ts    → jsPDF + svg2pdf, çok sayfa, Blob
```

`core/` saf kalır: DOM yok, jsPDF yok. svg2pdf gerçek bir SVG ELEMANI istediği
için çevirme adımı `ui/` altında (kural 1/2).

Belge TEK parça: kapak → vaziyet planı → kat planları. Menüde "Proje Dosyasını
İndir" tek madde, kapsam (hangi sayfalar, hangi katlar) pencerede seçilir.
Katlar ZEMİNDEN YUKARI basılır — `floors` dizisinin kendi sırası.

## Dosya hem pafta hem PROJE DOSYASI

"Proje Dosyasını Aç" indirmenin tersi: PDF'ten çizimi geri yükler
(`pages/useProjectFileOpen.ts`).

⚠️ **Sayfa OKUNMUYOR, okunamaz da:** PDF'te duvar yok, vektör yolu var.
Vektörden model üretmek ayrı ve kayıplı bir iş olurdu. Bunun yerine dışa
aktarırken proje JSON'u belgeye GÖMÜLÜYOR, açarken oradan alınıyor. Gömülen şey
`serializeProjectDataForBackend` çıktısı — "Dışa Aktar (JSON)" ve sunucuya
kayıtla AYNI kaynak.

⚠️ Yalnız STARCAD'in ürettiği dosya açılır. Başka programınkinde veri yoktur;
anlaşılır hata verilir, sessizce boş proje YÜKLENMEZ.

Dosya adı `<proje numarası>.starcad.pdf` — kat adı gibi bir EK yok, dosya
projenin tamamını taşıyor.

⚠️ UZANTI `.pdf` KALIR. `.starcad` uzantı yapılıp GERİ ALINDI: dosya gerçekten
PDF ve uzantıyı değiştirmek onu işletim sistemi için başka bir tür yapıyordu
(çift tıklayınca görüntüleyici açılmıyordu). `.starcad` adın parçası.

⚠️ Açma yalnız ÇİZİMİ ve KAT YAPISINI yükler; KÜNYEYE dokunmaz (zaten store'da
durmuyor, CLAUDE.md kural 4). Store'a kimlik alanı eklenirse başkasının
dosyasını açmak açık projenin künyesini ezer — test kilitliyor.

⚠️ Açma GERİ ALINABİLİR: `loadProject` değil `loadProjectDrawing` çağrılıyor.
`loadProject` geçmişi siler (başka projeye geçiş), dosya açmak ise bir
DÜZENLEME. Kirli işaret de durur. Sayaç `Math.max` ile geriye çekilmez — geri
alma eski nesneleri geri getiriyor, küçülen sayaç id tekrarı üretirdi.

⚠️ jsPDF 4.2'de attachment API'si YOK, `addMetadata` var → veri XMP akışında.
Okuma tarafı PDF'i DÜZ METİN olarak tarıyor; belge `compress` olmadan
kurulduğu için akış sıkıştırılmamış. **İkisi bağlı:** sıkıştırma açılırsa arama
sessizce boş döner.

⚠️ JSON base64: XMP bir XML paketi (`<`, `&`, tırnak paketi bozardı) ve proje
verisi Türkçe karakter taşıyor. Okurken baytlar `latin1` ile çözülüyor — `utf-8`
PDF'in ikili kısımlarını bozardı.

⚠️ Gelen JSON `core/serialize.ts` şemasından geçiyor: "İçe Aktar (JSON)" ile
AYNI doğrulama yolu, ikinci bir okuma mantığı yazılmadı.

"İçe/Dışa Aktar (JSON)" kopya DEĞİL: onlar ham veri alışverişi, bunlar teslim
edilebilir dosya.

⚠️ **ANTET KALKTI.** `core/pdf/titleBlock.ts` SİLİNDİ — bu adla yeni kod yazma;
künyeyi kapak sayfası taşıyor, kat planı sayfası yalnız çizim.

⚠️ **Kapak, proje DETAY EKRANIYLA aynı kaynaktan beslenir** (`getProjectDetail`
→ `server` + `extras`) ve etiketleri o ekranın adlarının aynısı. PDF katmanı
hiçbir değer TÜRETMEZ. Tek istisna kat sayısı: uçtaki değer boşsa çizimdeki kat
sayısına düşülür — o da uydurma değil, kullanıcının çizdiği katlar.

⚠️ `extras` geliştirmede MOCK, üretimde `null` (K50/K51). Kapak üretimde o
kutuları BOŞ basar. Detay ekranı aynı değerleri kesikli "mock" işaretiyle
gösteriyor, KÂĞITTA öyle bir işaret yok — uçlar bağlanana kadar çıktıdaki bu
alanlara güvenilmemeli.

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

⚠️ Kâğıtta ölçü/açı katmanları HER ZAMAN açık (ekranda Görünüm menüsünden
kapatılabiliyor). Pafta ölçüsüz teslim edilmez.

⚠️ Yazı-duvar boşlukları cm cinsinden sabit; ekrandaki `px / zoom` yolu
kâğıtta 1:50 ile 1:200 arasında farklı boşluk üretirdi.


## Renk hiyerarşisi: tesisat konu, mimari bağlam

Pafta tesisat çıktısıdır. Mimari, tesisat GÖRÜNÜMÜNDEKİ hayaletle aynı soluk
tonda (`#94a3b8`); tesisat kendi renginde (hat çapından, sembol kendi
svg'sinden). İlk sürümde duvar neredeyse siyahtı ve boruyu yutuyordu.

| Katman | Renk | Rol |
|---|---|---|
| Duvar | `#94a3b8` | bağlam |
| Oda dolgusu | `#f4f6f9` | kapalı hacim işareti |
| Ölçü/açı | `#7c8899` | okunur ama sessiz |
| Oda adı, metin | `#64748b` | mimarinin en okunur parçası |
| Hat | çaptan (K27) | KONU |
| Eleman sembolü | kendi svg'sinden | KONU |

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
projectPayload}.ts ·
ui/pdf/{renderPlanPdf,planPdfFont,planPdfLogo,ExportPdfDialog,ExportPdfOptions,
useExportPdf}.ts(x) · pages/{useProjectSummary,useProjectFileOpen}.ts ·
store/cadStore.ts (loadProjectDrawing) ·
scripts/woffToTtf.mjs
