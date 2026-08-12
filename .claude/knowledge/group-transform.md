# decision: Grup dönüşümü — köşeler taşınır, açıklık kendiliğinden gelir

**Dönüşüm KÖŞELERE uygulanır.** Seçili duvarların `p1Id`/`p2Id` kümesi toplanır
(Set — bir köşeyi iki duvar paylaşabilir, öteleme iki kez uygulanmasın) ve
`applyTransform` her köşeye bir kez çalışır.

**Açıklık ayrıca taşınmaz.** Kendi koordinatını taşımıyor, duvarına `offsetCm`
ile bağlı (K9/K10) — duvar nereye giderse oraya gider. Aynalamada bile `offsetCm`
p1'den ölçüldüğü için açıklık duvarın aynı fiziksel yerinde kalır; düzeltme
gerekmez.

**Yalnız açıklık seçiliyken dönüşüm YOK.** Uygulanacak köşe yok, `false` döner ve
panel düğmeleri pasif olur.

## Komşu duvarlar esner, seçim koparılmaz

Seçili duvarın köşesi seçilmemiş bir duvarla paylaşılıyorsa o duvar esner. Bu
`moveWall`'ın bugünkü davranışının aynısı ve bilinçli: seçimi komşusundan
koparmak duvar grafını yırtar, kopan yerde iki ayrı köşe bırakır ve mahal
çevrimi kapanmaz.

## Dayanak noktası = SINIR KUTUSU merkezi

`getSelectionPivot` nokta ortalamasını DEĞİL sınır kutusunun merkezini verir:
köşesi kalabalık bir seçimde ortalama kutunun dışına kayar ve nesne kendi
etrafında değil yandan dönüyormuş gibi görünür.

## Taşıma da bir dönüşümdür

Duvar sürükleme bırakışta `moveWall`'ı değil `transformSelection`'ı çağırır.
Tek duvar, çoklu seçimin bir elemanlı hâlidir — ayrı bir yol değil. Yoksa
"birden çok duvar taşınınca ne oluyor" sorusu iki yerde yanıtlanırdı.

`architectureUiStore.draggingWall` bu yüzden `wallIds: Id[]` tutar. `moveWall`
slice'ta duruyor (duvar bölme testleri onu tüketiyor) ama araç artık kullanmıyor.

## Çoğaltmada id remap — sessiz tuzağın olduğu yer

`core/idRemap.ts` `createIdRemap` + `remapId`. **Kat kopyalama (KK-15) AYNI
yardımcıyı kullanacak**; iki ayrı yerde yazılsaydı biri bir referans alanını
unuturdu (bkz. [floor-clone](./floor-clone.md)).

- `remapId` haritada olmayan referansta **HATA FIRLATIR**. Naif kopyalama
  referansları kaynağın id'lerinde bırakır ve hata VERMEZ: kopyadaki kapı
  kaynağın duvarına bağlı kalır, ekranda doğru görünür, kaynak taşınınca oynar.
- Aynı id iki kez gelirse TEK yeni id üretilir: paylaşılan köşe kopyada ikiye
  ayrılırsa duvarlar kopuk kalır.
- Sıra: önce köşeler (duvar onların yeni id'sini isteyecek), sonra duvarlar,
  sonra açıklıklar.

**Seçili duvarın açıklığı, seçili olmasa DA kopyalanır** — kapısız bir duvar
kopyası kullanıcının istediği şey değil. Yalnız açıklık seçiliyken çoğaltma yok:
duvarsız açıklık temsil edilemez (K16).

Çoğaltmadan sonra **seçim kopyaya geçer**, kullanıcı çoğalttığı şeyi hemen
sürükleyebilsin.

## Hangi türler kapsamda (K49)

Duvar, nokta sembolü, **alan nesnesi** ve **kiriş**. Açıklık kapsam DIŞI: kendi
koordinatını taşımıyor (duvarına `offsetCm` ile bağlı), duvarıyla birlikte
geliyor — panel düğmeleri de bu yüzden "açıklık dışında bir şey seçili" koşuluna
bakıyor, eskiden `hasWall`'a bakıyordu.

Dayanak (pivot) HER türü sayar; yalnız kolon seçiliyken kutu onun merkezinden
kurulur, yoksa dayanak bulunamaz ve döndürme hiç çalışmaz. Kirişin İKİ ucu da
girer (merkezi almak kapladığı alanı küçük gösterirdi).

Açı işi türe göre değişir: alan nesnesi serbest sembolle aynı
(`applyTransformToAngleDeg`), **kirişin açı ALANI YOK** — yönü uçlarından türür,
uçları dönüştürmek yeter.

⚠️ **Grup dönüşümünde açıklık koruması ÇALIŞMIYOR** (ne duvar ne alan nesnesi
için). Tek nesne sürüklemede var (K35/K36/K48), burada yok: duvarın kendisi de
oynayabildiği için "hangi duvara göre" sorusunun tek cevabı yok ve kısmi
uygulama tek-Ctrl+Z sözleşmesini bozardı. Kapatılırsa DÖRT tür için birden.

⚠️ Çoğaltma `store/duplicateOps.ts`'e AYRILDI (dosya 200 satır sınırını
aşıyordu). Ortak yardımcı `collectWallPointIds` `core/wall.ts`'te: `store/`
içinde bırakılsaydı transformOps ↔ duplicateOps karşılıklı import eder ve
çalışma zamanı döngüsü oluşurdu (K17 tuzağı).

## Henüz yapılmadı

Talep "yapıştırma sırasında kopyalanan grup imleci takip eden bir önizleme
olarak gösterilecek, uygun konuma tıklanarak bırakılacaktır" diyor. Bugünkü
çoğaltma kopyayı sabit 50 cm ötelenmiş bırakıyor; imleci takip eden yapıştırma
önizlemesi `useOpeningTool` ölçeğinde ayrı bir jest aracı ve yazılmadı.
**Katlar arası kopyala-yapıştır** da bununla birlikte gelecek — bugün çoğaltma
kopyayı kaynağın katına koyuyor.

**Dosya:** core/transform.ts · core/idRemap.ts · core/wall.ts
(`collectWallPointIds`) · store/transformOps.ts · store/duplicateOps.ts ·
ui/properties/SelectionActions.tsx · scene/useWallSelectionTool.ts
