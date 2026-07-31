// Auth cases for the blog publishing key. The route handler itself needs a
// server, but the decision it makes lives in one pure-ish function, so the
// three cases that matter are testable directly.
//
// Run with:  npm run test:blog

import { test } from "node:test";
import assert from "node:assert/strict";
import { authorizeBlogApi } from "../src/lib/blog/auth.ts";

const KEY = "0123456789abcdef0123456789abcdef";

function request(authorization?: string): Request {
  return new Request("https://mawedly.com/api/blog/publish", {
    headers: authorization ? { authorization } : {},
  });
}

test("no key configured is CLOSED, never open", () => {
  delete process.env.BLOG_API_KEY;
  assert.equal(authorizeBlogApi(request(`Bearer ${KEY}`)), "not_configured");
  assert.equal(authorizeBlogApi(request()), "not_configured");
});

test("a too-short key counts as unconfigured", () => {
  process.env.BLOG_API_KEY = "short";
  assert.equal(authorizeBlogApi(request("Bearer short")), "not_configured");
});

test("missing header is rejected", () => {
  process.env.BLOG_API_KEY = KEY;
  assert.equal(authorizeBlogApi(request()), "unauthorized");
});

test("wrong key is rejected", () => {
  process.env.BLOG_API_KEY = KEY;
  assert.equal(authorizeBlogApi(request(`Bearer ${"f".repeat(32)}`)), "unauthorized");
  // Same prefix, different tail — must not pass.
  assert.equal(
    authorizeBlogApi(request(`Bearer ${KEY.slice(0, 31)}0`)),
    "unauthorized",
  );
  // A prefix of the real key must not pass either.
  assert.equal(
    authorizeBlogApi(request(`Bearer ${KEY.slice(0, 20)}`)),
    "unauthorized",
  );
});

test("a non-bearer scheme is rejected", () => {
  process.env.BLOG_API_KEY = KEY;
  assert.equal(authorizeBlogApi(request(`Basic ${KEY}`)), "unauthorized");
  assert.equal(authorizeBlogApi(request(KEY)), "unauthorized");
});

test("the right key is accepted, case-insensitively on the scheme", () => {
  process.env.BLOG_API_KEY = KEY;
  assert.equal(authorizeBlogApi(request(`Bearer ${KEY}`)), "ok");
  assert.equal(authorizeBlogApi(request(`bearer ${KEY}`)), "ok");
});
