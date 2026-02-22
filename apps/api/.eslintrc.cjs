module.exports = {
  root: true,
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
  parserOptions: {
    project: ["./tsconfig.eslint.json"],
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ["dist/", "node_modules/"],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/prefer-as-const": "off",
    "no-constant-condition": "off",
    "no-useless-escape": "off",
  },
  overrides: [
    {
      files: [
        "**/*.spec.ts",
        "**/*.test.ts",
        "test/**/*.ts",
        "src/**/*.spec.ts",
        "src/**/*.test.ts",
      ],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unused-vars": "off",
      },
    },
  ],
};
