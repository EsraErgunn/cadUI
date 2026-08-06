# decision: Nokta sembolü (Desen A) — geometri kodda, SVG yok

Paletteki yedi araç (Ana Kesme Şalteri, Pano, Aydınlatma, Yangın Söndürücü,
Alarm, Deprem Sensörü, Menfez) tek alan kümesini paylaşır: tutanak K-0, Desen A.

## SVG boru hattı KULLANILMAZ

Tesisat tarafında asset yükleyici + `*.meta.json` + zod şeması + material
önbelleği var (`plumbing/scene/symbolLoader.ts`). Mimari semboller o yola
GİRMEZ; şekil `core/architectureSymbol.ts`'te **birim çerçevede** (100×100,
orijin merkez) tanımlanır ve `scene/PointSymbol.tsx` drei `<Line>` ile çizer.

Bu, mimari katmanın zaten yaptığı şey: `core/openingSymbol.ts` + `scene/Opening.tsx`
kapı/pencere sembolünü aynı ikiliyle üretiyor. Kazanç: asset yükleyici, metadata
şeması, `DoubleSide` backface tuzağı — hiçbiri gerekmiyor.

⚠️ **Şekiller şematik ve TEYİDE AÇIK.** Talep metni sembollerin biçimini tarif
etmiyor; doğalgaz projelendirmesinde standart karşılıkları var. Hepsi tek
fonksiyonda (`getPointSymbolGeometry`) durduğu için düzeltme yalnız orayı
değiştirir — model, yerleştirme ve etkileşim dokunulmaz.

## Model

`PointSymbol` kendi koordinatını TAŞIR (açıklığın aksine duvara bağlı değil):
`x`, `y`, `rotationDeg`, `label`, `note`, `floorId`.

- **`note` opsiyonel değil, boş string.** `JSON.stringify` undefined alanı atlar
  ve iki projenin JSON şekli ayrışırdı; kabul testi alan sırasına dayanıyor.
- **`roomId` YOK.** Tutanak menfez için zorunlu tutuyor ama mahal ilişkisi ayrı
  bir adım; varsayarak alan açmak geri alınacak kod üretir.
- **Boyut alanı yok**: yedi sembol de şematik damga, ölçülü eleman değil (ölçü
  Desen B'nin işi). Plandaki boy `POINT_SYMBOL_SIZE_CM` sabiti.

## Etiket

`P-01`, `AL-03` — önek `SYMBOL_LABEL_PREFIXES`'ten (Record: yeni tip eklenip
önek unutulursa DERLEME kırılır).

Sıradaki numara **kat + tip başına en yüksek numaranın bir fazlasıdır**, sayının
değil: silinen bir sembolün numarası geri kullanılırsa kullanıcı iki farklı
zamanda aynı adı taşıyan iki nesne görür.

**Çakışma kat içinde ve TİPTEN BAĞIMSIZ** (KK-10): panoya "MN-01" verilebilir ve
o ad menfezle çakışır. Çakışan etiket REDDEDİLİR, sessizce numaralandırılmaz.
Karşılaştırma yalnız boşluk kırpar, `toLowerCase()` UYGULAMAZ — bkz.
[turkish-collation](./turkish-collation.md).

Çoğaltmada kopya **yeni etiket alır**: kaynağın adını taşısaydı aynı katta iki
"P-01" olurdu.

## Yerleştirme jesti

Pointer **UP**'ta — tesisatla aynı sözleşme, bkz.
[plumbing-placement](./plumbing-placement.md). Izgaraya oturtma ortak:
`core/placement.ts` → `getPlacementPosition` (plumbing'den buraya taşındı,
iki kopya ızgara kademesi değişince ayrışırdı).

Araç yerleştirmeden sonra **aktif kalır**. Yerleşimin uygunluğu DENETLENMEZ
(tutanak K-6): sembol duvarın üstüne de boşluğa da bırakılabilir.

## Jest önceliği

`resolveArchitectureTarget` sırası artık **köşe → sembol → açıklık → duvar**.
Sembol ekranda açıklığın üstünde (`RENDER_ORDER.pointSymbol` 32 > `opening` 30),
köşe tutamağının altında. Üst üste bırakılmış sembollerde SONRA eklenen tutulur.

## Dönüşüm açıyı da çevirir

`transformSelectionInDraft` sembolün `x/y`'siyle birlikte `rotationDeg`'ini de
dönüştürür (`applyTransformToAngleDeg`). Yoksa 90° dönen grubun içindeki sembol
yer değiştirir ama **dik kalır**. Aynalama açıyı yansıtır: yatay aynada işaret
değişir, dikey aynada 180°'den çıkarılır.

Dayanak noktası hesabına sembol konumları da girer — yalnız sembol seçiliyken
kutu onun etrafındadır, yoksa dayanak bulunamaz ve döndürme hiç çalışmazdı.

**Dosya:** core/pointSymbol.ts (etiket) · core/architectureSymbol.ts (geometri) ·
core/placement.ts (ortak ızgara) · store/pointSymbolOps.ts ·
scene/usePointSymbolTool.ts (yerleştirme) ·
scene/usePointSymbolSelectionTool.ts (seçim/taşıma) · scene/PointSymbol.tsx ·
ui/properties/PointSymbolProperties.tsx
