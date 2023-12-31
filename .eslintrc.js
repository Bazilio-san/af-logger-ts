module.exports = {
  root: true,
  extends: [
    'eslint-config-af-22',
  ],
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    jest: true,
  },
  globals: {},
  parser: '@typescript-eslint/parser',
  parserOptions: { sourceType: 'module' },
  plugins: ['prefer-arrow', 'import', '@typescript-eslint'],
  ignorePatterns: [
    '_tmp/',
    'node_modules/',
    '**/*.json',
    '**/dist/**/*.*',
  ],
  rules: {},
};
