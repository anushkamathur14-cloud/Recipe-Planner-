import { existsSync } from "fs";
import { dirname, join } from "path";

/** Monorepo root (contains packages/db/prisma/schema.prisma). */
export function findMonorepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const schema = join(dir, "packages/db/prisma/schema.prisma");
    if (existsSync(schema)) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(
    "Monorepo root not found (packages/db/prisma/schema.prisma missing)",
  );
}
