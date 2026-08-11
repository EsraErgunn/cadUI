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

**⚠️ "Hedef kat BOŞ olmalı" kuralı KALKTI** (2026-08, talep madde 18). Eskiden
`isFloorEmpty` dolu hedefi reddediyordu; gerekçe "üzerine yazmak kullanıcının
çizimini sessizce siler"di. Talep bunu kullanıcının KARARINA çevirdi:

- **Üzerine yaz** (varsayılan) — hedefteki AYNI TÜRDEN çizim silinip kaynağınki
  yazılır. Sessiz değil: hangi katların çiziminin gideceği pencerede adlarıyla
  uyarı olarak çıkar ve işlem tek Ctrl+Z ile geri alınır.
- **Bu katları atla** — çakışan hedefler işlem dışında kalır.

"Aynı türden" önemli: yalnız mimari kopyalanırken hedefteki tesisata
DOKUNULMAZ. Bu yüzden `removeFloorContentInDraft` ikiye ayrıldı
(`removeFloorArchitectureInDraft` / `removeFloorInstallationInDraft`).

`cloneFloorContentInDraft` artık hedefin boş olduğunu DENETLEMEZ — çağıran ya
yeni (boş) bir kata yazıyor ya da hedefi zaten temizlemiş oluyor. Denetim orada
kalsaydı "yalnız tesisat kopyala" mimarisi olan bir hedefte sebepsiz
reddedilirdi.

Çakışma = hedefte içerik olması DEĞİL, **kopyalanan türden** içerik olması
(`core/floorCopyPlan.ts`). Bu ayrım olmasa yalnız mimari kopyalarken tesisatı
olan bir kat boş yere "üzerine yazılacak" diye uyarılırdı.

Bütün hedefler TEK `set` çağrısında işlenir: kat başına ayrı action olsaydı üç
kata kopyalama üç Ctrl+Z isterdi (madde 19).

**Mimari ve tesisat ayrı seçilir** (KK-14): ikisi tek küme olsaydı "yalnız
mimariyi kopyala" imkânsız olurdu.

**Dosya:** core/floorClone.ts (saf, `takeId` çağrıdan gelir — core store tanımaz) ·
store/floorCloneOps.ts · ui/FloorCopyDialog.tsx
