export default [
  {
    files: ['**/*.js'],
    ignores: [
      'public/**',
      'site/**',
      'output/**',
      'outputs/**',
      'tmp/**',
      'node_modules/**'
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        Blob: 'readonly',
        CSS: 'readonly',
        FormData: 'readonly',
        Intl: 'readonly',
        Map: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        atob: 'readonly',
        confirm: 'readonly',
        crypto: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        navigator: 'readonly',
        requestAnimationFrame: 'readonly',
        setInterval: 'readonly',
        setTimeout: 'readonly',
        window: 'readonly'
      }
    },
    rules: {
      'constructor-super': 'error',
      'no-constant-condition': 'error',
      'no-duplicate-case': 'error',
      'no-dupe-keys': 'error',
      'no-func-assign': 'error',
      'no-invalid-regexp': 'error',
      'no-irregular-whitespace': 'error',
      'no-new-native-nonconstructor': 'error',
      'no-obj-calls': 'error',
      'no-self-assign': 'error',
      'no-sparse-arrays': 'error',
      'no-unexpected-multiline': 'error',
      'no-unreachable': 'error',
      'no-unsafe-finally': 'error',
      'no-unused-vars': 'off',
      'no-undef': 'off'
    }
  }
];
