module.exports = {
  root: true,
  env: {
    browser: true,
    node: true
  },
  parserOptions: {
    parser: 'babel-eslint',
    sourceType: 'module'
  },
  extends: ['eslint:recommended'],
  // add your custom rules here
  rules: {
    'no-unused-vars': 'warn',
    'no-case-declarations': 'off',
    'no-console': 'off'
  }
}
