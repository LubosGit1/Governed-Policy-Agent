import { expect, test } from "@playwright/test";

const adminData = {
  metrics: { requests: 2, refusals: 1, escalationRate: 0.5, averageLatencyMs: 24 },
  requests: [{
    requestId: "e2e-request-1",
    redactedInput: "Is water damage covered?",
    retrievedChunkIds: ["water-damage#001"],
    toolCalls: ["search_policy_docs"],
    approvals: [],
    model: "mock-v1",
    latencyMs: 24,
    inputTokens: 10,
    outputTokens: 12,
    refused: false,
    escalationOffered: false,
    createdAt: "2026-01-01T00:00:00.000Z",
  }],
};

test("chat displays grounded answer and source citations", async ({ page }) => {
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      json: {
        requestId: "chat-request-1",
        answer: "Sudden accidental escape of water from a fixed pipe may be covered.",
        citations: [{ sourceId: "water-damage#001", title: "Escape of Water" }],
        refused: false,
        escalationOffered: false,
      },
    });
  });

  await page.goto("/");
  await page.getByLabel("What would you like to know?").fill("Is sudden water escape covered?");
  await page.getByRole("button", { name: "Ask the policy assistant" }).click();

  await expect(page.getByText("Sudden accidental escape of water from a fixed pipe may be covered."))
    .toBeVisible();
  await expect(page.getByText("water-damage#001")).toBeVisible();
  await expect(page.getByText("Escape of Water", { exact: true })).toBeVisible();
  if (process.env.CAPTURE_SCREENSHOTS) {
    await page.screenshot({ path: "docs/screenshots/chat.png", fullPage: true });
  }
});

test("handoff requires a deliberate approval dialog action", async ({ page }) => {
  let handoffCalls = 0;
  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      json: {
        requestId: "chat-request-2",
        answer: "I could not find enough approved policy information.",
        citations: [],
        refused: true,
        escalationOffered: true,
      },
    });
  });
  await page.route("**/api/handoffs", async (route) => {
    handoffCalls += 1;
    await route.fulfill({ status: 201, json: { ticketId: "b5258971-3f63-4a4b-b8e1-acde7c9774fd" } });
  });

  await page.goto("/");
  await page.getByLabel("What would you like to know?").fill("Will my lunar telescope be insured?");
  await page.getByRole("button", { name: "Ask the policy assistant" }).click();
  await page.getByRole("button", { name: "Request human review" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  expect(handoffCalls).toBe(0);
  await page.getByRole("button", { name: "Approve and send" }).click();
  await expect(page.getByText(/Your request was sent to the claims team/)).toBeVisible();
  expect(handoffCalls).toBe(1);
});

test("admin dashboard requires authentication and shows audited metrics after login", async ({ page, context }) => {
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin access" })).toBeVisible();

  await context.addCookies([{
    name: "policy_admin_session",
    value: process.env.ADMIN_API_KEY ?? "test-admin-key",
    domain: "127.0.0.1",
    path: "/",
    httpOnly: true,
    sameSite: "Strict",
  }]);
  await page.route("**/api/admin/data", async (route) => {
    await route.fulfill({ json: adminData });
  });
  await page.goto("/admin");

  await expect(page.getByRole("heading", { name: "Admin dashboard" })).toBeVisible();
  await expect(page.getByText("Escalation rate")).toBeVisible();
  await expect(page.getByText("Export CSV")).toBeVisible();
  await expect(page.getByText("water-damage#001")).toBeVisible();
  if (process.env.CAPTURE_SCREENSHOTS) {
    await page.screenshot({ path: "docs/screenshots/admin.png", fullPage: true });
  }
});
