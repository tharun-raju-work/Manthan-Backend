module.exports = {
  '*.{js,jsx}': [
    'eslint --fix',
    'prettier --write',
  ],
  '*.{json,md,yml}': [
    'prettier --write',
  ],
}; 