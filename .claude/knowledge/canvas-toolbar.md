# Tuval üstündeki yüzen çubuk (K54)

`[Seç | El] [Geri | Yinele] [↓ | Kat | ↑] [Snap] [Görünüm ▾]`, çizim alanının
alt-ortasında. **İki ÇİZİM görünümünde de** mount edilir (K57); izometrikte yok.

## Görünüme göre dallanma (K57)

Ortak: Seç, El, Geri/Yinele, Kat. İkisi de aynı altyapıya bağlı olduğu için
tesisata açmak ek iş gerektirmedi — `DrawSurface`/`useViewportControls` iki
görünümde de mount ediliyor, `cadStore` zaten ortak.

Seçim aracı SABİTLER üzerinden okunur (`SELECTION_TOOL_ID` /
`INSTALLATION_SELECTION_TOOL_ID`); bugün ikisi de `'selection'` ama biri
değişirse çubuk sessizce şaşmasın.

⚠️ **Snap düğmesi tesisatta YOK.** Tesisatın yakalaması ızgara GÖRÜNÜRLÜĞÜNE
bağlı (`plumbing/scene/placementSnap.ts` → `if (!isGridVisible) return`),
mimarinin `isGridSnapEnabled`'ı ise ayrı anahtar. Aynı düğme iki görünümde
farklı şey ifade ederdi. Karar C fayında; verilince `placementSnap`
`isGridSnapActive`'e geçer ve `isArchitecture` koşulu kalkar.

## Sınır

Çubuk nesne ÖZELLİĞİ düzenlemez — o sağ panelin işi (K37/K53). Buradakiler
tuvalin ÇALIŞMA KİPİ ve çizim yardımcıları. İkisi karışırsa kullanıcı aynı
ayarı iki yerde arar.

## El (pan) modu

`uiStore.isPanModeActive`. Palete GİRMEDİ (kullanıcı seçti): `core/tools.ts`
issue 2.7'nin çizim paleti, el bir çizim aracı değil.

⚠️ **Space'in yapışkan hâli olarak uygulandı**: `DrawSurface`'in yayın
bastırması ve `useViewportControls`'un pan kavraması AYNI koşula bakıyor.
İkinci bir pan uygulaması yazma.

⚠️ İmleç için `useUiStore.subscribe(updateCursor)` gerekti — mod düğmeyle
değişiyor, jestle değil; abonelik olmasa imleç fare oynayana kadar eski kalır.

Bir çizim aracı seçmek el modundan otomatik çıkarır (`setActiveTool`).

## Snap anahtarı

⚠️ **Yalnız IZGARA yakalamasını kapatır.** Uç/köşe/duvar yakalaması
etkilenmez: kapansaydı duvarlar köşede birleşmez, oda çevrimi kapanmaz, mahal
tespiti çalışmazdı (kullanıcı kararı).

Karar TEK yerde: `scene/gridSnapMode.ts` → `isGridSnapActive(event)` =
`isGridSnapEnabled && !ctrlKey`. Ctrl anlık kapatma olarak ÜSTE biner.
Beş araç hook'u bunu çağırır; yeni bir araç eklerken de bu çağrılmalı — kendi
`!event.ctrlKey`'ini yazan araçta anahtar sessizce etkisiz kalır.

## Görünüm açılırı

Maddeler PROPS ile gelir, bileşene gömülü değil: ölçü/açı/isim anahtarları
kendi aşamalarında eklenir, bileşen değişmez. `MenuDropdown` kullanılmaz — o
`MenuDefinition` sözleşmesine (menü çubuğunun grup/kısayol yapısı) bağlı.

Ölü anahtar bırakılmaz: bir madde ancak onu tüketen çizim hazırken eklenir.

Bugünkü maddeler: `Nesne adları` · `Oda adları` · `Izgara` (K56). İkisi de
varsayılan AÇIK — etiketler bugüne kadar hep görünüyordu, anahtar davranışı
değiştirmemeli.

⚠️ **Bir etiketi gizlerken TUTMA sınavını da sustur.** `findAreaObjectLabelAt`
anahtarı okur; yalnız çizim durdurulsaydı görünmeyen etiketin tutma kutusu
yerinde kalır ve kullanıcı "boşluğa bastım ama seçim olmadı" derdi. Tesisatta
`pickElementLabelAt` aynı gerekçeyle `isElementLabelsVisible`'a bakıyor.

⚠️ Oda ADI ile ALANI (m²) tek anahtar: aynı çapaya yazılmış tek öbek. Ad
DÜZENLEME kutusu anahtardan etkilenmez — yazan kullanıcı yazdığını görmeli.

## Kat seçici (K55)

Sol üstteki `FloorStrip` KALDIRILDI; işini çubuktaki açılır devraldı. ↓/↑
oklarının karşılamadığı iki şey oradan taşındı: **katların tam listesi** (uzak
kata tek adımda gitmek) ve **boş kat işareti** (içi boş halka).

Sıra ALTTAN ÜSTE = store dizisinin kendi sırası. "Katlar" penceresi ters
çevirir (bina kesitten okunuyor) — iki yön bilerek farklı.

`floors/floorVariants.ts` duruyor: kat pencereleri `FLOOR_FOCUS_RING`'i
kullanmaya devam ediyor.

## Stil

Vurgu SEÇİM rengi, marka sarısı DEĞİL (`ui/canvas/canvasBarVariants.ts`) —
çubuk çizim alanının üstünde ve marka sarısı oraya giremez. Menü çubuğunun
`chromeButtonVariants`'ı bu yüzden yeniden kullanılmadı.

Sarmalayıcı `pointer-events-none`, çubuğun kendisi `pointer-events-auto`:
çubuğun iki yanındaki boşluk tuvale ait kalmalı (drei `<Html>` sarmalayıcısıyla
aynı tuzak, K45).
