import '@testing-library/jest-dom/vitest'

import { configure } from '@testing-library/dom'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

/**
 * `waitFor`/`findBy*` bekleme süresi. Varsayılan 1 sn, suite paralel çalışırken
 * yetmiyordu: sorgu çözülmesini bekleyen testler makinenin yüküne göre bazen
 * geçip bazen düşüyordu (kod değişmeden).
 *
 * Süreyi uzatmak GEÇEN bir testi düşüremez, yalnız yavaş olana zaman tanır;
 * gerçekten kırık bir beklenti yine başarısız olur, sadece daha geç.
 */
configure({ asyncUtilTimeout: 5000 })

// globals: false olduğu için RTL kendi afterEach'ini kaydedemiyor, elle bağlıyoruz.
afterEach(cleanup)
