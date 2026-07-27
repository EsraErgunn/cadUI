# gotcha: Araç mantığı nereye yazılır

**Sorun:** Duvar/boru çizim mantığı DrawSurface.tsx'e (D'nin dosyası) yazılırsa,
B ve C her araç eklediğinde orada çakışır. Dosya 400 satıra şişer.

**Doğru:** DrawSurface SADECE ham pointer olayı yayınlar (plan koordinatı,
tıklandı, sürükleniyor). Araç mantığı kendi hook'unda: scene/useWallTool.ts (B),
scene/usePipeTool.ts (C).
