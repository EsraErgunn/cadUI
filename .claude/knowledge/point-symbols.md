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

## Model — sembol duvara BAĞLANIR (referans formatın modeli)

Referans proje cihazları duvara `wallId + distance + ccw` ile bağlıyor; biz de
aynısını yapıyoruz. `PointSymbol` ayrık birleşim:

```
{ attachment: 'wall', wallId, offsetCm, isMountedOnFarFace }
{ attachment: 'free', floorId, x, y, rotationDeg }
```

**Duvara bağlı sembol `floorId` ve `rotationDeg` TAŞIMAZ** — ikisi de duvarından
türer (`getSymbolPose`). Pano bir duvar YÜZEYİNE monte edilir, dolayısıyla duvar
nereye bakıyorsa o da oraya bakar; iki yerde tutulan yön zamanla ayrışır (Opening
ile aynı kural, K9). Sonuç: **duvar taşınınca/dönünce sembol kendiliğinden gelir**,
ayrıca güncelleme yok.

`isMountedOnFarFace` = referanstaki `ccw`: duvarın hangi yüzüne monte edildiği.
Sembol eksenin üstüne değil, kalınlığın yarısı kadar kaydırılmış YÜZEYE oturur —
eksende dursaydı duvarın içine gömülmüş görünürdü.

**Aydınlatma her zaman serbest** (`canMountOnWall`): referansta da `x, y` ile
duruyor, çünkü tavana takılıyor.

Serbest hâl bir hata durumu DEĞİL: araç bırakma noktasının uygunluğunu
denetlemiyor (K-6), duvara denk gelmeyen yerleştirme meşru.

- **`note` opsiyonel değil, boş string.** `JSON.stringify` undefined alanı atlar
  ve iki projenin JSON şekli ayrışırdı; kabul testi alan sırasına dayanıyor.
- **`roomId` YOK.** Tutanak menfez için zorunlu tutuyor ama mahal ilişkisi ayrı
  bir adım; varsayarak alan açmak geri alınacak kod üretir.
- **Boyut alanı yok**: yedi sembol de şematik damga, ölçülü eleman değil (ölçü
  Desen B'nin işi). Plandaki boy `POINT_SYMBOL_SIZE_CM` sabiti.
- **`elevation` YOK.** Referans montaj yüksekliğini tutuyor (280, 120, 200) ama
  tutanağın Desen A alan tablosunda geçmiyor ve 2B planda karşılığı yok. Analiste
  sorulmadan eklenmedi.

## Duvar silinince sembol de düşer

`pruneSymbolsInDraft` — açıklıktaki K16 temizliğinin karşılığı. Duvarsız bağlı
sembol temsil edilemez: konumu duvarından türüyor, duvar gidince çizilemez hâle
gelir ama kaydedilen JSON'da kalmaya devam ederdi. `deleteWall`,
`deleteSelectionFromDraft` ve `removeFloorFromDraft` üçü de çağırır.

## Dönüşüm yalnız SERBEST sembole uygulanır

Duvara bağlı sembol duvarıyla gelir: duvar seçimdeyse zaten taşınıyor, değilse
sembol duvarından kopmamalı.

⚠️ **Panelde AÇI ALANI YOK (K175)** — bu adla geri ekleme. Bu cihazların açısı
kullanıcının vereceği bir karar değil: duvara bağlı olanların yönü duvarından
türüyor, aydınlatma da tavana takıldığı için yönsüz. Alan eskiden vardı ve
duvara bağlıyken salt okunur gösteriliyordu; kullanıcı kararıyla tümden kalktı.
Seçim dönüşümü (`SelectionActions`, 90°/aynalama) sembolü hâlâ çeviriyor —
kaldırılan yalnız panelden serbest açı yazma yolu.

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

## Kaydedilmiş dosyayı bozmadan model değiştirme

`ProjectData` içindeki bir diziyi değiştirmek depodaki her çizimi etkiler ve
hata SESSİZ DEĞİL, tam tersine proje **hiç açılmaz**: zod ayrıştırma reddeder,
kullanıcının çizimi elimizdedir ama erişilemez. Bu tuzağa iki kez düşüldü:

1. `rooms`/`symbols` dizileri eklendi → eski dosyada alan yok → `.default([])`.
2. `PointSymbol` ayrık birleşime döndü → eski kayıtta `attachment` yok →
   `z.preprocess` ile eksik ayırt edici `'free'` sayılıyor (o hâliyle her sembol
   zaten serbestti).

**Kural:** `serialize.ts`'te kaydedilen bir şekli değiştirirken göç yolu AYNI
commit'te yazılır ve testi eklenir. Bit-bit tur bozulmaz, çünkü
`serializeProjectData` her zaman tam şekli yazar — göç yalnız ESKİ dosyanın ilk
açılışında çalışır, sonraki kayıtta alan dosyaya girer.

## Ad etiketi ve tutma alanı (K138)

⚠️ **Tutma alanı ÇİZİLEN geometriden.** Sınav sembolün KENDİ ekseninde yapılır:
hedef, duvarın açısı ve montaj yüzü geri alınarak yerel eksene taşınır
(`isPointInAreaObject` ile aynı yöntem), sonra geometrinin kutusuyla
karşılaştırılır. Çekme çizgisi de geometrinin parçası, o da tutulabilir.

Eskiden ÇAPA NOKTASI etrafında, kenarı `çekme çizgisi boyu + derinlik` olan bir
KARE vardı — çekme çizgili cihazda 114 cm'lik bir alan ve işaretin bulunmadığı
üç yöne de yayılıyordu. Kullanıcı "seçim alanı çok geniş" dedi: cihazın
yanındaki boşluğa yapılan tıklama duvara/odaya gitmeli.

⚠️ **Ad etiketi cihazın BAKTIĞI yöne konur**, dünya +y'sine değil. İlk sürüm
sabit "yukarı" kullanıyordu: aşağı bakan bir cihazda işaret duvarın altında,
yazısı üstünde kalıyor ve kılavuz duvarı kesip komşu odaya düşüyordu. Yön
cihazın yerel +y'sinden (`outwardSign` uygulanmış) geliyor; YAZI dönmez, yalnız
nereye konacağı döner.

**Etiket sürüklenebilir**, kayma `PointSymbol.labelOffsetCm`'te — alan
nesnesindekiyle aynı desen: canlı kayma `architectureUiStore`'da, bırakılınca
tek yazım, ızgaraya yakalanmaz. Tutma sınavı `pickPointSymbolLabelAt`.

⚠️ Şema alanı OPSİYONEL: eski kayıtta yok, zorunlu tutulmak dosyayı açılmaz
yapardı (yukarıdaki göç kuralı).

⚠️ Alan nesnesinin etiketi ÖNCELİKLİ (ikisi üst üste gelirse tek etiket
taşınsın); beş araç hook'u da cihaz etiketini sorup jesti bırakıyor.

⚠️ Görünürlük anahtarı alan nesnesiyle ORTAK (`isAreaObjectNamesVisible`,
menüde "Nesne adları"): kullanıcı için ikisi de nesnenin adı.

⚠️ Etiket kutusu hesabı `core/labelLeader.ts` → `getLabelRectCm`'de ORTAK
(mimari cihaz + alan nesnesi). Tesisatın `getElementLabelRectCm`'i hâlâ kendi
kopyası — fay sınırı yüzünden değil, dokunulmadığı için; oraya el atılırsa
buraya bağlanmalı.

**Yeni dosyalar:** core/pointSymbolLabel.ts · scene/PointSymbolNameLabels.tsx
