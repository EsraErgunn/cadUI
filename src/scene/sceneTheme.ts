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
  /** Duvarın TEK rengi — kontur yok, düz dolgu (K23). */
  wallFill: '#6b7280',
  /**
   * Oda dolgusu SAYDAMDIR: ızgara altından okunmaya devam etsin, oda çizimi
   * bastırmasın. Opak denendiğinde ya ızgarayı siliyor ya da (soluk tonda)
   * ızgarayla karışıp görünmez kalıyordu. Duvarla çakışmaz — poligon duvarların
   * iç yüzüne kadar çekilir, çünkü saydam geçişte renderOrder onu duvarın
   * altında tutmaya yetmiyor (K31).
   */
  roomFill: '#8a94a3',
  roomFillOpacity: 0.22,
  /**
   * Mahal tanımlama kipinde SIRADAKİ mahal. Renk yine seçim mavisi (kip açıkken
   * seçim temizleniyor, karışacak ikinci bir mavi yok) ama dolgu daha dolu:
   * kamera oraya gitse bile hangi hacmin sorulduğu tek bakışta okunmalı.
   */
  roomDefinitionFillOpacity: 0.42,
  roomLabel: '#5b6675',
  /** Oda adının arkasındaki rozet: beyaza yakın, dolgu üstünde ad okunur kalsın. */
  roomLabelBadge: '#f7f8fa',
  /** İmleç duvarın üstündeyken: bir tık açık. Seçim DEĞİL, yalnız "buradasın". */
  wallHover: '#8c93a0',
  /** Köşe vurgusu duvar vurgusundan da açık — köşe duvarın üstünde durur. */
  cornerHover: '#a6adb8',
  /** Henüz store'a yazılmamış zincir. */
  preview: '#8a94a3',
  /** İmleç bir hedefe yapıştığında görünen işaret. Sarı değil: tuvalde sarı = gaz hattı. */
  snapMarker: '#0aa06e',
} as const
