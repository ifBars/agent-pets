#!/usr/bin/env node

const { validatePetPackage } = require("../src/main/validate-pet.cjs");

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: agent-pets-validate <path-to-pet-folder>");
    process.exit(2);
  }
  const result = await validatePetPackage(target);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
