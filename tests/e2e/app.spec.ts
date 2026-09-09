import { test, expect } from "@playwright/test";
test("MCP suggestions, favorites, private home persistence and deletion", async ({
  page,
  context,
}) => {
  const bodies: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/mcp")) bodies.push(r.postData() || "");
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /いつもの道に、\s*小さな発見を。/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "寄り道をさがす", exact: true })
    .last()
    .click();
  await expect(page.locator(".spot-card").first()).toBeVisible();
  expect(bodies.some((x) => x.includes("tools/call"))).toBe(true);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  await page.locator(".favorite").first().click();
  await expect(page.locator(".favorite").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: "自宅", exact: true }).click();
  await page.getByPlaceholder("自宅", { exact: true }).fill("秘密の自宅");
  await page.getByPlaceholder("例：大阪市北区…").fill("非公開の住所123");
  await page
    .getByRole("spinbutton", { name: "緯度", exact: true })
    .fill("34.701234");
  await page
    .getByRole("spinbutton", { name: "経度", exact: true })
    .fill("135.501234");
  await page.getByRole("button", { name: "この場所を保存して選ぶ" }).click();
  await page.reload();
  await page.getByRole("button", { name: "自宅", exact: true }).click();
  await expect(page.locator(".location-input").first()).toContainText(
    "秘密の自宅",
  );
  await page
    .getByRole("button", { name: "寄り道をさがす", exact: true })
    .last()
    .click();
  await expect(page.locator(".spot-card").first()).toBeVisible();
  expect(bodies.join("")).not.toContain("秘密の自宅");
  expect(bodies.join("")).not.toContain("非公開の住所");
  expect(bodies.join("")).not.toContain("34.701234");
  const isolated = await context.browser()!.newContext();
  const other = await isolated.newPage();
  await other.goto("http://127.0.0.1:5173/");
  expect(
    await other.evaluate(() => localStorage.getItem("yorimichi.private.v1")),
  ).toBeNull();
  await isolated.close();
  await page.getByRole("button", { name: "このブラウザだけに保存" }).click();
  await page
    .getByRole("button", { name: "このアプリの保存データをすべて削除" })
    .click();
  await page.getByRole("button", { name: "削除する", exact: true }).click();
  expect(
    await page.evaluate(() => localStorage.getItem("yorimichi.private.v1")),
  ).toBeNull();
});
test("mobile layout and no external requests without consent", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const external: string[] = [];
  page.on("request", (r) => {
    if (!r.url().startsWith("http://127.0.0.1:5173")) external.push(r.url());
  });
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "地図を表示する" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(external).toEqual([]);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
});
