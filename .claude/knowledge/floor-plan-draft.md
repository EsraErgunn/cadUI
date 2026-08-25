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

## K166: kopyalama da taslakta bekler, silme onay sormaz

Pencere ikiye bölünmüştü ve kopyalama AYRI bir modaldı; açılırken bekleyen
taslağı sessizce store'a uyguluyordu (`openCopyDialog`), yani "İptal" o noktadan
sonra hiçbir şeyi iptal etmiyordu. Kopyalama artık aynı pencerenin bir KİPİ.

`DraftFloor.copyFromFloorId` → **`DraftFloor.pendingCopy`**:

```ts
type DraftFloorCopy = {
  sourceFloorId: Id
  isArchitectureIncluded: boolean
  isInstallationIncluded: boolean
}
```

Alan hem YENİ kat "X'tan kopyalayarak" eklendiğinde hem MEVCUT bir kat hedef
seçildiğinde kullanılıyor — iki yol tek kavrama indi. Mekanizma yeni değil,
ertelenmiş kopyalama zaten vardı; yalnız kapsamı genişledi.

⚠️ **Kip (`overwrite`/`skip`) taslakta SAKLANMAZ.** Kip hedef listesini süzen bir
karar; taslakta duran şey kipin SONUCU, yani gerçekten kopyalanacak katlar.

⚠️ **`copyFloorToTargets` action'ı SİLİNDİ** — bu adla kod yazma. Ayrı bir action
iki `set` çağrısı, dolayısıyla iki Ctrl+Z demekti; tek yazım `applyFloorPlan`.

⚠️ **Kopyalama fazı ÜÇ ADIM** (`applyFloorCopiesInDraft`): önce bütün kaynaklar
OKUNUR, sonra hedefler SİLİNİR, sonra YAZILIR. Aynı Uygula içinde bir kat hem
kaynak hem hedef olabiliyor; hedef başına "sil sonra klonla" döngüsü kurulsaydı
sonuç katların LİSTE SIRASINA bağlı çıkardı. Klonlama saf okuma olduğu için
fazlara ayrılabiliyor.

⚠️ **`planFloorCopy` ham store dizisi değil FONKSİYON alır** (`FloorContentLookup`):
pencere taslak üzerinde çalışıyor ve bir katın içeriği "store'da ne var"dan
ibaret değil — aynı oturumda eklenmiş ya da kopyalama hedefi yapılmış olabilir.
Store tarafı için köprü `toFloorContentLookup`.

### Silme ONAY SORMAZ, geri alınır

Onay penceresi kalktı: dokunulan şey store değil taslak, Uygula'ya kadar hiçbir
şey yazılmıyor ve "İptal" zaten hepsini atıyor. Yerine pencerenin **kendi geri
al/yinele yığını** geldi (`useFloorPlanDraft`).

- Zundo KULLANILMAZ: o store'un geçmişi, pencere store'a hiç yazmıyor. Taslak
  zaten değişmez bir nesne, `{past, present, future}` yeterli.
- ⚠️ **Seçim geçmişe yazılmaz** (`setDraftQuietly`): bir düzenleme değil, neye
  bakıldığı. Yığına girseydi Ctrl+Z önce seçim adımlarını geri sarardı.
- ⚠️ Ctrl+Z/Ctrl+Y dinleyicisi **yakalama fazında**: editörün kısayolu da
  window'da ve baloncuk fazında, durdurulmasaydı aynı tuş iki geçmişi birden
  oynatırdı.
- `core/floorDeletion.ts`, `FloorDeleteDialog`, `floorCountText` SİLİNDİ.

### Toplu ekleme kısmi UYGULANMAZ

`addDraftFloors(draft, input, count)` istenen sayı tavana sığmıyorsa taslağı
AYNEN döndürür. Sessizce 10 yerine 4 kat eklemek kullanıcının saymadığı bir
sonuç doğururdu; kalan kapasiteyi `getAddableFloorCount` söylüyor ve arayüz
alanın yanında yazıyor.

Yeni kat yüksekliği ALTINDAKİ kattan devralınır; ayrı "yeni kat yüksekliği"
alanı ve onun feragat cümlesi kalktı.

## K167: kat adı KONUMDAN türer

Ad kullanıcının yazdığı bir şey değil, bulunduğu sıranın karşılığı
(`getPositionalFloorNames`). Katlar yer değiştirince adlar YERİNDE kalır,
taşınan şey içeriktir — "kim hangi kattaysa o ismi alır".

⚠️ `renameDraftFloor` SİLİNDİ, bu adla kod yazma. Satırdaki ad alanı da kalktı.

⚠️ Adlar yalnız YAPISAL değişimden sonra tazelenir (`withRenumberedFloors`:
ekleme, silme, sıralama; ayrıca hook'taki `moveByKey`). Yükseklik ve aktif kat
sırayı bozmadığı için oralarda çağrılmaz.

⚠️ `createFloorPlanDraft` de normalleştirir: eski projede elle konmuş bir ad
olabilir ve pencere yürürlükteki kuralı göstermeli. Store'a yazan yine yalnız
"Uygula" — pencereyi açıp İptal demek hiçbir şeyi değiştirmez.

⚠️ **JSON DEĞİŞMEDİ.** `Floor.name` modelde ve kayıtta duruyor, yalnız değeri
türetiliyor.

## Silme onayı: yalnız DOLU katta, satırın içinde

K166 silmeyi tümüyle onaysız yapmıştı; kullanıcı "uygula demeden uygulanmasa da
yanlış bir şey yapıyormuş gibi hissettim" dedi. Onay geri geldi ama YALNIZ
çizimi olan katta ve ayrı bir pencere olarak değil, satırın içinde
(`FloorRowActions`). Boş katta soracak bir şey yok.

⚠️ Satırdaki iptal düğmesi **"Vazgeç"**: alt bardaki "İptal" bütün oturumu
atıyor, iki farklı anlam aynı kelimeyi taşımamalı.

⚠️ Onaydaki "Sil" `chromeButtonVariants` KULLANMAZ: `plain` tonundaki
`hover:bg-surface-sunken` kırmızı dolgunun üstüne binip düğmeyi koyu temada
yüzeye gömüyordu. Hover için `--color-danger-strong` token'ı eklendi.

## Toplu kopyalama yalnız TEK seçimde

Kaynak tanımı gereği tek bir kat. Çok seçimde `selectedIds[0]` alınıp gerisi
sessizce yutuluyordu; düğme artık `selectedIds.length === 1` iken çiziliyor.
Toplu silme her seçim sayısında çalışır.

## K168: kat tipleri — dubleks / çatı katı / asma kat

Üçü de YALNIZ BİR AD; davranış, yükseklik, çizim değişmiyor.

⚠️ Tip AYRI ALANDA saklanmaz, `Floor.name`in kendisidir (`getFloorType` addan
okur). Modele alan eklemek JSON şemasını değiştirirdi. Yeni bir tip adı
eklenecekse konumsal adlarla çakışmadığı doğrulanmalı.

| Tip | Nereye | Ad | Şerit |
|---|---|---|---|
| duplex | en üst kat | `Dubleks` | `D` |
| penthouse | en üst kat | `Çatı Katı` | `Ç` |
| mezzanine | zemin/bodrum dışı her kat | `Asma Kat (Zemin)` | `A` |

⚠️ **Asma kat numara TÜKETMEZ** ve **kat sayısını BİR ARTIRIR**: dönüştürülen kat
çizimiyle kendini korur, üstüne onun adını devralan YENİ boş kat girer.
`Zemin / 1. Kat / 2. Kat` → `Zemin / Asma Kat (Zemin) / 1. Kat / 2. Kat`.
Dubleks/çatı katı kat eklemez.

⚠️ Bu yüzden `withFloorType` (saf adlandırma, core/floors.ts) ile
`setDraftFloorType` (kat EKLEYEBİLİR, core/floorPlan.ts) ayrı: id üretmek
taslağın işi.

⚠️ Asma kat SINIRSIZ ve üst üste gelebilir; üst üste olanlar numaralanır
(`Asma Kat (Zemin)`, `2. Asma Kat (Zemin)`) — `Bodrum Kat / 2. Bodrum Kat`
düzeninin aynısı, adlar benzersiz kalır.

⚠️ Tip yalnız o konumda GEÇERLİYSE korunur; çatı katı aşağı taşınırsa konumsal
adına döner. Tip kaldırmak kat SİLMEZ — eklenen kata bu arada çizim yapılmış
olabilir.

⚠️ Adların TEK kaynağı `resolveFloorNames`, aşağıdan yukarı tek geçiş: asma
katın adı alt komşusundan okunduğu için sıra zorunlu.
