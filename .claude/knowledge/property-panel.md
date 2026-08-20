# convention: Özellik paneli — alan kümesi seçimden türer

**Panel seçime abone, nesneye değil.** `architectureUiStore.selection` ne
diyorsa panel onu gösterir; `getPropertySelectionKind` (`core/propertyFields.ts`)
seçimin türünü verir: `none` / `wall` / `opening` / `mixed`. Sayı değil TÜR
belirleyicidir — beş duvar da tek duvar da `wall`'dır, fark alanların tekil mi
toplu mu yazıldığındadır.

**Panel çizim alanının ÜSTÜNE biner, sağdan kayarak açılır/kapanır (K37).**
Eskiden (KK-12) EditorPage'de çizim alanının KARDEŞİYDİ — açılınca tuvali
daraltıyordu; kullanıcı geri bildirimiyle bu terk edildi, çünkü seçim
yapıldıkça canvas'ın kayması rahatsız ediciydi. Dış kabuk `EditorPage.tsx`'teki
`relative` satırın altında `absolute inset-y-0 right-0`, `translate-x-full` ↔
`translate-x-0` ile kayıyor (`transition-transform`).

**Kabuk PAYLAŞILIYOR: `ui/properties/PropertyPanelShell.tsx` (K93).** Mimari ve
tesisat panelleri ayrı bileşen (seçim store'ları ayrı) ama görünüm ve K37
davranışı tek yerde — iki kopya hâlindeyken dosya yorumunda "AYNI iskelet"
yazdığı hâlde sessizce ayrışıyorlardı. Kabuğun verdikleri: kaydırma,
`aria-hidden` + `inert`, kavis/kenarlık/gölge, başlık, Sil düğmesi. Mimarinin
grup dönüşümü eylemleri `actions` prop'undan giriyor.

**Panel artık tam boy ŞERİT değil, YÜZEN KART (K93):** üç kenardan 16px paylı,
`rounded-2xl`, kenarlıklı + gölgeli — yüzen çubukla (K54) aynı aile. Üst barın
şerit görünümü kalkınca (K90) sağ kenara yapışan blok kabuğun neresine ait
olduğu okunmayan bir yama hâline gelmişti.

⚠️ **Kaydırma panelin KENDİSİNDE değil bir SARMALAYICIDA.** Kenar boşluğu
sarmalayıcıda olduğu için `translate-x-full` paneli boşlukla birlikte götürür.
Boşluk panelin üstünde olsaydı kapalıyken kenardan boşluk kadar bir şerit
sızardı.

Panel koyu temada KOYU kalır (`surface`): içindeki form bileşenlerinin tamamı
kabuk token'larına bağlı. Üst bar beyaz kalıyor ama o ayrı yüzey — bkz.
[editor-shell](./editor-shell.md).

**Aç/kapa oku YOK, başlık düğme DEĞİL (K53).** Başlık içeriği katlayan bir
düğmeydi; kaldırıldı, artık düz `<h2>`. Panel zaten seçim varken açılıp seçim
bitince kapandığı için ikinci bir aç/kapa durumu kullanıcıya iki farklı "kapalı"
hâli öğretiyordu. Testler başlığı `getByRole('heading')` ile sorgular.

**Görünüm değişince panel kapanır (K53)** — kapanma SEÇİMİ BIRAKARAK yapılır,
paneli ayrıca gizleyerek değil: panel seçimin saf türevi, "kapalı ama seçim
duruyor" ikinci bir doğruluk kaynağı olurdu. ⚠️ Önceki görünüm bir ref'te
tutulur; yalnız bağımlılık dizisine güvenen effect MOUNT anında da seçimi siler
(ilk yazımda öyleydi, mevcut testler yakaladı). Tesisat panelinde de aynı kural
yazılı (`PlumbingPropertyPanel`, kendi store'uyla).

**Seçim yokken de DOM'da kalır ama erişilemez.** Animasyonun oynayabilmesi
için `kind === 'none'` artık `return null` DEMİYOR — `aria-hidden` +
`inert` + `pointer-events-none` ile hem ekran okuyuculardan hem
tıklama/tab sırasından çıkarılıyor. Eski "gizli panel odakta kalıyor"
riski böyle kapatıldı; DOM'da kalması küçük bir maliyet (boş `aside`),
KK-12'nin çözdüğü sorun (odaklanabilirlik) yine çözülü kalıyor.

## Ayrışan değer boş gösterilir

`getCommonNumber(values)` hepsi aynıysa değeri, ayrışıyorsa `undefined` döner.
Panel `undefined`'ı boş alan + "Farklı" placeholder olarak gösterir. Rastgele
birini yazmak, kullanıcıya dokunmadığı nesnelerin de o değerde olduğunu söyler.

## Yazım blur/Enter'da, her tuşta değil

`PropertyNumberField` taslak metni kendi state'inde tutar. Girdi doğrudan
store'dan beslenirse her tuş yeniden render eder ve rakamlar eski değerin üstüne
eklenir (90 + "100" → 90100). Desen `ui/OpeningToolOptions.tsx`'ten çıkarıldı.

**Reddedilen değer ekranda kalmaz.** `onCommit` `false` dönerse alan eski
değerine döner ve gerekçe gösterilir — yalan bir sayı bırakmak, kullanıcıya
uygulanmamış bir düzenlemeyi uygulanmış gibi gösterir.

## Toplu yazım TEK adımdır

`setWallsThickness(wallIds, cm)` / `setWallsHeight` bir producer'da çalışır: üç
duvar seçip kalınlık yazan kullanıcı tek Ctrl+Z'ye basar. Tek tek action
çağrılsaydı her duvar kendi `markDirty`'sini yazardı.

⚠️ **Kalınlık açıklık sığmasını etkiler.** Duvar kalınlığı köşe payını belirliyor
(`getPlacementRange`, K11): kalınlaşan duvar KOMŞUSUNDAKİ açıklığın aralığını
daraltır. Bu yüzden `setWallsThicknessInDraft` yazımdan sonra
`pruneOpeningsInDraft`'ı AYNI adımda çağırır (K16) — sonradan çalıştırılsaydı
sığmayan açıklık ayrı bir Ctrl+Z adımında düşerdi. Yükseklikte bu gerekmez.

## Kenar ↔ merkez çevrimi (K-3)

Model açıklığın MERKEZİNİ tutar (`offsetCm`, K10), panel KENARI gösterir:
mühendis "duvar başından X cm" derken açıklığın yakın kenarını kastediyor.
Çevrim `core/opening.ts` → `toEdgeOffsetCm` / `toCenterOffsetCm`, tek yerde.
Serileştirme şu an hâlâ merkezi yazıyor; K-3'ün serialize yarısı model
sözleşmesi işine bağlı (bkz. [webcad-json-format](./webcad-json-format.md)).

## Bugün düzenlenemeyen alanlar

- **Duvar uzunluğu salt okunur.** Değiştirmek p2 köşesini oynatmak demek ve o
  köşe komşu duvarlarla PAYLAŞILIYOR — tek alandan yazmak komşuyu da sürükler.
  Düzenlenebilir uzunluk duvar altyapısı tarafının işi.
- **Bölüm aralığı yok** — K-2 kararına bağlı, KK-7/KK-8 ile gelecek.
- **Açıklıkta yükseklik/yükselti yok** — `Opening` bu alanları TAŞIMIYOR
  (model.ts). Doküman istiyor; model sözleşmesi değişmeden panele eklenmez.
- **Çoklu açıklıkta konum salt okunur**: iki açıklığa aynı offset yazmak onları
  üst üste bindirmeye çalışmaktır, ikincisi zaten reddedilirdi.

**Dosya:** core/propertyFields.ts · ui/PropertyPanel.tsx · pages/EditorPage.tsx ·
ui/properties/PropertyNumberField.tsx · ui/properties/WallProperties.tsx ·
ui/properties/OpeningProperties.tsx · store/architecturePropertyOps.ts

## Seçim alanı native `<select>` DEĞİL (K118)

`PropertySelectField` özel bir listbox: native select'te açılır listenin YÖNÜNÜ
tarayıcı seçiyor ve uzun listelerde (mahal kullanım tipi, 15 seçenek) yukarı
açılıp garip görünüyordu. CSS'le kontrol edilebilen bir şey değil.

- Liste **HER ZAMAN aşağı** açılır; yer yetmezse kısalır ve içi kayar. "Yer
  yoksa yukarı aç" bilerek YOK — şikâyetin kendisi öngörülemez yöndü.
- **Portal ile `body`'ye** çiziliyor: panelin içerik alanı `overflow-y-auto`,
  mutlak konumlanan kutu orada kırpılırdı. `position: fixed`, kaydırma/boyut
  değişiminde KAPANIR.
- ⚠️ Konum **emir kipiyle** yazılıyor (`useLayoutEffect` + `.style.top`), JSX
  inline stiliyle değil — çalışma zamanı pikseli Tailwind'le ifade edilemez ve
  inline stil yasak (sahnedeki `domElement.style.cursor` ile aynı kaçış).
- ⚠️ Seçenek **`pointerdown`** ile commit ediliyor: dışarı-tık dinleyicisi de
  pointerdown'da ve click'ten önce çalışıp listeyi kapatıyordu.
- Testlerde `user.selectOptions` ÇALIŞMAZ; `click` + `getByRole('option')`.
