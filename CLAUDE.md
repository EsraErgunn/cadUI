# cadui — çalışma kuralları

Vite + React 19 + TypeScript + Tailwind v4 projesi.

Bu dosya **yönetici paneli / liste ekranları** işine dair kuralları toplar.
Çizim editörünün veri modeli, `core/` ve `scene/` kuralları için üst sözleşme
`.claude/CLAUDE.md`'dir; çelişki olursa o kazanır. Alan bilgisi
`.claude/knowledge/INDEX.md` altında.

## Klasör sözleşmesi

- İş kuralı bilmeyen, birden çok yönetici ekranının kullanabileceği ortak
  bileşen/hook → `src/ui/admin/` (kabuk, tablo, sayfalama, filtre, bildirim,
  boş/yükleniyor durumları, tema ve yetki hook'ları). Ortak form alanları
  `src/ui/admin/form/` altında.
- Tek ekrana özel parçalar → `src/ui/admin/<ekran>/` (`firms/`, `projects/`).
- Bir parça ikinci ekranda gerekince `<ekran>/` altından `admin/` köküne taşınır
  ve adındaki ekran öneki düşer (`firms/FirmPagination` → `Pagination` gibi).
  İkinci bir kopya çıkarılmaz.
- Sayfa bileşenleri → `src/pages/` (`GasDistributionFirmsPage.tsx`,
  `ProjectListPage.tsx`, …). Sayfa route'a bağlanır; kabuk (`AdminLayout`)
  sayfanın içine gömülmez, route ebeveynidir (`src/app/router.tsx`).
- API sözleşmesi + mock → `src/api/` (`adminFirms.ts` + `adminFirmsMock.ts`
  deseni). Dışarıdan gelen veri `zod` şemasından geçmeden state'e girmez.
- `src/core/` içinde React YOK — saf fonksiyon ve tip.

## Stil

- Renkler yalnız `src/styles/index.css` içindeki `@theme` token'larından gelir:
  `surface`, `surface-sunken`, `edge`, `ink`, `ink-muted`, `ink-disabled`,
  `brand`, `selection`, `danger`, `admin-primary`, `admin-primary-ink`,
  `accent`, `accent-ink`.
- Yeni hex renk yazma; `bg-[#...]` gibi arbitrary value kullanma. Gereken renk
  yoksa `@theme` bloğuna token ekle (açık tema) ve `.dark` bloğunda karşılığını
  ver.
- Koyu tema `<html class="dark">` ile açılır (`useTheme.ts`), OS tercihiyle
  değil. Utility class'lar iki temada aynı kalır, değişen token değeridir.
- `style={{...}}` inline stil yasak. İstisna: `src/scene/` içindeki R3F propları
  (`position`, `material` vb.) CSS değildir.

## Varyantlar

Buton/rozet/başlık stilleri `src/ui/admin/adminVariants.ts` içindeki `cva`
tanımlarından gelir: `adminNavItemVariants`, `adminButtonVariants`,
`adminIconButtonVariants`, `pageButtonVariants`, `filterChipVariants`,
`sortHeaderVariants`, `adminFieldVariants` ve `ADMIN_FOCUS_RING` sabiti.
Yeni bir stil gerekiyorsa oraya varyant ekle — bileşenin içine sınıf gömme.

## Liste ekranlarının durumu

- Filtre / arama / sıralama / sayfa durumunun tek sahibi **URL query string**'dir.
  Bileşende kopya state tutulmaz.
- Anahtarlar `src/ui/admin/adminUrlParams.ts` içindeki `ADMIN_PARAM_KEYS`'ten
  gelir; üst bardaki bölge seçimi `useRegionParam` ile aynı `region` anahtarını
  yazar.
- Varsayılan değerler URL'e YAZILMAZ (adres temiz kalır), okurken hesaplanır.
- Filtre veya sıralama değişince sayfa 1'e döner.
- Sayfalama sunucu taraflı; istemci gelen diziyi dilimlemez.
- Desen örneği: `src/ui/admin/useFirmListParams.ts`. Yeni liste ekranı kendi
  `use<Ekran>ListParams.ts`'ini bu deseni izleyerek yazar, sıfırdan
  `URLSearchParams` mantığı kurmaz.

## Dil ve biçimlendirme

- Tüm arayüz metinleri Türkçe.
- Tarih/sayı biçimlendirmesi `tr-TR` locale ile.
- Türkçe metin karşılaştırma/arama için `src/api/turkishText.ts` (`includesTr`)
  kullanılır — kendi `toLowerCase()` çözümünü yazma.

## Erişilebilirlik (zorunlu)

- Klavye odağı her yerde görünür: `ADMIN_FOCUS_RING` kullan.
- İkon-only butonlarda `aria-label` zorunlu, dekoratif ikonlarda `aria-hidden`.
- Sıralanabilir tablo başlıklarında `aria-sort`, aktif sayfa numarasında
  `aria-current="page"`.
- Yükleniyor/sonuç sayısı gibi değişen metinlerde `aria-live`, hata kutusunda
  `role="alert"`.

## Test

- Vitest + Testing Library. Kurulum: `src/test/setup.ts`.
- Testler ilgili klasörün `__tests__/` dizininde
  (`src/ui/admin/__tests__/`, `src/ui/__tests__/`, `src/core/__tests__/`).
- `src/core/` fonksiyonlarına test zorunlu.
- Komutlar: `npm test` (izleme), `npm run test:run` (tek sefer),
  `npm run lint`, `npm run build`.

## Kod

- Yorumlar Türkçe ve "ne" değil **"neden"** anlatır: workaround, geometri
  kısıtı, birim dönüşümü gibi koddan anlaşılmayan şeyler. Dosya başı açıklama
  yorumu yazılmaz. TODO sahipsiz bırakılmaz: `// TODO(isim): ...`
- `any` kullanılmaz, gereksiz `as` yazılmaz. `dangerouslySetInnerHTML` yasak.
- Magic number yok (isimli sabit). Import sırası: dış paket → iç modül →
  relative. 200+ satırlık bileşen bölünür.
- İsimlendirme: değişken/fonksiyon `camelCase`, bileşen/tip `PascalCase`,
  sabit `UPPER_SNAKE_CASE`, boolean `is`/`has`/`should` ile başlar. Birim
  belirsizse ada yazılır (`widthCm`, `angleDeg`). Dosya adı: bileşen
  `PascalCase.tsx`, geri kalan `camelCase.ts`.
- `console.log`/`debugger` bırakılmaz.
- Yeni bağımlılık kurma. Tarih alanı, modal ve toast için önce repoda karşılığı
  var mı diye bak; yoksa native çözüm yeterli.

## Versiyon kontrolü

Yerel işlemler (okuma, `git add`, `git commit`, dal açma/değiştirme, stash)
istenirse yapılabilir. **`git push` YAPILMAZ** ve main'e doğrudan yazılmaz —
uzağa çıkan her şeyi geliştirici kendisi yapar. Dal adı `feat/…`/`fix/…`,
commit mesajı `feat:`/`fix:`/`refactor:`/`test:` önekiyle; ayrıntısı
`.claude/CLAUDE.md` → Çalışma şekli.

## Kapsam

Bir adımda istenmeyen dosyalara dokunma. Kapsam dışı bir değişiklik gerekiyorsa
yapma, önce söyle.
