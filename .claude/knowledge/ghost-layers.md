# Hayalet katmanlar: her görünüm karşı katmanı soluk gösterir

İki yönlü ve simetrik: tesisat görünümünde mimari (`ArchitectureGhost`), mimari
görünümde tesisat (`InstallationGhost`) soluk çizilir. İkisi de tek dosyada
(`src/plumbing/scene/Ghosts.tsx`), ikisi de **`SceneRoot`'ta** mount edilir.

**Neden SceneRoot?** Hayalet, çizen katmanın parçası değil *görünümün bağlamı*dır.
`PlumbingLayer` içinde dursaydı simetriği `ArchitectureLayer`'a yazılmak zorunda
kalırdı (başka sahibin dosyası + plan Bölüm 4.3 kapalı listesi dışı). SceneRoot
zaten görünüm anahtarının olduğu yer.

**Kat.** Her hayalet aktif katı KENDİ okur (`activeFloorId`); mount eden kimse
kat bilgisi geçirmez. Kat geçişi geldiğinde hayaletler kendiliğinden doğru katı
gösterir.

## İki hayalet aynı yöntemi kullanmaz — bilerek

| | Mimari hayalet | Tesisat hayaleti |
|---|---|---|
| Yöntem | Tek soluk renge **boyanır** (`architectureGhost`) | **Rengi korunur**, saydamlaşır (`opacity 0.35`) |
| renderOrder | `architectureGhost: 5` — tesisatın **altında** | `installationGhost: 35` — mimarinin **üstünde** |

Tesisat rengi bilgi taşıyor (tuvalde sarı = gaz hattı); griye boyansa o bilgi
kaybolurdu. Mimari duvar rengi ise bilgi taşımıyor, boyanabiliyor.

`installationGhost` mimarinin ÜSTÜNDE çünkü "hayalet"liği saydamlıktan geliyor,
derinlikten değil: altına konsaydı oda dolgusu (`Room.tsx`, henüz boş) devreye
girdiğinde tamamen kaybolurdu — [symbol-backface](./symbol-backface.md) ile aynı
sınıf sessiz görünmezlik.

Hayalet material klonları `symbolLoader.ts` → `getGhostMaterial` ile RENK başına
önbelleklenir ve dispose EDİLMEZ (paylaşılan material'lerle aynı ömür); önizleme
klonu ise mount başına üretilip unmount'ta dispose edilir. Material sahipliği tek
dosyada: klon üretimi bir bileşen dosyasına konamaz da — `react-refresh/
only-export-components` bileşen dosyasından fonksiyon export'una izin vermiyor.
Her hayalet mesh'i `raycast` dışıdır.
