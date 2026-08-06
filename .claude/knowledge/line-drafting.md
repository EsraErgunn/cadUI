# decision + gotcha: Hat çizimi (boru / branşman)

## Taslak kalıcı state'e girmez

Devam eden hat `plumbingUiStore.draftLine`'da yaşar, `cadStore`'a ancak
tamamlanınca **tek** `addLine` çağrısıyla girer. Hat + her nokta + her segment id'si
o tek `set()` içinde `takeNextId` ile üretilir → tek `markDirty`, tek Ctrl+Z.
Her tıkta store'a yazılsaydı yarım çizim hem kaydedilir hem geçmişi tıklama sayısı
kadar adımla doldururdu (duvar aracı bilerek farklı çalışıyor: orada her segment
anında yazılır çünkü duvar zinciri mevcut geometriye bağlanabiliyor).

`addLine` 2 noktadan azını **reddeder**; taslak yine de temizlenir.

## Jestler (şartname)

| Jest | Sonuç | Araç sonrası |
|---|---|---|
| Sol tık | Nokta ekler (port snap > ızgara snap) | aktif kalır |
| Sol tık **boş bir porta** | Hat orada BİTER + bağlantı kaydı | **aktif kalır** |
| Tek sağ tık | Son noktayı geri alır (nokta yoksa etkisiz) | aktif kalır |
| Çift sağ tık | Hattı bitirir | Seçim aracına döner |
| Esc | Yarım hattın TAMAMINI iptal eder, hiçbir şey kaydedilmez | aktif kalır |

Tek/çift ayrımı saf fonksiyonda: `core/pointerGestures.ts` → `resolveRightClick`.
İlk sağ tık kararı `DOUBLE_CLICK_WINDOW_MS` (300 ms) erteler; pencere içinde ikinci
tık gelirse "bitir", gelmezse "geri al". `setTimeout` hook'ta kalır, karar saf
fonksiyonda — yoksa jest ancak elle denenerek doğrulanabilirdi (Risk R6).

Sınır anı (tam 300 ms) gerçek akışta zamanlayıcıyla yarışır; testte saf fonksiyon
doğrudan sınanır, zamanlayıcılı akış üzerinden değil.

`contextmenu`'yü `DrawSurface` yakalayıp `preventDefault` ediyor — araç hook'unda
ikinci kez yakalanmaz.

`useEscapeToSelectionTool` polyline araçlarını **atlar**: hat aracında Esc taslağı
siler ama araçtan çıkmaz. Yerleştirme araçlarında davranış eskisi gibi.

> 2026-08'de kısa süre "tek sağ tık bitirir, Esc son noktada bitirir" denendi ve
> şartname metni gelince **geri alındı**. Değiştirmeden önce şartnameye bak.

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

## Önizleme yerleşmiş hattın AYNISI çizilir

Renk ve kalınlık `scene/lineStyle.ts`'ten, ikisi de aynı fonksiyondan gelir.
Yerleşmiş hat da önizleme de **tek bileşenden** (`PipeLine`) geçer — ayrı ayrı
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

Bugün YOK: hat sürükleme, köşe düzenleme, çerçeveyle hat seçme, hat kopyalama.

## Açılmayan alanlar

- `InstallationLineSegment.isInsulated` **yok**: izolasyon segment boolean'ı değil
  kendi nesnesidir (K-W4, Aşama 8).
- Ortogonal (yatay/dikey) kısıt bu aşamada **yok**; CLAUDE.md'deki "borular
  duvarlara paralel" ürün kuralı henüz koda girmedi.
- Porta yakalanma ve uç bağlantısı Aşama 6'da.
