#!/usr/bin/env node

const { emitUsage, parseEmitArgs, writeStatusFile } = require("../build/src/main/status-writer.js");

async function main() {
  const args = parseEmitArgs(process.argv.slice(2));
  if (!args.file) {
    console.error(emitUsage());
    process.exit(2);
  }
  const result = await writeStatusFile(args.file, args);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
