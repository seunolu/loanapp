module.exports = {
  '*.{js,jsx,ts,tsx,json,md,yml,yaml}': ['prettier --write'],
  '*.{js,jsx,ts,tsx}': ['eslint --fix'],
};
