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
Köşe → açıklık → duvar, yani ekranda üstte durandan alta
(HANDLE_ELEVATION_CM > RENDER_ORDER.opening > wall). Hem vurgu hem duvar jesti
bunu okur; ayrı hesaplasalardı vurgu "şunu tutarsın" der, basış başkasını tutardı.

Duvar en ALTTAKİ nesne: `useWallSelectionTool` hedef 'wall' değilse jesti hiç
başlatmaz. Yeni bir tüketici eklenirse aynı fonksiyonu okumalı — kendi
`findWallUnderPoint`/`resolveSnap` çağrısını yazmamalı.

Sürükleme sırasında hover dondurulur (köşe ve duvar sürüklemesi için ayrı ayrı):
`usePointDragTool` sürüklenen köşeyi snap'ten hariç tuttuğu için hover başka bir
köşeye atlar ve taşınmayan köşe yanmış görünür.

**Seçim karşılıklı dışlamalı, ama iki alanda:** `selectedWallId` ve
`selectedOpeningId`. Çelişmemelerinin sebebi her iki tarafın da kendi jesti
sahiplenmediğinde ötekini bırakması — duvara basınca `useOpeningTool` açıklık
seçimini, açıklığa/köşeye basınca `useWallSelectionTool` duvar seçimini temizler.
Yeni bir seçilebilir nesne eklenirse bu el sıkışmayı bozmadan ekleyin ya da
TODO(fay-B2)'deki birleşik seçime geçin.

**Dosya:** scene/useOpeningTool.ts, scene/usePointDragTool.ts,
scene/useWallSelectionTool.ts, scene/useArchitectureHover.ts,
scene/drawSurfaceEvents.ts (yayın),
core/snap.ts (`findCornerPointIdAt` — ortak köşe koşulu),
core/openingTool.ts (`isCornerHandleAtPoint`),
core/architectureHover.ts (`resolveArchitectureTarget` — ortak öncelik sırası).
