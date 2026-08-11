# Uzunluk etiketleri: türetilmiş değer, ekran boyunda yazı

Tür: `decision` · 2026-08 · İlgili: Aşama 7, KK-11

## Uzunluk modelde TUTULMAZ

`InstallationLine` üzerinde `lengthCm` diye bir alan yok ve eklenmez. Etiketin
gösterdiği değer HER ZAMAN köşe konumlarından hesaplanır
(`plumbing/core/lineGeometry.ts` → `getSegmentLengthCm`). Alan olarak saklansaydı
köşe sürüklendiğinde, hat bölündüğünde ve yapıştırmada ayrı ayrı tazelenmesi
gerekirdi; biri unutulduğunda kimse hata vermez, yalnız sayı yalan söylerdi.

Aynı gerekçe konum için de geçerli: etiketin yeri bölümün **dünya orta
noktasından** türer, ekran koordinatı saklanmaz (R9) — yoksa zoom/pan sonrası
etiket yerinde kalırdı.

## Biçim: tesisat tarafı virgüllü, mimari taraf noktalı

İki biçimlendirici var ve **birleştirilmedi**:

- `core/coords.ts` → `formatLengthAsMeters` (`toFixed`, nokta ondalık). Mimari
  tarafın kullanımında; dokunulmadı.
- `plumbing/core/lengthFormat.ts` → `formatLengthMeters`
  (`Intl.NumberFormat('tr-TR')`, virgül ondalık + binlik ayırıcı). Arayüz metni
  Türkçe olduğu için ölçü de Türkçe okunur: `1234.5 cm → "12,35 m"`.

`Intl.NumberFormat` **modül düzeyinde bir kez** kurulur — her çağrıda kurmak
pahalı ve etiket sayısı yüzleri bulabiliyor.

## Yazı drei `<Html>` ile DEĞİL `<Text>` ile

Plandaki öneri `<Html>`'di; `<Text>` (troika) seçildi:

- Etiket başına bir DOM portal'ı + ayrı bir react-dom kökü demek. O ayrı kökün
  olay işleyicisinden yapılan store yazımının R3F ağacını yeniden çizdirmediği
  zaten biliniyor (bkz. `scene/RoomNameEditor.tsx` yorumu).
- Ölçüler açıkken yüzlerce etiket olabiliyor; portal maliyeti buna ölçeklenmiyor.

Zoom'dan bağımsız okunur boyut `<Text>` ile de sağlanıyor: `zoom` = piksel/cm
olduğu için `fontSize = LABEL_SIZE_PX / zoom` yazı boyunu ekranda sabit tutar
(aynı hesap `LABEL_OFFSET_PX` kaydırması için de kullanılıyor — etiket boruyu
örtmesin diye bölümün dikinde durur).

Font `/fonts/roboto-regular.woff` ile REPODAN verilir. Verilmezse troika
varsayılanı Google Fonts CDN'ine gidiyor ve istek düşünce **hata vermeden 0
piksel** çiziyor (RoomLabel'da yaşandı).

## Anlık etiket menüden BAĞIMSIZ

`uiStore.isDimensionsVisible` (Görünüm ▸ Ölçüleri Göster) yalnız **yerleşmiş**
hatların kalıcı etiketlerini açar. Çizim sırasında lastik bandın ortasındaki
anlık uzunluk her zaman görünür: o bir çizim geri bildirimi, kotalama değil.

Anlık etiketin konumu her karede grubun `object3D`'sine yazılır; React state'i
yalnız YAZI değiştiğinde güncellenir (`useCameraZoom`'daki "değişmediyse
dokunma" deseni) — metnin zaten yeniden çizilmesi gerekiyor.

## Mevcut borunun üstüne çizerken AYRIM ölçüsü

İmleç çizim sırasında mevcut bir borunun üstüne düştüğünde (`useLineTool` →
`snapRef.kind === 'line'`) o boru tıklamada AYRILACAK
(`LineEndAttachment.lineSplit`). `SplitLengthLabels.tsx` bunun iki yarımının
boyunu tıklanmadan yazar — kullanıcı bölme yerini sayıya bakarak seçsin.

- Mevcut bir KÖŞEye yapışıldığında (`LineSnapCandidate.pointId` dolu) **çıkmaz**:
  orada boru bölünmez, var olan köşeye bağlanılır.
- Anlık etiketle aynı gerekçeyle `Ölçüleri Göster`den bağımsız (çizim geri
  bildirimi). Ayrılacak bölümün kendi kalıcı etiketi (TAMAMININ boyu) yerinde
  kalır: iki yarımın yazısı çeyrek noktalarda durduğu için üst üste binmez.
- `segmentIndex` `points[i] → points[i+1]` demektir — `lineSnap` ve
  `splitLineAtSegment` aynı indekslemeyi kullanır, uçlar bu yüzden `segments`
  üzerinden değil `points` üzerinden okunur.
- Etiket çapası (`getMeasurementAnchor`) core'da: iki yarım aynı yöne baktığı
  için dikleri de aynı çıkar, yazılar borunun AYNI yanında dizilir.

## Sürükleme sırasında etiket hattıyla gelir

Köşe sürüklemesi cadStore'a bırakılana kadar yazmıyor; etiket de bu yüzden
`useDraggedCorners` ile geçici konumu okur. Rijit hat sürüklemesinde ise
`DragOffsetGroup` etiketleri de sarar. İkisi de `InstallationLineMesh`'in
kullandığı YARDIMCILARIN AYNISI — ikinci bir kopya çıkarılmadı; `useDraggedCorners`
bu yüzden kendi dosyasına taşındı (bileşen dosyasından hook dışa açmak
`react-refresh/only-export-components` kuralını da kırıyordu).

## Bilinen sınır (varsayarak kod yazma)

Etiket sayısı çok arttığında (>200) yalnız görünür alandakileri çizmek gerekir;
bu kırpma **yapılmadı**, Bölüm 15'te risk olarak duruyor.
