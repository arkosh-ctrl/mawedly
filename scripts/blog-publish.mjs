#!/usr/bin/env node
/**
 * Publish or update a blog post through /api/blog/publish.
 *
 *   node scripts/blog-publish.mjs create draft.json
 *   node scripts/blog-publish.mjs update draft.json
 *   node scripts/blog-publish.mjs list
 *
 * The target is PRODUCTION by default and is set explicitly here — never
 * derived from NEXT_PUBLIC_APP_URL, which points at localhost in development.
 * Writing to a local database looks exactly like success and you find out weeks
 * later that nothing was ever published. Override deliberately with
 * BLOG_API_BASE=http://localhost:3000 when you really mean local.
 *
 * The key is read from BLOG_API_KEY (env, or .env.local as a fallback).
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const DEFAULT_BASE = "https://mawedly.com";

async function loadKey() {
  if (process.env.BLOG_API_KEY) return process.env.BLOG_API_KEY;
  if (!existsSync(".env.local")) return null;
  const text = await readFile(".env.local", "utf8");
  const line = text.split("\n").find((l) => l.startsWith("BLOG_API_KEY="));
  return line ? line.slice("BLOG_API_KEY=".length).trim() : null;
}

function baseUrl() {
  // If the apex redirects to www, use www: a redirected POST arrives without
  // its body, and the request fails in a way that looks like a server bug.
  return (process.env.BLOG_API_BASE ?? DEFAULT_BASE).replace(/\/+$/, "");
}

async function main() {
  const [command, file] = process.argv.slice(2);
  if (!command || !["create", "update", "list"].includes(command)) {
    console.error("usage: blog-publish.mjs <create|update|list> [payload.json]");
    process.exit(2);
  }

  const key = await loadKey();
  if (!key) {
    console.error("BLOG_API_KEY is not set (env or .env.local).");
    process.exit(2);
  }

  const url = `${baseUrl()}/api/blog/publish`;
  const headers = {
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
  };

  let response;
  if (command === "list") {
    response = await fetch(url, { headers, redirect: "error" });
  } else {
    if (!file) {
      console.error("a payload JSON file is required for create/update.");
      process.exit(2);
    }
    const body = await readFile(file, "utf8");
    JSON.parse(body); // fail here rather than server-side on malformed JSON
    response = await fetch(url, {
      method: command === "create" ? "POST" : "PATCH",
      headers,
      body,
      // A redirect would silently drop the body — surface it instead.
      redirect: "error",
    });
  }

  const text = await response.text();
  console.log(`${response.status} ${response.statusText}`);
  console.log(text);
  process.exit(response.ok ? 0 : 1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
