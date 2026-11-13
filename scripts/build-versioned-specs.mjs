#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

const SPECS = [
  {
    source: "screening-api-docs/api.json",
    v1: "screening-api-docs/v1/api.json",
    v2: "screening-api-docs/v2/api.json",
    v2Patch: "screening-api-docs/v2/patch.json",
  },
];

const PARTNER_V1_PREFIX = "/partner/v1/";
const PARTNER_V2_PREFIX = "/partner/v2/";

function rewritePartnerVersion(value) {
  if (typeof value === "string") return value.replaceAll(PARTNER_V1_PREFIX, PARTNER_V2_PREFIX);
  if (Array.isArray(value)) return value.map(rewritePartnerVersion);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [rewritePartnerVersion(key), rewritePartnerVersion(child)]),
    );
  }
  return value;
}

function decodePointer(pointer) {
  if (!pointer.startsWith("/")) throw new Error(`JSON pointer must start with "/": ${pointer}`);
  return pointer
    .slice(1)
    .split("/")
    .map((token) => token.replaceAll("~1", "/").replaceAll("~0", "~"));
}

// Subset of RFC 6902: only "add" and "replace", which is all a version overlay needs.
function applyPatch(document, operations) {
  for (const { op, path, value } of operations) {
    const tokens = decodePointer(path);
    const key = tokens.pop();
    let parent = document;
    for (const token of tokens) {
      if (!(token in parent)) throw new Error(`${op} ${path}: "${token}" does not exist`);
      parent = parent[token];
    }
    if (op === "replace" && !(key in parent)) throw new Error(`replace ${path}: target does not exist`);
    if (op === "add" && key in parent) throw new Error(`add ${path}: target already exists, use replace`);
    if (op !== "add" && op !== "replace") throw new Error(`Unsupported patch op "${op}" at ${path}`);
    parent[key] = value;
  }
  return document;
}

function buildOutputs(spec) {
  const sourceText = readFileSync(join(repoRoot, spec.source), "utf8");
  const v2Operations = JSON.parse(readFileSync(join(repoRoot, spec.v2Patch), "utf8"));
  const v2Document = applyPatch(rewritePartnerVersion(JSON.parse(sourceText)), v2Operations);
  return [
    { path: spec.v1, text: sourceText },
    { path: spec.v2, text: JSON.stringify(v2Document, null, 2) },
  ];
}

function main() {
  const checkOnly = process.argv.includes("--check");
  const stale = [];

  for (const spec of SPECS) {
    for (const output of buildOutputs(spec)) {
      const target = join(repoRoot, output.path);
      const current = existsSync(target) ? readFileSync(target, "utf8") : null;
      if (current === output.text) continue;
      if (checkOnly) {
        stale.push(output.path);
        continue;
      }
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, output.text);
      console.log(`wrote ${relative(repoRoot, target)}`);
    }
  }

  if (stale.length > 0) {
    console.error(
      `Out of date: ${stale.join(", ")}\nEdit the source spec or the v2 patch, then run: node scripts/build-versioned-specs.mjs`,
    );
    process.exit(1);
  }
  if (checkOnly) console.log("Versioned specs are up to date.");
}

main();
