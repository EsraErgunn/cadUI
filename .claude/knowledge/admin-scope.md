# decision: Yönetici panelinin KAPSAMI (coğrafi bölge kavramı kalktı)

Sözleşme değişikliği: backend'den `region` kavramı TÜMÜYLE kaldırıldı.

## Artık olmayanlar

| Kaldırılan | Yerine |
|---|---|
| `GET/POST/PUT/DELETE /api/regions` | — (uç yok, Bölgeler ekranı silindi) |
| `GET /api/gasdistributionfirms/{firmId}/regions` | — |
| `GasDistributionFirmRegion` ilişkisi, `GasDistributionFirmRegionId` | `GasDistributionFirmId` |
| `regionDensity: [{ region, count }]` | `densityBy` + `density: [{ id, name, projectCount }]` |
| `regionId` sorgu parametresi | `gdGroupId` **veya** `gdFirmId` |

Frontend'de `api/regions.ts`, `regionsMock.ts`, `ui/admin/regions/`,
`RegionDensityCard.tsx`, `useRegionParam.ts` ve bunların testleri SİLİNDİ. Sol
menüde "Bölgeler" maddesi ve `/admin/regions` rotası yok.

## Kapsam modeli

`api/adminDashboard.ts` — yani ucun KENDİ dosyasında; kapsam sunucunun sorgu
sözleşmesinin arayüzdeki karşılığı, ayrı bir "domain katmanı" değil:

```ts
type AdminScope =
  | { type: 'global' }
  | { type: 'group'; groupId: number }
  | { type: 'firm'; firmId: number }
```

**Ayrık birleşim, iki opsiyonel alan DEĞİL.** Sunucu `gdGroupId` ile `gdFirmId`'nin
birlikte gönderilmemesini şart koşuyor; `{ groupId?, firmId? }` biçimi o geçersiz
durumu tipte mümkün kılar ve hata ancak sunucuda görünürdü. Sorguyu `adminDashboard.ts`
içindeki `withScopeQuery` kuruyor (dışa açık DEĞİL): global kapsamda parametre HİÇ
yazılmaz — boş `gdGroupId=` sunucuda ayrı anlam taşıyabilir.

**Kapsam için ayrı bir `src/api` dosyası AÇILMAZ.** API sözleşmesinin sahibi
backend; arayüzde uç başına yeni bir soyutlama katmanı kurmuyoruz. Tip ve sorgu
kurucusu, o parametreyi alan ucun dosyasında yaşar. UI tarafındaki state/hook/
seçenek dosyaları (`useAdminScopeParam`, `adminScopeOptions`) API katmanı değildir,
onlar `ui/admin/` altında kalır.

## URL anahtarları

| Kapsam | URL | Uç parametresi |
|---|---|---|
| global | anahtar yok | yok |
| grup | `group=5` | `gdGroupId=5` |
| firma | `gdfirm=42` | `gdFirmId=42` |

`group` anahtarı liste ekranının grup filtresiyle ORTAK — üst bar ile sayfa içi
filtre birbirini otomatik yansıtsın diye (iki ayrı anahtar olsaydı hangisinin
kazandığı belirsiz kalırdı). Firma kapsamının liste karşılığı olmadığı için kendi
anahtarı var; proje firması süzgecinin `firm` anahtarıyla KARIŞTIRILMAZ, o başka
bir varlık. Yazarken biri set edilirken öbürü siliniyor; elle düzenlenmiş adreste
ikisi birden bulunursa okumada FİRMA kazanır (daha dar kapsam).

Sorgu anahtarına kapsamın TAMAMI giriyor (`['dashboardSummary', dayKey, scope]`):
grup ile firma kapsamı ayrı önbellek girdisi, yanlış kapsamın verisi ekranda kalmaz.

## Üst bardaki seçici

İki düzeyli `<optgroup>`: her grubun altında o gruba bağlı gaz dağıtım firmaları.
`<optgroup label>` tıklanabilir olmadığı için grubun KENDİSİ ilk satır olarak
ayrıca yazılıyor ("AKSA (tümü)"). Seçim kutusunun değeri türü de taşır
(`group:5` / `firm:42`) — aynı sayı hem grup hem firma kimliği olabilir.

Seçenekler İKİ mevcut uçtan birleşiyor (`/api/gasdistributiongroups` +
`/api/gasdistributionfirms`), yeni uç açılmadı. Hiyerarşiyi kuran saf fonksiyon
`ui/admin/adminScopeOptions.ts`; sıralama İSTEMCİDE ve Türkçe (hem gruplar hem her
grubun firmaları) çünkü sunucu 'Ç'yi 'D'den sonra veriyor. Grubu olmayan firmalar
sonda ayrı bir başlıkta toplanıyor — elenselerdi kapsamları hiç seçilemezdi.

Firma listesinin sorgu anahtarı `['gasDistributionFirms', 'all']`: firma ekranının
pasifleştirme sonrası geçersizleştirmesi (`['gasDistributionFirms']`) üst bardaki
seçenekleri de tazeliyor.

## Yoğunluk kartı

`densityBy` kart BAŞLIĞINI seçiyor: `group` → "Grup Bazlı Yoğunluk",
`firm` → "Firma Bazlı Yoğunluk". Satır anahtarı `id` (iki kaydın adı aynı olabilir).

Şemada `z.enum(['group','firm']).catch('group')`: beklenmeyen değer bütün paneli
düşürmez, yalnız başlık genel kalır. GEREKÇE — bu alan sayıları değil metni seçiyor;
eski gerçek yanıt `'GasDistributionGroup'` diyordu, sunucu hâlâ o biçimi
gönderiyorsa sayılar doğru görünür ve başlık sessizce gruba düşer.
**TODO(esra): canlı yanıtta `densityBy` değeri teyit edilecek.**

## Duyurular

Duyurunun kapsam alanı `region` → `scopeName` oldu (yerel depo anahtarı v1 → v2,
eski biçimdeki kayıtlar okunmaya çalışılmıyor). Duyuru varlığı sunucuda hiç yok;
bu alan mock/localStorage tarafında yaşıyor (bkz. dashboard-announcements.md).
