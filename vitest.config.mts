import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
    server: {
      deps: {
        inline: ["@scopelift/stealth-address-sdk"],
      },
    },
  },
});
