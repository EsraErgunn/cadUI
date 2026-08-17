# gotcha: Tek jest yayını, birden çok araç hook'u

**Sorun:** `subscribeDrawSurface` bir `Set` — abone olan HER hook aynı
pointerdown'ı görür. Araçlar birbirini `activeToolId` ile eleyince sorun çıkmaz,
ama aynı araçta iki hook birden çalışıyorsa (Seçim Aracı'nda `usePointDragTool`
+ `useOpeningTool`) tek basış İKİ jest başlatır. Bırakma anında ikisi de kendi
store yazımını yapar → tek kullanıcı hareketi için iki `markDirty`, iki Ctrl+Z.
Hata sessizdir: ekranda her şey doğru görünür, yalnız geri alma iki basış ister.

**Doğru:** Çakışan hook'lardan biri açıkça geri çekilir; öncelik ekranda üstte
duran nesnenindir. Köşe tutamağı (`HANDLE_ELEVATION_CM`, en üstte) açıklıktan
önce gelir: `useOpeningTool` basış anında `isCornerHandleAtPoint` ile bakar ve
toleransta köşe varsa jesti hiç başlatmaz.

**Koşul TEK fonksiyonda:** `core/snap.ts` → `findCornerPointIdAt`. Önce iki ayrı
`resolveSnap` çağrısı vardı ve "aynı tutun" diye yazılıydı; hover üçüncü tüketici
olarak gelince koşul fonksiyona çıkarıldı — üç kopyayı elle eşit tutmak sürdürülebilir
değildi. `isCornerHandleAtPoint` (`core/openingTool.ts`) artık bunu sarıyor,
`resolveArchitectureHover` (`core/architectureHover.ts`) de aynısını çağırıyor.
Izgara hesaba katılmaz: sorulan tek şey "toleransta köşe var mı".
Eşitlik `core/__tests__/architectureHover.test.ts`'te sınanıyor (hover ile
açıklık tarafı aynı hedeflerde aynı cevabı vermeli).

**Abone olma sırasına güvenilmez.** "Önce köşe hook'u koşsun, o bayrak koysun"
çözümü kırılgan: sıra JSX içindeki mount sırasına bağlı (`ArchitectureLayer`'da
`Openings` `PointHandles`'tan ÖNCE mount oluyor, yani açıklık hook'u önce
koşuyor). Karar geometriyle verilir, sırayla değil.

**Yeni bir araç Seçim Aracı'na eklenirse** aynı soruyu sorması gerekir: bu basış
zaten başka birinin mi? Yoksa iki yazımlı geri alma geri gelir.

**Sıra TEK yerde: `core/architectureHover.ts` → `resolveArchitectureTarget`.**
Köşe → sembol → açıklık → duvar, yani ekranda üstte durandan alta
(HANDLE_ELEVATION_CM > RENDER_ORDER.opening > wall). Hem vurgu hem duvar jesti
bunu okur; ayrı hesaplasalardı vurgu "şunu tutarsın" der, basış başkasını tutardı.

Duvar en ALTTAKİ nesne: `useWallSelectionTool` hedef 'wall' değilse jesti hiç
başlatmaz. Yeni bir tüketici eklenirse aynı fonksiyonu okumalı — kendi
`findWallUnderPoint`/`resolveSnap` çağrısını yazmamalı.

Sürükleme sırasında hover dondurulur (köşe ve duvar sürüklemesi için ayrı ayrı):
`usePointDragTool` sürüklenen köşeyi snap'ten hariç tuttuğu için hover başka bir
köşeye atlar ve taşınmayan köşe yanmış görünür.

**Seçim TEK listede (KK-10).** Eskiden `selectedWallId` ve `selectedOpeningId`
diye iki alan vardı ve "ikisi aynı anda dolu olmasın" el sıkışması her yeni
seçilebilir nesnede yeniden kuruluyordu. Artık `architectureUiStore.selection`
tek doğruluk kaynağı: `{ kind, id }` ögelerinden oluşan bir liste
(`core/selection.ts`). Eski TODO(fay-B2) bununla kapandı.

Sonuçları:

- **Seçimi jesti sahiplenen yazar.** Duvara basınca `useWallSelectionTool`,
  açıklığa basınca `useOpeningTool`, boşluğa basınca `useSelectionTool` yazar.
  Hiçbiri "başkasının seçimini temizleme" işi yapmaz; temizleme boşluğa
  tıklamanın sonucudur.
- **Boşluk `useSelectionTool`'un.** `resolveArchitectureTarget` undefined
  dönerse jest onundur — çerçeve seçimi orada başlar. Diğer iki hook boşlukta
  artık hiçbir şey yapmaz (eskiden ikisi de seçimi temizliyordu; birleşik
  seçimde bu Shift ile çerçeve eklemeyi imkânsız kılardı).
- **Delete TEK dinleyicide.** Duvar ve açıklık hook'larındaki ayrı Delete
  kopyaları kaldırıldı: birleşik seçimde ikisi de koşsaydı aynı basış iki
  `markDirty` yazardı. Silme `cadStore.deleteSelection(selection)` ile tek
  producer'da yapılır → beş nesne seçip silen kullanıcı tek Ctrl+Z'ye basar.
- **Seçim otomatik budanır.** `useSelectionTool` cadStore'a abone: silinen nesne
  seçimde asılı kalırsa özellik paneli sahipsiz id ile boş açılır.
  `pruneSelection` değişiklik yoksa AYNI diziyi döndürür, kontrol referansla.

**Tıklama davranışı — dokümandan sapma, teyide açık.** Düz tıklama seçimi
DEĞİŞTİRİR, Shift+tıklama seçime ekler/çıkarır. KK-10'un harfi ("seçili bir
nesneye yeniden tıklandığında nesne seçimden çıkar") düz tıklamanın da toggle
olmasını okutabilir; öyle yapılsaydı çoklu seçimi taşımak için basılan ilk duvar
taşıma başlamadan seçimi bozardı ve zaten merge edilmiş duvar taşıma jesti
kırılırdı. Zaten seçili bir nesneye düz tıklama seçimi KORUR (daraltmaz) —
grup taşımanın ön koşulu.

**Dosya:** scene/useOpeningTool.ts, scene/usePointDragTool.ts,
scene/useWallSelectionTool.ts, scene/useArchitectureHover.ts,
scene/drawSurfaceEvents.ts (yayın),
core/snap.ts (`findCornerPointIdAt` — ortak köşe koşulu),
core/openingTool.ts (`isCornerHandleAtPoint`),
core/architectureHover.ts (`resolveArchitectureTarget` — ortak öncelik sırası).

## Sağ tık: aracı bırak (K84)

Kural TEK yerde — `scene/useRightClickReturnsToSelection.ts`, `ArchitectureLayer`
içinde bir kez mount ediliyor. KARA liste: davranış varsayılan, istisna eklemek
bilinçli bir iş. Araç başına kopyalansaydı yeni araçta unutulurdu.

İstisnalar:

- **Seçim aracı** — dönecek yer yok.
- **Duvar** — sağ tıkın orada zaten bir işi var (zinciri bitirmek), bu yüzden
  İKİ ADIMLI: zincir sürerken kapatır, boştayken çıkar (`useWallTool`). Tek
  adımda çıksaydı arka arkaya duvar çizmek imkânsızlaşırdı.

Araçların önizleme temizliği kendi hook'larında kalır; araç değişimi effect'i
zaten söküyor.

## Oda çizimi: tıkla–taşı–tıkla (K84)

`useRoomTool` basılı tutmalı sürüklemeyi BIRAKTI: ilk tık köşeyi koyar, imleç
karşı köşeyi taşır, ikinci tık yerleştirir. Basılı tutma büyük odalarda tuvalin
dışına taşıyordu. Duvar aracıyla aynı jest — kullanıcı hangisinde ne yapacağını
hatırlamak zorunda kalmasın.
