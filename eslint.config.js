import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import importX from 'eslint-plugin-import-x'
import unicorn from 'eslint-plugin-unicorn'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// CLAUDE.md: style={{...}} yasak (Tailwind className bu kuralın dışında).
const NO_INLINE_STYLE = {
  selector: "JSXAttribute[name.name='style']",
  message: "style={{...}} yasak — Tailwind className kullan. Özel CSS src/styles/'da.",
}

// CLAUDE.md: dangerouslySetInnerHTML kullanılmaz (XSS).
const NO_DANGEROUS_HTML = {
  selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
  message: 'dangerouslySetInnerHTML kullanılmaz (XSS riski).',
}

// CLAUDE.md: crypto.randomUUID() KULLANILMAZ — id nextUniqueId ile üretilir.
const NO_RANDOM_UUID = {
  selector:
    "CallExpression[callee.object.name='crypto'][callee.property.name='randomUUID']",
  message:
    'crypto.randomUUID() kullanılmaz — kalıcı id nextUniqueId (artan tamsayı) ile üretilir. Bkz. knowledge/id-scheme.md.',
}

const NO_NANOID_IMPORT = {
  name: 'nanoid',
  message:
    'nanoid kullanılmaz — kalıcı id nextUniqueId (artan tamsayı) ile üretilir. Bkz. knowledge/id-scheme.md.',
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'import-x': importX,
      unicorn,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
      // CLAUDE.md: erken return kullanılır.
      'no-else-return': ['error', { allowElseIf: false }],
      // CLAUDE.md: 200+ satır component/dosya bölünür.
      'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
      // CLAUDE.md: değişken/fonksiyon camelCase, bileşen/tip PascalCase,
      // sabit UPPER_SNAKE_CASE, boolean is/has/should ile başlar.
      '@typescript-eslint/naming-convention': [
        'error',
        {
          selector: 'typeLike',
          format: ['PascalCase'],
        },
        {
          selector: 'variable',
          modifiers: ['destructured'],
          format: null,
        },
        {
          selector: 'variable',
          modifiers: ['const', 'global'],
          format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        },
        {
          selector: 'variable',
          format: ['camelCase'],
        },
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase'],
        },
        {
          selector: 'parameter',
          format: ['camelCase'],
          leadingUnderscore: 'allow',
        },
      ],
      'no-restricted-syntax': ['error', NO_INLINE_STYLE, NO_DANGEROUS_HTML, NO_RANDOM_UUID],
      'no-restricted-imports': ['error', { paths: [NO_NANOID_IMPORT] }],
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
        },
      ],
      'import-x/no-restricted-paths': [
        'error',
        {
          zones: [
            {
              target: './src/core',
              from: ['./src/scene', './src/ui', './src/store', './src/app', './src/pages'],
              message: "core/ hiçbir üst katmana bağımlı olamaz (React yok kuralı).",
            },
            {
              target: './src/scene',
              from: './src/ui',
              message: 'scene/ (<Canvas> içi) ui/ (DOM) içe aktaramaz.',
            },
            {
              target: './src/ui',
              from: './src/scene',
              message: 'ui/ (DOM) scene/ (<Canvas> içi) içe aktaramaz.',
            },
          ],
        },
      ],
      // ignore: __tests__ / _tests_ gibi alt çizgiyle sarılmış klasör adları (test convention).
      'unicorn/filename-case': [
        'error',
        { cases: { pascalCase: true, camelCase: true }, ignore: [/^_.*_$/] },
      ],
    },
  },
  {
    // CLAUDE.md: core/ içinde React yok — three.js/react-three-fiber de dahil.
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [NO_NANOID_IMPORT],
          patterns: [
            { group: ['react', 'react-dom', 'react-dom/*'], message: 'core/ içinde React yok.' },
            {
              group: ['@react-three/*', 'three', 'three/*'],
              message: 'core/ içinde Three.js yok — core saf fonksiyon katmanıdır.',
            },
          ],
        },
      ],
    },
  },
  {
    // CLAUDE.md: ui/ = <Canvas> DIŞI (DOM). Three.js/R3F sızmasın.
    files: ['src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [NO_NANOID_IMPORT],
          patterns: [
            {
              group: ['@react-three/*', 'three', 'three/*'],
              message: 'ui/ (DOM) içinde Three.js/R3F yok — bu scene/ dosyası olmalı.',
            },
          ],
        },
      ],
    },
  },
])
