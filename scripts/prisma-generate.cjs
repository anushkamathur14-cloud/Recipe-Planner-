const { existsSync } = require("fs");
const { join } = require("path");
const { execSync } = require("child_process");

const candidates = [
  join(__dirname, "../packages/db/prisma/schema.prisma"),
  join(__dirname, "../../packages/db/prisma/schema.prisma"),
  join(process.cwd(), "packages/db/prisma/schema.prisma"),
  join(process.cwd(), "../packages/db/prisma/schema.prisma"),
];

const schema = candidates.find(existsSync);

if (!schema) {
  console.error("Prisma schema not found. Tried:");
  candidates.forEach((p) => console.error("  -", p));
  console.error("\nEnsure Railway Root Directory is the repo root (not apps/worker).");
  process.exit(1);
}

console.log("Using Prisma schema:", schema);
execSync(`npx prisma generate --schema="${schema}"`, { stdio: "inherit" });
