import { inflateSync } from 'node:zlib'
import { readFileSync, writeFileSync } from 'node:fs'

/*
 * WOFF → TTF (sfnt). Tek seferlik varlık dönüşümü; çalışma zamanında koşmaz.
 *
 * Neden gerekli: jsPDF gömülü font olarak TTF/OTF bekliyor, WOFF açmıyor.
 * Depoda hazır bir TTF yok, sahnenin kullandığı `roboto-regular.woff` var.
 * İnternetten yeni font indirmek yerine var olanı çeviriyoruz — aynı yazı tipi
 * hem ekranda hem PDF'te, ikinci bir lisans/sürüm takibi yok.
 *
 * WOFF, sfnt tablolarını tek tek zlib ile sıkıştırıp 44 baytlık bir başlık ve
 * 20 baytlık kayıtlardan oluşan dizinle saklar (W3C WOFF 1.0). Geri dönüşüm
 * tabloları açıp standart sfnt yerleşimiyle yeniden dizmekten ibaret.
 */

const WOFF_HEADER_BYTES = 44
const WOFF_ENTRY_BYTES = 20
const SFNT_HEADER_BYTES = 12
const SFNT_RECORD_BYTES = 16

/** sfnt tabloları 4 bayta hizalanır; aradaki dolgu sıfırdır. */
function padTo4(length) {
  return (4 - (length % 4)) % 4
}

function readWoffTables(woff) {
  if (woff.toString('latin1', 0, 4) !== 'wOFF') throw new Error('wOFF imzası yok')

  const numTables = woff.readUInt16BE(12)
  const tables = []

  for (let index = 0; index < numTables; index += 1) {
    const entry = WOFF_HEADER_BYTES + index * WOFF_ENTRY_BYTES
    const tag = woff.toString('latin1', entry, entry + 4)
    const offset = woff.readUInt32BE(entry + 4)
    const compLength = woff.readUInt32BE(entry + 8)
    const origLength = woff.readUInt32BE(entry + 12)
    const checksum = woff.readUInt32BE(entry + 16)

    const raw = woff.subarray(offset, offset + compLength)
    // compLength === origLength ise tablo SIKIŞTIRILMAMIŞ saklanmıştır.
    const data = compLength < origLength ? inflateSync(raw) : Buffer.from(raw)
    if (data.length !== origLength) {
      throw new Error(`${tag}: açılan boy ${data.length}, beklenen ${origLength}`)
    }

    tables.push({ tag, checksum, data })
  }

  // sfnt kayıtları TAG SIRASINA göre dizilir.
  tables.sort((left, right) => (left.tag < right.tag ? -1 : left.tag > right.tag ? 1 : 0))
  return { flavor: woff.readUInt32BE(4), tables }
}

function buildSfnt(flavor, tables) {
  const count = tables.length
  // Arama alanı alanları sfnt başlığının ikili arama yardımcıları; biçim gereği.
  const entrySelector = Math.floor(Math.log2(count))
  const searchRange = 2 ** entrySelector * 16
  const rangeShift = count * 16 - searchRange

  const header = Buffer.alloc(SFNT_HEADER_BYTES)
  header.writeUInt32BE(flavor, 0)
  header.writeUInt16BE(count, 4)
  header.writeUInt16BE(searchRange, 6)
  header.writeUInt16BE(entrySelector, 8)
  header.writeUInt16BE(rangeShift, 10)

  const directory = Buffer.alloc(count * SFNT_RECORD_BYTES)
  const bodies = []
  let offset = SFNT_HEADER_BYTES + directory.length

  tables.forEach((table, index) => {
    const record = index * SFNT_RECORD_BYTES
    directory.write(table.tag, record, 4, 'latin1')
    directory.writeUInt32BE(table.checksum, record + 4)
    directory.writeUInt32BE(offset, record + 8)
    directory.writeUInt32BE(table.data.length, record + 12)

    const padding = padTo4(table.data.length)
    bodies.push(table.data, Buffer.alloc(padding))
    offset += table.data.length + padding
  })

  return Buffer.concat([header, directory, ...bodies])
}

const [, , inputPath, outputPath] = process.argv
if (!inputPath || !outputPath) {
  throw new Error('kullanım: node scripts/woffToTtf.mjs <girdi.woff> <çıktı.ttf>')
}

const { flavor, tables } = readWoffTables(readFileSync(inputPath))
const ttf = buildSfnt(flavor, tables)
writeFileSync(outputPath, ttf)

console.log(`${inputPath} -> ${outputPath}`)
console.log(`tablo: ${tables.length} (${tables.map((table) => table.tag).join(' ')})`)
console.log(`boyut: ${ttf.length} bayt`)
