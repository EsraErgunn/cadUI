# Eleman ad etiketleri (tesisat)

Tür: decision · Tarih: 2026-08 · Dosyalar: `plumbing/core/elementLabel.ts`,
`plumbing/scene/ElementNameLabels.tsx`, `plumbing/scene/useSelectionTool.ts`

Yerleşmiş her tesisat elemanı (`InstallationElement`) adını (metadata `label`,
Türkçe) yanında gösterir; etiket elemana KESİKLİ kılavuz çizgisiyle bağlıdır ve
sürüklenebilir. Yalnız ad gösterilir — tip/id/çerçeve yok.

## Kararlar

- **Kayma saklanır, konum değil.** `InstallationElement.labelOffsetCm?` eleman
  konumuna GÖRE kaymadır: eleman taşınınca etiket kendiliğinden birlikte gelir,
  ikinci bir güncelleme noktası doğmaz. Alan YOKSA etiket varsayılan yerindedir
  (dünya kutusunun üstü, yatayda ortalı) ve store'a hiçbir şey yazılmaz — hiç
  taşınmamış etiket kaydedilen JSON'u şişirmez.
- **Varsayılan pay ekran-sabittir** (px/zoom): yazı ekran-sabit boyda olduğu
  için pay cm sabiti olsaydı uzak zoom'da büyüyen yazı sembolün üstüne binerdi.
  Sonucu: taşınMAMIŞ etiket zoom'la elemana yaklaşıp uzaklaşır, bu bilinçli.
- **Tutma sınavı saf geometride** (`pickElementLabelAt`) — tesisat tutması gibi
  ışın yok. Etiket kutusu troika ölçümü olmadan kaba karakter genişliğiyle
  kestirilir (7.2 px/karakter + pay); render'dan ölçü sızdırılmaz.
- **Etiket isabeti eleman isabetinin ÖNÜNDE**: etiket elemanların üstünde
  çizilir, `handlePointerDown` da önce etikete bakar. Sürüklemeden bırakmak
  TIKLAMADIR ve etiketin elemanını seçer (köşe tıklaması kuralı).
- **Canlı sürükleme `plumbingUiStore.draggingLabel`'da** (`draggingLineCorner`
  deseni): bırakılana kadar cadStore yazılmaz; bırakınca tek
  `setElementLabelOffset` = tek Ctrl+Z. Kayma ızgaraya YAKALANMAZ — etiket
  açıklama notudur, çizim geometrisi değil.
- **Kılavuz rengi koyu amber (#d97706), MARKA sarısı DEĞİL**: #FFC107 tuvale
  giremez (K27) ve açık zeminde okunmaz. Kılavuz, yazının altından geçmesin
  diye etiket kutusuna girdiği kenarda kesilir (`clipLeaderEndToRectCm`).
- Kat kopyalama etiketi bedavaya taşır: `floorCloneOps` elemanı `...element`
  ile kopyaladığı için `labelOffsetCm` birlikte gelir.
- **Vana etiketsizdir** (`UNLABELED_ELEMENT_TYPES`): hemen her sayaç/cihazla
  otomatik geldiği için etiketi çizimi kalabalıklaştırıyordu. Çizim de tutma
  sınavı da AYNI kuraldan okur — ayrışsalar görünmez etiket tutulabilir olurdu.
  Selenoid vana etiketli (ayrı, bilinçle yerleştirilen bir araç).
- **Görünüm ▸ Etiketleri Göster** (`uiStore.isElementLabelsVisible`): ölçü
  anahtarıyla aynı desen ama varsayılan AÇIK (ad çizimin okunması için gerekli,
  ölçü isteğe bağlı katman). Kapalıyken etiket TUTULMAZ da — görünmeyeni
  sürüklemek "boşluk seçim yapmıyor" hissi verirdi.
