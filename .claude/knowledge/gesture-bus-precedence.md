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

**Hover aynı sırayı izler.** `resolveArchitectureHover` de köşeyi duvardan önce
verir — vurgu kullanıcıya "basarsam neyi tutarım"ı gösteriyor, jest önceliğinden
farklı cevap verirse yanıltır. Sürükleme sırasında hover dondurulur:
`usePointDragTool` sürüklenen köşeyi snap'ten hariç tuttuğu için hover başka bir
köşeye atlar ve taşınmayan köşe yanmış görünür.

**Dosya:** scene/useOpeningTool.ts, scene/usePointDragTool.ts,
scene/useArchitectureHover.ts, scene/drawSurfaceEvents.ts (yayın),
core/snap.ts (`findCornerPointIdAt` — ortak koşul),
core/openingTool.ts (`isCornerHandleAtPoint`),
core/architectureHover.ts (`resolveArchitectureHover`).
