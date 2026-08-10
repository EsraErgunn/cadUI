# convention: Özellik paneli — alan kümesi seçimden türer

**Panel seçime abone, nesneye değil.** `architectureUiStore.selection` ne
diyorsa panel onu gösterir; `getPropertySelectionKind` (`core/propertyFields.ts`)
seçimin türünü verir: `none` / `wall` / `opening` / `mixed`. Sayı değil TÜR
belirleyicidir — beş duvar da tek duvar da `wall`'dır, fark alanların tekil mi
toplu mu yazıldığındadır.

**Seçim yokken panel hiç RENDER EDİLMEZ** (`w-0` bir kabuk bırakılmaz):
kapalıyken DOM üretmemek "gizli panel odakta kalıyor" sınıfı hataları baştan
keser. EditorPage'de çizim alanının KARDEŞİDİR — açılınca tuvali daraltır,
üzerine binmez.

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

**Dosya:** core/propertyFields.ts · ui/PropertyPanel.tsx ·
ui/properties/PropertyNumberField.tsx · ui/properties/WallProperties.tsx ·
ui/properties/OpeningProperties.tsx · store/architecturePropertyOps.ts
