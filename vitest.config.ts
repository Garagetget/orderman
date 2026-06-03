import { defineConfig } from "vitest/config";

// Unit tests cover pure logic only (lib/**), so the default node environment is
// enough — no jsdom, no React. Test files import their target by relative path,
// so the tsconfig "@/..." alias isn't needed here.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
});
