/**
 * Metni dosya olarak indirtir. Sunucuya uğramaz — indirilen içerik zaten
 * istemcide üretiliyor.
 */
export function downloadTextFile(fileName: string, text: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName

  // Safari, DOM'da olmayan bir bağlantının click()'ini yok sayıyor.
  document.body.append(anchor)
  anchor.click()
  anchor.remove()

  // Bir sonraki tick'te bırakılıyor: click indirmeyi senkron başlatsa da hemen
  // revoke etmek bazı tarayıcılarda indirmeyi yarıda kesiyor.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
