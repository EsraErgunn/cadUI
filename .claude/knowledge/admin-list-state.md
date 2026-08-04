# decision: Yönetici liste ekranlarının durumu ve yetkisi

## Liste durumu URL'de, sayfalama sunucuda

Arama / filtre / sıralama / sayfa **tek yerde** durur: URL query param.
Bileşenlerde kopya state tutulmaz.

| Alan | Anahtar | Varsayılan (URL'e YAZILMAZ) |
|------|---------|------------------------------|
| firma adı araması | `q` | boş |
| grup firması | `group` | yok |
| bölge | `region` | yok (= "Hepsi") |
| sıralama sütunu | `sort` | `dfirmNo` |
| sıralama yönü | `dir` | `asc` |
| sayfa | `page` | 1 |

Neden: bağlantı paylaşılabilir olur, tarayıcı geri tuşu kendiliğinden doğru
çalışır, iki bileşen aynı filtre için farklı değer gösteremez. Varsayılanlar
URL'e yazılmadığı için adres temiz kalır.

**Üst bardaki "Bölge" ile sayfa içindeki filtre paneli AYNI `region` anahtarını
kullanır.** İki ayrı param olsaydı kullanıcıya iki bölge alanı görünür ve
çelişebilirlerdi. Yer: `ui/admin/adminUrlParams.ts` (anahtarlar + `useRegionParam`),
`ui/admin/useFirmListParams.ts` (liste durumu).

Sayfalama **sunucu taraflı**: arama, filtre, sıralama, sayfa hepsi API parametresi
olarak gider; istemci gelen diziyi dilimlemez. Filtre/sıra değişince `page` silinir
(ilk sayfaya dönülür) — eski sayfa numarası yeni sonuç kümesinde anlamsızdır.

## Kabuk sayfadan ayrı

`ui/admin/AdminLayout.tsx` = sol menü + üst bar, route'un ebeveyni. Sayfalar
`<Outlet/>`'e girer. Kabuk sayfanın içine GÖMÜLMEZ; sayfa değişince yeniden
kurulmaz. Sol menünün tek kaynağı `ui/admin/adminNavItems.ts` — yeni yönetici
ekranı eklenince yalnız o dizi ve `router.tsx` değişir.

### gotcha: kabuk viewport'a KİLİTLENMEZ, tek kaydırma penceredir

Kabuk bir süre `h-screen + overflow-hidden` idi; kaydırma içerideki
`<main class="overflow-y-auto">`'a (ve `overflow-y-auto` taşıyan `<nav>`'a)
düşüyordu. İki sonucu vardı:

- **Ölü alan:** yükseklik içerikten değil viewport'tan geldiği için 10 kayıtlık
  listede sayfalamanın altında bir ekran boyu boşluk kalıyor, kısaltacak bir şey
  bulunmuyordu.
- **Çift çubuk:** pencere hiç kaymadığından `Home`/`Ctrl+End` gibi pencere
  kaydırmasına bağlı davranışlar da çalışmıyordu.

Şimdi kabuk normal akışta: `min-h-screen` yalnız **alt sınır** koyar (içerik
kısayken sol menü ve zemin yine viewport sonuna iner), üst sınır yoktur.

- Kabuk ağacına (`AdminLayout`, `AdminSidebar`, `AdminTopBar`) dikey kaydırma
  kabı **eklenmez**: `overflow-y-auto`, `overflow-hidden`, `h-screen` yok.
  `ui/admin/__tests__/AdminLayout.test.tsx` bunu bekçilik ediyor.
- Tablonun **yatay** kaydırması kuralın dışında: `DataTable`'ın `overflow-x-auto`
  sarmalayıcısı kabul kriteri 4'ün gereği, korunur.
- `EditorPage` ve giriş ekranı hâlâ `h-screen` kullanır — orada tam ekran
  tuval/kart isteniyor, sayfa kaydırması bilerek yok.

jsdom düzen hesaplamaz (`scrollHeight` daima 0), bu yüzden testler piksel değil
kaydırmayı **üreten sınıfları** denetler. Gerçek pikseli tarayıcı konsolunda ölç:

```js
[document.scrollingElement, ...document.querySelectorAll('*')]
  .filter((el) => el.scrollHeight > el.clientHeight + 1)
  .map((el) => [el.tagName + '.' + el.className, el.scrollHeight, el.clientHeight])
```

## Yetki: düz izin listesi, rol modeli YOK

`ui/admin/usePermission.ts` → `usePermission('firm.create')`. Arkasında
`api/permissions.ts` var: `GET /api/me/permissions` düz `string[]` döndürür.

Bilinçli olarak rol/sahiplik modellenmedi — [access-control](./access-control.md)
hâlâ açık soru. Arayüz yalnız "şu izin var mı" diye sorar; izinlerin nasıl
hesaplandığı sunucuda kalır. Erişim modeli netleşince bu seam'in çağıranları
değişmez, sadece endpoint'in cevabı değişir.

İzin listesi gelene kadar `false` döner: yetkisiz kullanıcıya butonun bir an
görünüp kaybolması, hiç görünmemesinden daha yanlış bir beklenti yaratır.

## Renk

Marka sarısı #FFC107 admin arayüzünde **serbest** (birincil buton, aktif sayfa
numarası). Kural onu yalnız çizim alanına sokmuyor — tuvalde sarı = gaz hattı,
bkz. [coordinates](./coordinates.md). Aktif menü maddesi/bağlantı = seçim mavisi.
Sarı zeminde metin `brand-navy`, okunurluk için.
