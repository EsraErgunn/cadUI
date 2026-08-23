# Editör kabuğu: sol bar, üst bar, yüzeyler (K90–K91)

```
┌──────┬─────────────────────────────────────────────┐
│ logo │  ← Projeler  [Dosya▾] [Araçlar▾]            │  ← üst bar: kendi zemini YOK
│──────│        [🏢|🔧|📦]   [Hata K.][Test][Gönder] │
│      │                     [Kaydet][⟲]             │
│ araç ├─────────────────────────────────────────────┤
│ pale │                                             │
│ ti   │            tuval (hep beyaz)                │
└──────┴─────────────────────────────────────────────┘
  zemin          TEK yüzey, kavis üstten alta
```

## İki yüzey kuralı (K91)

| | token | koyu temada |
|---|---|---|
| Sol bar, tuval çevresi | `surface-sunken` | KOYULAŞIR |
| **Üst bar + tuval** | **`canvas-overlay`** | **BEYAZ KALIR** |
| Yüzen çubuk, pencereler, özellik panelleri | `surface` | KOYULAŞIR |

Üst bar tuvalle aynı yüzeyde ve tuval iki temada da beyaz
(`sceneTheme.background`). Kabuk token'ı kullanılsaydı beyaz tuvalin üstünde
lacivert bir şerit kalırdı. Aynı gerekçe `--color-canvas-overlay`'in kendi
tanımında zaten yazılıydı (oda adı düzenleme kutusu için) — bu iş onu kabuğa
uzattı.

Beyaz zeminde okunacak token'lar, hepsi açık tema değeri ve `.dark` karşılığı
YOK: `canvas-overlay-ink-strong` · `-ink-muted` · `-success` · `-danger`.

## ⚠️ Varyantları karıştırma

Üst bar `ui/menu/editorBarVariants.ts` kullanır, `controls/buttonVariants.ts`
DEĞİL. İlk denemede ortak `chromeButtonVariants`'a `card`/`success` tonları
eklenmişti; o varyantı kat pencereleri, silme onayı ve kopyalama listesi de
kullanıyor ve onlar koyu temada koyu kalmalı — beyaz zemine ayarlı renkler
oraya sızdı. **Kabuk üstündeki düğme ile tuval üstündeki düğme aynı varyantı
paylaşamaz.** Aynı ayrım yüzen çubukta da var (`canvasBarVariants.ts`).

## ⚠️ cva sınıfları çakıştırmaz

`cva` sınıfları birleştirir, çelişenleri ELEMEZ (`tailwind-merge` devrede
değil). Taban ile ton aynı `disabled:` rengini verirse kazananı Tailwind'in
stil sırası belirler, sınıf sırası değil. Sonuçlar:

- Pasif metin rengi tabanda değil her TONUN içinde.
- `EDITOR_BAR_PANEL` köşe yarıçapı TAŞIMAZ — çağıran kendi `rounded-*`'ını
  verir (menü açılırı `rounded-lg`, sahne pili `rounded-xl`).

## Yerleşim

- Kavis içerik kolonunda (`rounded-l-2xl` + `overflow-hidden`), sol barda değil:
  kavisi içeriğe verince köşede zemin görünüyor ve geçiş oluşuyor.
- Tuval SOLDAN 12px payla içeri alınır → ızgara orada kesilir. Cetvel sayıları
  YOK ama cetvelin duracağı şerit var (kullanıcı kararı). Üstte ayrıca pay yok,
  o kesintiyi üst bar zaten yapıyor.
- Logo `EditorSidebar`'da, paletin içinde DEĞİL: palet görünümle tümüyle
  değişiyor (mimari ↔ tesisat), logo değişmiyor — palette olsaydı iki kopyası
  olurdu. Zemin ve kenarlık da kolonda; paletler saydam.
- Sol barın genişliğini palet belirler, sabit sayı yazılmaz.

## Bilinen sınır

Üst bar içeriği ~1010px'de tam sığar; pencere daha darsa sağ uçtaki Kaydet
kırpılır (kolon `overflow-hidden`). Masaüstü hedefli editörde bugün sorun
değil; çözüm dar ekranda Test Et/Gönder'i ikon-only'ye düşürmek.

**Dosya:** pages/EditorPage.tsx · ui/EditorSidebar.tsx · ui/MenuBar.tsx ·
ui/menu/EditorActions.tsx · ui/menu/editorBarVariants.ts · ui/menu/menuIcons.ts ·
ui/menu/menuDefinitions.ts · styles/index.css


## Dosya menüsü yalnız dosya işleri taşır (K111)

Üst barda kendi düğmesi olan hiçbir madde menüde TEKRARLANMAZ. Aynı işi iki
yerde sunmak, kullanıcıya ikisinin farklı şeyler yaptığını düşündürüyor —
"Kapat" ile "← Projeler" arasındaki farkı arayan kullanıcı olmayan bir ayrımı
arıyor.

Menüden kalkanlar → gittiği yer:

- `Kapat` → soldaki "← Projeler" düğmesi
- `Gönder` → sağdaki "Gönder" düğmesi
- `Proje Hareketleri` → sağdaki "Kayıt Geçmişi" (K109)
- `Proje Bilgileri` → sahne değiştiricinin YANINDA, çerçevesinin DIŞINDA bir
  ikon düğmesi. O üçlü tek bir "sahne seçici" olarak okunmalı; bu ise bağımsız
  bir eylem. Künye bir "dosya işlemi" değil, her an bakılacak bilgi.

Kalan on madde beş öbekte: aç/kaydet · JSON · PDF · proje dosyası · temizle.

⚠️ `Proje Dosyasını Aç/İndir` JSON DIŞI bir biçim için ayrılmış; `İçe/Dışa
Aktar`ın kopyası DEĞİL. Etikete "(JSON)" yazılmasının sebebi bu — yoksa
sonraki gözden geçiren onları kopya sanıp siler.

⚠️ Menü temizliğinde maddenin pasif GÖRÜNMESİ yetmez, ÜRETİMDEKİ hâline bak.
`Farklı Kaydet` eski main'de ölüydü, güncel main'de çalışıyordu; eski koda
bakan analiz onu silmeye götürüyordu.

`Projeyi Temizle` menüdeki tek YIKICI madde: kendi öbeğinde, en sonda, onay
penceresiyle (`ClearProjectDialog`). Davranışı `resetProject`ten AYRI — kat
yapısı KALIR, geçmiş sıfırlanMAZ (tek Ctrl+Z geri getirir), kirli işaret DURUR,
`nextUniqueId` geri alınmaz.

⚠️ Araçlar menüsü bu temizliğin DIŞINDA. Dokuz maddesinin altısı tesisat toplu
işlemi (fay C kararı); kalan ikisi silinecek madde değil YAZILACAK özellik.

## İşlevsiz arayüzün temizliği (K142)

⚠️ ÇOĞALTMA arayüzü kalktı (panel düğmesi + Ctrl+D): kopya kaynağın 50 cm yanına
düşüyor, kesişim bölme (K24) iki duvarı birbirine yapıştırıyordu. Ctrl+D artık
yakalanmıyor — üstlenmediğimiz kısayolu `preventDefault` ile yutmuyoruz.
`duplicateSelectionInDraft` ve `duplicateSelection` DURUYOR: aynalama (K140)
onun üstünde çalışıyor, kaldırılan şey arayüz.

⚠️ "Test Et" üst bardan kalktı — hiç bağlanmamıştı, aynı işi çalışan "Hata
Kontrolleri" düğmesi yapıyor. "Gönder" pasif KALIYOR: pasifliğinin yazılı bir
sebebi var (hatalar giderilmeden onaya gidilemez).

⚠️ Araçlar menüsü dört maddeye indi: Mahalleri Tanımla, Kolon Hattını Sil,
Tesisat Sil, Malzeme Listesi. Hepsi hâlâ pasif (K79 deseni).
