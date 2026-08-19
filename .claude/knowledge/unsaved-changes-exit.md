# Kaydedilmemiş değişiklikle çıkış uyarısı (K110, K112)

Ürün kuralı "kaydedilmemiş değişiklik varsa kullanıcı uyarılır" iki AYRI yolla
karşılanıyor; biri ötekinin yerini tutmaz.

| Kaçış yolu | Kim yakalar |
|---|---|
| Sekme kapatma, yenileme, adres çubuğu | `pages/useUnsavedChangesWarning.ts` (`beforeunload`) |
| "← Projeler", **tarayıcı GERİ/İLERİ**, her uygulama içi bağlantı | `useBlocker` → `pages/useEditorExit.ts` + `ui/UnsavedChangesDialog.tsx` |

## ⚠️ `beforeunload` router gezinmesinde ÇALIŞMAZ

Yalnız belge boşaltılırken tetikleniyor. Uygulama içi çıkış React Router
gezinmesi olduğu için oradan hiç geçmiyor — iki mekanizmanın ikisi de gerekli.

## ⚠️ Uyarıyı DÜĞMEYE bağlama

İlk uygulama (K110) soruyu "Projeler" eylemine bağlamıştı ve tarayıcının
GERİ tuşu uyarısız çıkıyordu — kullanıcı bildirdi. Gezinmeyi durduran tek yer
router'dır; `useBlocker(isDirty)` düğmeyi, menüyü, geri tuşunu ve ileride
eklenecek her bağlantıyı aynı kapıdan geçirir.

`useBlocker` yalnız VERİ router'ında çalışıyor; bu yüzden `src/app/router.tsx`
`BrowserRouter`'dan `createBrowserRouter` + `RouterProvider`'a taşındı (K112).
Rota ağacı JSX olarak duruyor (`createRoutesFromElements`), tek yapısal fark
`<Suspense>`in kök rotanın elemanı olması (`SuspenseLayout`).

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
- **Temizken engel hiç kurulmaz** (`useBlocker(isDirty)`), soru da sorulmaz.
  Her çıkışta pencere açmak uyarıyı gürültüye çevirir ve kullanıcı okumadan
  kapatmayı öğrenir.
- **`useEditorExit` React Router tipine bağlı DEĞİL** (kendi `ExitBlocker`
  arayüzü): bağlı olsaydı dallanmayı sınamak için tüm rota ağacını kurmak
  gerekirdi.

## ⚠️ Pencerede gösterilen hata kapsamlı DEĞİL

`useProjectPersistence.error` daha eski bir yükleme hatasını da taşıyabiliyor.
Pencere onu ancak `hasSaveFailed` ile birlikte gösteriyor — yoksa açılır
açılmaz alakasız bir uyarı çıkıp soruyu bulandırırdı.

Kirlilik ölçütü içerik karşılaştırması (`selectIsProjectDirty`, K94): "çiz +
Ctrl+Z" yapan kullanıcı çıkarken uyarı ALMAZ.

## ⚠️ Bilinen uç durum

Engel her gezinmeyi durduruyor, `RequireAuth`'un 401 sonrası girişe
yönlendirmesi dahil: oturumu düşen kullanıcı kirli çizimle pencereyi görür ve
"Kaydet ve Çık" da 401 alır. Çıkış yolu var ("Kaydetmeden Çık"), o yüzden
kilitlenme değil — ama oturum yenileme eklenirse ilk bakılacak yer burası.

**Duman testi:** `src/app/__tests__/AppRouter.test.tsx` — `AppRouter` başka
hiçbir testte render edilmiyor, göç ancak orada yakalanır.

**Dosya:** pages/useUnsavedChangesWarning.ts · pages/useEditorExit.ts ·
pages/useCloseEditor.ts · ui/UnsavedChangesDialog.tsx · pages/EditorPage.tsx
