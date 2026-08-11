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

## Silme onayı taslağı SİLMEZ, onaylar

`FloorDeleteDialog` yalnız dökümü gösterip onay alır; silmeyi çağıran kendi
taslağına uygular. Pencere taslağı hiç tanımıyor — aynı bileşen ileride başka bir
silme yolundan da açılabilsin diye.

Döküm ve kot etkisi TASLAK listesine bakar, store'a değil: aynı pencerede
eklenmiş bir katı silmek de onay isteyebilmeli ve "en az bir kat kalmalı" kuralı
kullanıcının gördüğü listeye göre işlemeli.

Alan nesnesi (merdiven/kolon/baca şaftı) MİMARİ sayılır: hem `hasArchitecture`
hem `removeFloorArchitectureInDraft` onu kapsar — duvarı olmayan ama merdiveni
olan kat "boş" gösterilmemeli, ve yalnız tesisat kopyalanırken silinmemeli.

Sayım, kat silme temizliğiyle **aynı ölçütü** kullanır: açıklık ve oda `floorId`
taşımadığı için ikisi de DUVARINDAN türetilir (K9, K31). Kata göre süzülselerdi
gösterilen sayı silinenden şaşardı. "Boru bölümü" hat değil SEGMENT sayar —
kullanıcı kırıklı bir hattı tek boru saymıyor.

Kot etkisi iki kez hesaplanarak bulunuyor (önce/sonra): kot saklanmadığı için
başka yolu yok, ama asıl kazanç şu — birden çok kat farklı seviyelerden silinince
düşüş miktarı katlara göre DEĞİŞİR, tek bir "X m iner" cümlesi yanlış olurdu.

**Düşey eksen uyarısı (KK-13) BAĞLANDI.** Baca şaftı ve kolon havalandırması
`AreaObject` olarak modele girince (bkz. [area-objects](./area-objects.md))
uyarı yazıldı: iki tür AYRI sayılıyor çünkü uyarı ikisini adıyla söylüyor
(`flueShaftCount` / `columnVentilationCount`). Merdiven ve yapısal kolon aynı
tipte ama düşey eksende SÜRMEZ, uyarı üretmez.

⚠️ KK-19 (kopyalamada eksen kimliğinin korunması) hâlâ YAPILAMAZ: `AreaObject`
kat başına modellendi, katlar arası bir eksen kimliği YOK — ekip bunu bilinçli
olarak erteledi ("kat-bağımsız kimlik gerekirse ayrı karar"). Kopyalanan alan
nesnesi hedef katta aynı koordinatta doğuyor, yani geometrik olarak hizalı
kalıyor; korunan bir KİMLİK yok, hizayı sonradan bozan bir taşıma denetlenemez.

## İçerik rozeti anlık türetilir

`core/floorContent.ts` katta mimari/tesisat var mı sorusunu her gösterimde
veriden hesaplar; kaydedilen bir "doluluk" alanı çizim değiştikçe ayrışırdı.
Mimari sayımına **nokta havuzu da** giriyor: yalnız duvara bakmak, henüz
kapanmamış bir çizimi "boş" gösterirdi.

**Dosya:** core/floorPlan.ts + core/floorContent.ts (saf) · store/floorPlanOps.ts
(action) · ui/FloorManagementDialog.tsx · ui/floors/
