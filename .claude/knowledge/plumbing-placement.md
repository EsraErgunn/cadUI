# Eleman yerleştirme jesti: pointer UP

Palet iki giriş yolu vaat ediyor: (a) araca tıkla → tuvale tıkla, (b) palet
butonundan tuvale sürükle-bırak. İkisi **tek kod yolu** ile karşılanıyor:
yerleştirme `onPointerUp`'ta yapılır (`plumbing/scene/usePlacementTool.ts`).

- (a)'da down+up tuvalde, (b)'de down butonda / up tuvalde — her ikisinde de
  tuvale bir pointerup düşer. Yerleştirme `onPointerDown`'da olsaydı (a) için
  ayrıca "bu jest zaten yerleştirdi" bayrağı tutmak gerekirdi, yoksa aynı
  tıklama iki eleman eklerdi.
- `PlumbingToolbar` butonda **pointerdown**'da aracı etkinleştirir (click'te
  değil): sürükleme başlarken araç aktif olmazsa önizleme hiç görünmez.
  Dokunmatikte örtük pointer capture `releasePointerCapture` ile bırakılır,
  yoksa parmak tuvale gittiğinde olaylar butonda kalır.
- `@dnd-kit` bu iş için KULLANILMADI: DOM droppable'ı `<Canvas>` içine dünya
  koordinatı taşımıyor, önizleme yine sahnede çizilecekti.

Yerleştirmeden sonra araç **Seçim aracına döner** (kullanıcı isteği, 2026-08):
bir sembol konunca jest bitmiştir, art arda ikinci bir sembol koymak istisna —
konanı hemen seçip taşımak/düzenlemek kuraldır. Eskiden araç aktif kalıyordu.
Aracı ZATEN değiştiren yerleştirmeler (servis kutusu ve sayaç boru çizimini
kendiliğinden başlatır, `startPipeAfterPlacement.ts`) bundan etkilenmez:
dönüş yalnız araç hâlâ o yerleştirme aracıysa yapılır.

Bırakma noktası aktif zoom'un **ince** ızgara adımına oturur
(`plumbing/core/placement.ts` → `pickGridLevel(zoom).minorCm`): kullanıcı ekranda
gördüğü çizgiye bırakır. Sabit adım kullanılsaydı uzaklaşınca snap görünmez olurdu.

Önizleme konumu `useRef` + `useFrame` ile doğrudan object3D'ye yazılır; her
pointermove'da React render'ı tetiklenmez. Önizleme material'i symbolLoader'ın
PAYLAŞILAN material'inin klonudur (saydamlık orijinaline yazılamaz) ve unmount'ta
`dispose()` edilir.
