# gotcha: Kat kopyalama (floorClone)

**Sorun:** Naif derin kopya (JSON.parse(JSON.stringify)) referansları kaynak
katın id'lerine bırakır ve HATA VERMEZ. Alt kattaki duvar taşınınca üst kattaki
kapı da oynar.

**Doğru:** İki geçiş. (1) her nesneye eskiId→yeniId haritası. (2) her referans
alanını haritadan geçir; haritada yoksa HATA FIRLAT (assertion).

**Ayrıca:** Kolon (Riser) klonlanmaz, toFloorId uzatılır. Klonlanırsa metraj
izometrikte ve BOM'da iki katına çıkar. Sahipsiz Point'leri temizle.

## Remap edilen alanların TAM listesi (uygulandı)

| Nesne | Remap | Not |
|---|---|---|
| `Point` | — | yalnız `floorId` hedefe çevrilir |
| `Wall` | `p1Id`, `p2Id` | köşeler ÖNCE üretilir |
| `Opening` | `wallId` | `floorId` taşımaz, katı duvarından türer |
| `Room` | `wallIds[]` | `floorId` taşımaz, kimliği duvar kümesi (K31) |
| `PointSymbol` | — | kimseye bağlı değil; **etiket YENİDEN üretilir** |

Sembolün etiketi taşınsaydı iki katta "P-01" olurdu. Çakışma kuralı kat içinde
tanımlı (KK-10) olduğu için bu sessizce geçerdi — ama kullanıcı iki farklı katta
aynı adı görürdü.

**Hedef kat BOŞ olmalı** (`isFloorEmpty`). Üzerine yazmak kullanıcının çizimini
sessizce siler, birleştirmek iki kopuk çizim üretir. Diyalog hedef listesinde
yalnız boş katları gösterir — seçtirip sonra reddetmek kullanıcıyı sebebini
aramaya bırakırdı.

**Mimari ve tesisat ayrı seçilir** (KK-14): ikisi tek küme olsaydı "yalnız
mimariyi kopyala" imkânsız olurdu.

**Dosya:** core/floorClone.ts (saf, `takeId` çağrıdan gelir — core store tanımaz) ·
store/floorCloneOps.ts · ui/FloorCopyDialog.tsx
