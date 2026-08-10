# decision: "Katlar" penceresi taslak üzerinde çalışır, store'a yalnız Uygula yazar

**Karar:** `FloorManagementDialog` düzenlemeleri doğrudan store'a yazmaz. Pencere
açılırken `createFloorPlanDraft` ile yerel bir `FloorPlanDraft` kurulur; ekleme,
silme, ad, yükseklik, sıra ve aktif kat değişikliği orada birikir. Store'a tek
yazım `applyFloorPlan` ile "Uygula"da olur, "İptal" taslağı atar (madde 13).

**Neden üç kazanç:**

1. **"İptal" bedava.** Pencere doğrudan yazsaydı iptal bir geri alma yığını
   gerektirirdi ve kullanıcı iptal edene kadar çizim ekranı yarım bir kat
   yapısını gösterirdi.
2. **KK-20 bedava.** Uygula TEK `set` çağrısı → geçmişe TEK adım → ekleme,
   silme ve yeniden adlandırma birlikte tek Ctrl+Z ile geri gelir. Ayrı bir
   işlem gruplama mekanizması yazmaya gerek kalmadı.
3. **Kot anında.** Özet alanı ve kot sütunu taslaktan besleniyor, bu yüzden bir
   yükseklik değişince "Uygula" beklemeden güncelleniyor (KK-2, KK-4).

## Geçici id NEGATİF

Taslakta eklenen katın id'si negatiftir (`isDraftFloorId`). Gerçek id
`nextUniqueId` sayacından ancak `applyFloorPlan` içinde alınır: taslakta
alınsaydı **iptal edilen her pencere sayacı ilerletir** ve kaydedilen JSON'da
açıklanamayan id boşlukları bırakırdı (bkz. [id-scheme](./id-scheme.md) — id bir
kez üretilir). Negatif id store'a ASLA ulaşmaz.

Kopyalanarak eklenen kat (`copyFromFloorId`) da içeriğini Uygula'da alır. Kaynak
aynı pencerede silinmiş olabilir; o durumda kat sessizce BOŞ açılır — kopyalama
kaynağı olmayan bir kat için hata göstermek kullanıcıya kendi sildiği katı
hatırlatmaktan başka bir şey yapmaz.

## Doğrulama İKİ yerde

`applyFloorPlan` planı yeniden doğrular (`isPlanValid`: en az bir kat, benzersiz
ve boş olmayan ad, 200–600 cm, bodrum/normal ayrımı, 40/5 tavanları). Pencere tek
çağıran olsa da store'un değişmezleri pencerenin doğru davranmasına bırakılmaz.
Reddedilen planda hiçbir şey değişmez, id bile harcanmaz.

## Kat silme temizliği iki yoldan paylaşılır

`removeFloorContentInDraft` `removeFloorFromDraft`'tan ayrıldı: kat kaydını
silmeden yalnız ÇİZİMİ temizliyor. `applyFloorPlan` kat listesini baştan
kurduğu için kaydı kendi yazıyor, ama temizliği aynı fonksiyondan geçiriyor —
iki ayrı temizlik yazılsaydı biri (yine) bir diziyi atlar ve sahipsiz duvar
bırakırdı, bkz. [floor-ordering](./floor-ordering.md) uyarısı.

## İçerik rozeti anlık türetilir

`core/floorContent.ts` katta mimari/tesisat var mı sorusunu her gösterimde
veriden hesaplar; kaydedilen bir "doluluk" alanı çizim değiştikçe ayrışırdı.
Mimari sayımına **nokta havuzu da** giriyor: yalnız duvara bakmak, henüz
kapanmamış bir çizimi "boş" gösterirdi.

**Dosya:** core/floorPlan.ts + core/floorContent.ts (saf) · store/floorPlanOps.ts
(action) · ui/FloorManagementDialog.tsx · ui/floors/
