// Unit tests for the billing quota logic (pure functions only).
// Run with:  npm run test:billing
// (node --experimental-strip-types --test — no test framework dependency.)

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  currentPeriodStart,
  effectiveCount,
  computeUsage,
  type UsageRow,
} from "../src/lib/billing/usage.ts";
import { effectivePlan, hasFeature, PLANS } from "../src/lib/billing/plans.ts";

const NOW = new Date("2026-07-15T10:00:00Z");

function row(overrides: Partial<UsageRow>): UsageRow {
  return {
    id: "b1",
    plan: "free",
    subscription_status: "none",
    monthly_appointments_count: 0,
    usage_reset_at: "2026-07-01",
    ...overrides,
  };
}

test("currentPeriodStart is the first of the month (UTC)", () => {
  assert.equal(currentPeriodStart(NOW), "2026-07-01");
  assert.equal(currentPeriodStart(new Date("2026-01-31T23:59:59Z")), "2026-01-01");
});

test("lazy reset: counter from a past month reads as zero", () => {
  const stale = row({ monthly_appointments_count: 14, usage_reset_at: "2026-06-01" });
  assert.equal(effectiveCount(stale, NOW), 0);
  const fresh = row({ monthly_appointments_count: 14 });
  assert.equal(effectiveCount(fresh, NOW), 14);
});

test("free plan blocks at 15 and warns at 80%", () => {
  const at12 = computeUsage(row({ monthly_appointments_count: 12 }), NOW);
  assert.equal(at12.nearLimit, true);
  assert.equal(at12.atLimit, false);

  const at15 = computeUsage(row({ monthly_appointments_count: 15 }), NOW);
  assert.equal(at15.atLimit, true);
  assert.equal(at15.percentage, 100);
});

test("stale month unblocks a previously full quota", () => {
  const u = computeUsage(
    row({ monthly_appointments_count: 15, usage_reset_at: "2026-06-01" }),
    NOW,
  );
  assert.equal(u.used, 0);
  assert.equal(u.atLimit, false);
});

test("enterprise is unlimited", () => {
  const u = computeUsage(
    row({ plan: "enterprise_299", subscription_status: "active", monthly_appointments_count: 5000 }),
    NOW,
  );
  assert.equal(u.limit, -1);
  assert.equal(u.atLimit, false);
  assert.equal(u.percentage, 0);
});

test("expired paid subscription behaves as free", () => {
  const plan = effectivePlan("pro_49", "expired");
  assert.equal(plan.id, "free");
  const u = computeUsage(
    row({ plan: "pro_49", subscription_status: "expired", monthly_appointments_count: 20 }),
    NOW,
  );
  assert.equal(u.atLimit, true); // 20 > free's 15
});

test("upgrade raises the ceiling WITHOUT resetting the counter", () => {
  const before = computeUsage(
    row({ plan: "free", monthly_appointments_count: 15 }),
    NOW,
  );
  assert.equal(before.atLimit, true);
  const after = computeUsage(
    row({ plan: "pro_49", subscription_status: "active", monthly_appointments_count: 15 }),
    NOW,
  );
  assert.equal(after.used, 15); // counter preserved
  assert.equal(after.atLimit, false); // ceiling now 60
});

test("feature matrix matches the tier design", () => {
  assert.equal(hasFeature("free", "none", "emails"), false);
  assert.equal(hasFeature("pro_49", "active", "emails"), true);
  assert.equal(hasFeature("pro_49", "active", "analytics"), false);
  assert.equal(hasFeature("center_99", "active", "analytics"), true);
  assert.equal(hasFeature("center_99", "active", "branding"), false);
  assert.equal(hasFeature("enterprise_299", "active", "branding"), true);
  assert.equal(PLANS.center_99.providersLimit, 5);
});
