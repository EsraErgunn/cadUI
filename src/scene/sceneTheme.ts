/**
 * Çizim alanının renkleri. Tailwind burada kullanılamaz (WebGL), bu yüzden hex.
 * Marka sarısı #FFC107 buraya GİRMEZ — tuvalde sarı = gaz hattı.
 * Seçim rengi mavi ve başka katmanda kullanılmaz.
 */
export const SCENE_COLORS = {
  background: '#ffffff',
  /* Izgara ÇOK açık: çizimin altındaki kağıt, okunacak bir katman değil. Daha
     koyu tonda duvarlarla yarışıyor ve ekran kalabalık görünüyordu. */
  gridMinor: '#f4f7fa',
  gridMajor: '#f2f5f9',
  selection: '#2d7ff9',
  /**
   * Serbest çizim kalemi (K163). Çizimin hiçbir katmanıyla karışmayan bir ton
   * seçildi: duvar lacivert, seçim mavi, gaz hattı çaptan renkli. Bu bir NOT —
   * kalıcı veri değil, o yüzden kendi rengiyle ayrı okunmalı.
   */
  sketch: '#e11d48',
  /**
   * Duvarın TEK rengi — kontur yok, düz dolgu (K23).
   *
   * KOYU LACİVERT-ANTRASİT (K151, kullanıcı referans görseliyle seçti). Eskiden
   * orta gri (`#6b7280`) idi ve planın en önemli elemanı en soluk çizilen şeydi:
   * kiriş, açıklık konturu, alan nesnesi ve cihaz sembolü duvardan KOYU
   * duruyordu. Artık duvar en koyu; geri kalan katmanlar ondan açılarak sıralanır.
   */
  wallFill: '#2e3446',
  /**
   * Oda dolgusu SAYDAMDIR: ızgara altından okunmaya devam etsin, oda çizimi
   * bastırmasın. Opak denendiğinde ya ızgarayı siliyor ya da (soluk tonda)
   * ızgarayla karışıp görünmez kalıyordu. Duvarla çakışmaz — poligon duvarların
   * iç yüzüne kadar çekilir, çünkü saydam geçişte renderOrder onu duvarın
   * altında tutmaya yetmiyor (K31).
   */
  roomFill: '#94a3b8',
  roomFillOpacity: 0.16,
  /**
   * Mahal tanımlama kipinde SIRADAKİ mahal. Renk yine seçim mavisi (kip açıkken
   * seçim temizleniyor, karışacak ikinci bir mavi yok) ama dolgu daha dolu:
   * kamera oraya gitse bile hangi hacmin sorulduğu tek bakışta okunmalı.
   */
  roomDefinitionFillOpacity: 0.42,
  roomLabel: '#46505f',
  /** Oda adının arkasındaki rozet: beyaza yakın, dolgu üstünde ad okunur kalsın. */
  roomLabelBadge: '#f7f8fa',
  /** İmleç duvarın üstündeyken: bir tık açık. Seçim DEĞİL, yalnız "buradasın". */
  wallHover: '#4a5468',
  /** Köşe vurgusu duvar vurgusundan da açık — köşe duvarın üstünde durur. */
  cornerHover: '#63708a',
  /** Henüz store'a yazılmamış zincir. */
  preview: '#8a94a3',
  /** İmleç bir hedefe yapıştığında görünen işaret. Sarı değil: tuvalde sarı = gaz hattı. */
  snapMarker: '#0aa06e',
} as const
