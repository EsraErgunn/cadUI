# Ölçüm aracı: kalıcı olmayan iki noktalı ölçü

Tür: `decision` · 2026-08 · İlgili: Aşama 8, KK-13

## Ölçüm çizimin PARÇASI DEĞİL

Durum `plumbingUiStore.measurement`'ta yaşar; cadStore'a hiç dokunulmaz. Sonuç:
`markDirty` çağrılmaz, `revision` artmaz, Ctrl+Z ölçüme takılmaz ve kaydedilen
JSON'a girmez (K3/K6 ile aynı gerekçe — pano da bu yüzden orada).
`plumbing/store/__tests__/measurement.test.ts` bunu `revision` üzerinden
doğruluyor: ölçüm alıp temizlemek revision'ı değiştirmiyorsa kalıcı state'e
girmemiş demektir.

Model değişikliği YOK. Ölçüm için `installationModel.ts`'e alan eklenmedi.

## `end: null` = ölçüm sürüyor

`Measurement = { start, end: null | PlanPoint }`. İkinci nokta konana kadar
imleç `end` yerine sahnenin ref'inde taşınır (`useMeasurementTool.cursorRef`) —
her `pointermove` store'a yazılsaydı ölçüm boyunca kare başına render olurdu.
Lastik bantla aynı desen.

Üçüncü tık yenisini başlatır: ölçü almak tekrarlanan bir jest, her seferinde
paletten aracı yeniden seçtirmek gereksiz. Aynı yere ikinci tık sıfır boy ölçü
yazardı, `isSamePoint` ile reddedilir (boru aracıyla aynı kural).

## Temizlemenin TEK adresi: `clearMeasurement`

İki yol da oraya çıkar:

- **Esc** → `useMeasurementTool`'un `onCancel`'ı doğrudan çağırır.
- **Araç değişimi** → hook'un effect temizliği çağırır (`isActive` bağımlılığı).

Esc ayrıca paleti seçim aracına döndürür (`useEscapeToSelectionTool`); ölçüm
aracı hat araçları gibi "aktif kalan" araçlardan değil. Bu yüzden Esc'te ölçüm
iki kez temizlenir — zararsız, çünkü tek kapı idempotent.

## Yazı `<Text>`, çizgi `PipeLine`

Plan `<Html>` öneriyordu; `<Text>` seçildi — gerekçe measurement-labels.md'de
(portal maliyeti + ayrı react-dom kökü). Sonuç olarak ölçüm yazısı ile hat
etiketleri AYNI bileşenden (`LengthText`) geçer, süren ölçümün anlık sayısı da
lastik bandın etiketinden (`DraftLengthLabel`) — ikinci bir yazı yolu açılmadı.

Çizgi de yerleşmiş hattın çizdiği `PipeLine`'dan geçer ama **kesikli** ve sabit
2 px: boru olmadığı renkten değil BİÇİMDEN anlaşılmalı (renk körlüğü, gri
baskı). Rengi yazısıyla aynı nötr ton (`PLUMBING_COLORS.measurementLine`).

## Yakalama: yalnız ızgara (bilinçli sınır)

Ölçüm noktası `getPlacementPosition` ile aktif zoom'un ince ızgarasına oturur,
Ctrl ızgarayı kapatır — eleman ve boru jestiyle aynı. **Port/boru köşesi
yakalaması YOK**: o öncelik sırası hat aracının işi (`useLineTool.resolveSnap`)
ve ikinci bir kopyası çıkarılmadı. Boru üstünde ölçü gerekiyorsa hat aracı
zaten ayrım ölçüsünü yazıyor (measurement-labels.md).

## Araç ayrımı `behavior` alanından

`isMeasurementTool` id metnine değil `InstallationToolDefinition.behavior`'a
bakar. Aynı anda tek araç mantığı aktif olsun diye her hook kendi DAVRANIŞINI
sorar; ölçüm aracı ne `getPlacementElementType` ne `getLineKind` döndürür.

## İzolasyon bu aşamada DEĞİŞMEDİ

K-W4 gereği izolasyon bir "segment toggle" değil, hatta oturan bir
`placement` elemanı (`installationTools.ts` → `insulation`). Aşama 8 metnindeki
`toggleSegmentInsulation` / `InstallationLineSegment.isInsulated` yolu
UYGULANMADI ve uygulanmayacak; izolasyon mevcut yerleştirme akışıyla çalışıyor.
