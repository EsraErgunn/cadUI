import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// globals: false olduğu için RTL kendi afterEach'ini kaydedemiyor, elle bağlıyoruz.
afterEach(cleanup)
