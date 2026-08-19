# Kaydedilmemiş değişiklikle çıkış uyarısı (K110)

Ürün kuralı "kaydedilmemiş değişiklik varsa kullanıcı uyarılır" iki AYRI yolla
karşılanıyor; biri ötekinin yerini tutmaz.

| Kaçış yolu | Kim yakalar |
|---|---|
| Sekme kapatma, yenileme, adres çubuğu, tarayıcı geri | `pages/useUnsavedChangesWarning.ts` (`beforeunload`) |
| "← Projeler", Dosya ▸ Kapat | `pages/useEditorExit.ts` + `ui/UnsavedChangesDialog.tsx` |

## ⚠️ `beforeunload` router gezinmesinde ÇALIŞMAZ

Yalnız belge boşaltılırken tetikleniyor. Uygulama içi çıkış React Router
gezinmesi olduğu için oradan hiç geçmiyor — iki mekanizmanın ikisi de gerekli.

`useBlocker` kullanılamıyor: router `BrowserRouter` (veri router'ı değil).
Sorun değil, çünkü editörden çıkışın tek yolu "Projeler"/"Kapat" eylemi ve o
eylem tek yerde (`useCloseEditor`).

## Kararlar

- **Dinleyici yalnız KİRLİYKEN kurulur.** Sürekli kayıtlı bir `beforeunload`
  bazı tarayıcılarda bfcache'i devre dışı bırakıyor ve temiz projede de soru
  sordurma riski taşıyor.
- **Özel metin yazılmaz** — tarayıcılar kendi genel mesajını gösteriyor.
  `preventDefault()` + `returnValue = ''` ikisi birlikte (biri güncel, biri
  eski tarayıcılar için).
- **Pencerede üç seçenek var: Vazgeç / Kaydetmeden Çık / Kaydet ve Çık.**
  Üçüncüsü olmasaydı kullanıcı pencereyi kapatıp Kaydet'e basmak ve çıkışı
  tekrarlamak zorunda kalırdı; uyarının amacı işi kurtarmak.
- **"Kaydet ve Çık" YALNIZ sunucu kabul edince çıkar.** Başarısız kayıtta
  çıkılsaydı uyarının kurtarmaya çalıştığı iş tam da orada kaybolurdu; hata
  pencerenin içinde gösteriliyor, çünkü üst bardaki şerit pencerenin arkasında
  kalıyor.
- **Temizken soru sorulmaz.** Her çıkışta pencere açmak uyarıyı gürültüye
  çevirir ve kullanıcı okumadan kapatmayı öğrenir.

## ⚠️ Pencerede gösterilen hata kapsamlı DEĞİL

`useProjectPersistence.error` daha eski bir yükleme hatasını da taşıyabiliyor.
Pencere onu ancak `hasSaveFailed` ile birlikte gösteriyor — yoksa açılır
açılmaz alakasız bir uyarı çıkıp soruyu bulandırırdı.

Kirlilik ölçütü içerik karşılaştırması (`selectIsProjectDirty`, K94): "çiz +
Ctrl+Z" yapan kullanıcı çıkarken uyarı ALMAZ.

**Dosya:** pages/useUnsavedChangesWarning.ts · pages/useEditorExit.ts ·
pages/useCloseEditor.ts · ui/UnsavedChangesDialog.tsx · pages/EditorPage.tsx
