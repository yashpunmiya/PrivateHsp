import { expect, test } from "@playwright/test";

test("supplier agent workbench keeps optional A2A checks available", async ({ page }) => {
  await page.goto("/agents");
  await expect(page.getByRole("heading", { name: "A network built for accountable decisions." })).toBeVisible();
  await expect(page.locator(".network-connector")).toHaveCount(0);
  await page.getByText("Supplier service test tools").click();
  await page.getByRole("button", { name: "Request market analysis" }).click();
  await expect(page.locator("pre").first()).toContainText('"mean": 102.75');
  await page.getByRole("button", { name: "Request research brief" }).click();
  await expect(page.locator("pre").nth(1)).toContainText("market growth increased");
});

test("buyer ranks signed offers, enforces policy, approves the exact quote, and blocks safely while HSP is unavailable", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/agents#procurement");
  const offersResponse = page.waitForResponse((response) => response.url().includes("/api/agents/offers") && response.request().method() === "GET");
  await page.getByRole("button", { name: "Load signed supplier offers" }).click();
  const offers = await offersResponse;
  expect(offers.status(), "Two configured, signed supplier identities are required for the full demo").toBe(200);

  await expect(page.locator(".offer-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Add both verified suppliers to the allowlist" }).click();
  await page.getByLabel("Maximum amount in token base units").fill("1000000");
  const procurementResponse = page.waitForResponse((response) => response.url().includes("/api/buyer/procurement") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Evaluate offers with Vertex" }).click();
  const response = await procurementResponse;
  expect(response.status(), await response.text()).toBe(202);
  await expect(page.locator(".recommendation-panel")).toContainText("VERTEX AI RECOMMENDATION", { timeout: 45_000 });
  await page.getByRole("button", { name: "Approve this exact quote" }).click();
  await expect(page.getByRole("heading", { name: "Authorization recorded" })).toBeVisible();
  await expect(page.locator(".gateway-step")).toHaveCount(6);
  await expect(page.getByText(/no HSP order, wallet signature, payment submission, or settlement verification has occurred/i)).toBeVisible();
  const checkpointResponse = page.waitForResponse((response) => response.url().includes("/api/hsp/workflow") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Continue workflow" }).click();
  const checkpoint = await checkpointResponse;
  expect(checkpoint.ok()).toBe(true);
  expect(await checkpoint.json()).toMatchObject({ gatewayRequestSent: false, walletSignatureProduced: false, paymentSubmitted: false, settlementVerified: false });
  await expect(page.locator(".gateway-step").first()).toContainText("Checkpoint saved locally");
  for (let i = 1; i < 6; i += 1) {
    await page.getByRole("button", { name: "Continue workflow" }).click();
    await expect(page.locator(".gateway-step").nth(i)).toContainText("Checkpoint saved locally");
  }
  await expect(page.getByText("Workflow checkpoints complete")).toBeVisible();
  await expect(page.getByText("No HSP payment exists for this request.")).toBeVisible();
  await expect(page.getByText("Earlier Sepolia testnet transactions")).toBeVisible();
  await expect(page.getByText(/not payments to the fresh address above/)).toBeVisible();
});

test("a failed Vertex evaluation retries the same request without discarding signed offers", async ({ page }) => {
  await page.goto("/agents#procurement");
  await page.getByRole("button", { name: "Load signed supplier offers" }).click();
  await expect(page.locator(".offer-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Add both verified suppliers to the allowlist" }).click();
  await page.getByLabel("Maximum amount in token base units").fill("1000000");

  let attempts = 0;
  await page.route("**/api/buyer/procurement", async (route) => {
    attempts += 1;
    await route.fulfill({ status: 504, contentType: "application/json", body: JSON.stringify({ error: "procurement_failed", message: "Vertex AI supplier evaluation timed out (HTTP 504)" }) });
  });
  await page.getByRole("button", { name: "Evaluate offers with Vertex" }).click();
  await expect(page.locator(".form-alert")).toContainText("timed out (HTTP 504)");
  await page.getByRole("button", { name: "Retry evaluation" }).click();
  await expect.poll(() => attempts).toBe(2);
  await expect(page.locator(".offer-card")).toHaveCount(2);
});

test("approved order advances through local checkpoints without external payment effects", async ({ page }, testInfo) => {
  await page.goto("/agents#procurement");
  await page.getByRole("button", { name: "Load signed supplier offers" }).click();
  await expect(page.locator(".offer-card")).toHaveCount(2);
  await page.getByRole("button", { name: "Add both verified suppliers to the allowlist" }).click();
  await page.getByLabel("Maximum amount in token base units").fill("1000000");

  let firstRanking = true;
  await page.route("**/api/buyer/procurement", async (route) => {
    const payload = route.request().postDataJSON() as { payerApproved?: boolean; offers?: Array<{ agentId: string }> };
    if (firstRanking && !payload.payerApproved && payload.offers?.[0]) {
      firstRanking = false;
      await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({
        status: "awaiting-human-approval",
        recommendation: { selectedAgentId: payload.offers[0].agentId, rationale: "Ranking fixture used to isolate the approval and checkpoint UI." },
        selectedOffer: payload.offers[0],
        policy: { allowed: false, reason: "human-approval-required" },
      }) });
      return;
    }
    await route.continue();
  });
  await page.getByRole("button", { name: "Evaluate offers with Vertex" }).click();
  await expect(page.locator(".recommendation-panel")).toBeVisible();
  await page.getByRole("button", { name: "Approve this exact quote" }).click();
  await expect(page.getByRole("heading", { name: "Authorization recorded" })).toBeVisible();

  for (let i = 0; i < 6; i += 1) {
    await page.getByRole("button", { name: "Continue workflow" }).click();
    await expect(page.locator(".gateway-step").nth(i)).toContainText("Checkpoint saved locally");
  }
  await expect(page.getByText("Workflow checkpoints complete")).toBeVisible();
  await expect(page.getByText("No HSP payment exists for this request.")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("workflow-checkpoints.png"), fullPage: true });
});

test("audit screen rejects forged evidence and verifies the recorded Sepolia transfer", async ({ page }) => {
  await page.goto("/audit");
  await expect(page.getByRole("heading", { name: "Verify what happened on-chain." })).toBeVisible();
  await expect(page.getByText(/not an HSP Gateway payment/)).toBeVisible();
  await page.getByText("Advanced evidence input").click();
  await page.getByLabel("Evidence JSON").fill('{"forged":true}');
  await page.getByRole("button", { name: "Verify custom evidence" }).click();
  await expect(page.locator("pre")).toContainText('"valid": false');
  await expect(page.locator("pre")).toContainText('"hspSettlementVerified": false');
  await page.getByRole("button", { name: "Verify this payment" }).click();
  await expect(page.locator("pre")).toContainText('"evidenceType": "sepolia-usdc-transfer"');
  await expect(page.locator("pre")).toContainText('"valid": true');
  await expect(page.locator("pre")).toContainText('"hspSettlementVerified": false');
});

test("stealth identity derives a one-time recipient recognized locally", async ({ page }) => {
  await page.goto("/app#private-receiving");
  await page.getByRole("button", { name: "Generate identity" }).click();
  await expect(page.getByText("Supplier identity ready")).toBeVisible();
  await page.getByRole("button", { name: "Generate one-time address" }).click();
  await expect(page.getByText("Recognized by supplier identity")).toBeVisible();
  await expect(page.getByText(/Local derivation only\. No announcement or transfer was sent\./)).toBeVisible();
});
