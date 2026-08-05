# convention: Koordinat ve renk

**Koordinat:** Plan (x,y) ↔ Three (x,-z), elevation→y. SADECE core/coords.ts.
Başka yerde tekrarlanırsa biri işareti ters yazar, plan aynalanır, günler kaybolur.
Model saf plan koordinatı tutar; sahne dönüşümü model'e sızmaz.

**Renk:** Marka sarısı #FFC107 çizim alanına GİRMEZ. Seçim rengi mavi, başka katmanda
kullanılmaz.

Bu kural eskiden "tuvalde sarı = gaz hattı" diyordu; 2026-08'de K27 ile **değişti**. Gaz
hattının rengi artık ÇAPINDAN gelir (DN25 kırmızı, DN32 açık mor, DN40 mavi, DN50 mor —
WebCAD ile aynı sınıflandırma, bkz. [../../docs/webcad-format.md](../../docs/webcad-format.md)).
Yani sarı çizim alanına hiç girmez; gaz hattının işareti de değildir.
