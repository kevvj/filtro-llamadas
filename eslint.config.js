const { defineConfig } = require("eslint/config")
const expoConfig = require("eslint-config-expo/flat")

module.exports = defineConfig([
  expoConfig,
  { ignores: ["android/*", "ios/*", "dist/*", ".expo/*", "node_modules/*"] },
  {
    rules: {
      // nada de ejecutar texto como código ni dejar trazas
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
      "no-console": "error",
      "no-debugger": "error",
    },
  },
])
