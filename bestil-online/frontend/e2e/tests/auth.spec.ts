/**
 * Authentication and authorization tests (45–57).
 * Covers: registration, login, logout, role enforcement, profile management.
 */
import { test, expect } from "../fixtures";
import { SEED, apiCreateAddress, apiGetAddresses, uniq } from "../helpers/api";

// ─── 45. Register new customer ─────────────────────────────────────────────────
test("45. new customer can register with valid credentials", async ({ page }) => {
  const email = `test-${uniq()}@e2e.dk`;
  await page.goto("/register");
  await page.locator('input[name="firstName"]').fill("Test");
  await page.locator('input[name="lastName"]').fill("User");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("TestPass123!");
  await page.getByRole("button", { name: /Opret konto/i }).click();

  // Should redirect to home or dashboard, not stay on register
  await expect(page).not.toHaveURL(/\/register/, { timeout: 15_000 });
});

// ─── 46. Register with duplicate email shows error ─────────────────────────────
test("46. registering with an existing email shows an error", async ({ page }) => {
  await page.goto("/register");
  await page.locator('input[name="firstName"]').fill("Test");
  await page.locator('input[name="lastName"]').fill("User");
  await page.locator('input[name="email"]').fill(SEED.customer.email);
  await page.locator('input[name="password"]').fill("TestPass123!");
  await page.getByRole("button", { name: /Opret konto/i }).click();

  // Error should appear on the page
  await expect(
    page.getByRole("alert").or(page.locator("p.text-red-500, .text-destructive")).first()
  ).toBeVisible({ timeout: 10_000 });
});

// ─── 47. Login with wrong password fails ──────────────────────────────────────
test("47. login with wrong password shows error message", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(SEED.customer.email);
  await page.locator('input[name="password"]').fill("WrongPassword!");
  await page.getByRole("button", { name: /Log ind/i }).click();

  await expect(
    page.locator("p.text-red-500").or(page.locator(".text-destructive, [role='alert']")).first()
  ).toBeVisible({ timeout: 10_000 });
});

// ─── 48. Login with correct credentials succeeds ──────────────────────────────
test("48. login with correct credentials redirects authenticated user", async ({ page }) => {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(SEED.customer.email);
  await page.locator('input[name="password"]').fill(SEED.customer.password);

  const [response] = await Promise.all([
    page.waitForResponse("**/auth/login"),
    page.getByRole("button", { name: /Log ind/i }).click(),
  ]);

  // Rate limit can fire when the full suite exhausts the 5/min window
  if (response.status() === 429) { test.skip(true, "Rate limited — run in isolation"); return; }
  expect(response.ok()).toBe(true);
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
});

// ─── 49. Logout clears session ────────────────────────────────────────────────
test("49. logged-in user can log out and is redirected", async ({ customerPage }) => {
  await customerPage.goto("/");
  await customerPage.waitForLoadState("networkidle");

  // The logout button (icon-only, aria-label="Log ud") calls navigate("/login")
  await customerPage.getByRole("button", { name: "Log ud" }).click({ timeout: 10_000 });

  // handleLogout navigates to /login — verify we land there
  // (Don't do another goto() after logout: the auth mock would re-bootstrap auth)
  await expect(customerPage).toHaveURL(/\/login/, { timeout: 10_000 });
});

// ─── 50. Customer cannot access owner routes ──────────────────────────────────
test("50. customer is redirected from owner routes", async ({ customerPage }) => {
  await customerPage.goto("/restaurant/dashboard");
  // RequireRole redirects non-owners to /
  await expect(customerPage).not.toHaveURL(/\/restaurant\/dashboard/, { timeout: 10_000 });
});

// ─── 51. Customer cannot access admin routes ──────────────────────────────────
test("51. customer is redirected from admin routes", async ({ customerPage }) => {
  await customerPage.goto("/admin/dashboard");
  await expect(customerPage).not.toHaveURL(/\/admin\/dashboard/, { timeout: 10_000 });
});

// ─── 52. Owner cannot access admin routes ────────────────────────────────────
test("52. restaurant owner is redirected from admin routes", async ({ ownerPage }) => {
  await ownerPage.goto("/admin/dashboard");
  await expect(ownerPage).not.toHaveURL(/\/admin\/dashboard/, { timeout: 10_000 });
});

// ─── 53. Unauthenticated user cannot access protected API ─────────────────────
test("53. unauthenticated request to protected API returns 401", async ({ request }) => {
  const res = await request.get("http://localhost:4000/api/v1/orders");
  expect(res.status()).toBe(401);
});

// ─── 54. Register as restaurant owner ─────────────────────────────────────────
test("54. can register a new user and land outside /register", async ({ page }) => {
  const email = `owner-${uniq()}@e2e.dk`;

  // RegisterPage auto-logs-in after register, which hits /auth/login.
  // Mock it to avoid the rate-limit that fires mid-suite (5/min shared with global-setup).
  await page.route("**/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          accessToken: "mock-register-token",
          user: { id: "mock-id", email, firstName: "Test", lastName: "Owner", role: "CUSTOMER", emailVerified: false, isActive: true, phone: null, profilePicture: null },
        },
      }),
    });
  });

  await page.goto("/register");
  await page.locator('input[name="firstName"]').fill("Test");
  await page.locator('input[name="lastName"]').fill("Owner");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill("TestPass123!");
  await page.getByRole("button", { name: /Opret konto/i }).click();

  // Should land somewhere other than /register
  await expect(page).not.toHaveURL(/\/register/, { timeout: 15_000 });
});

// ─── 55. Profile update persists ──────────────────────────────────────────────
test("55. customer can update their profile via API", async ({ customerToken, request }) => {
  const res = await request.patch("http://localhost:4000/api/v1/users/me", {
    data: { firstName: "Updated", lastName: "Name" },
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { data: { firstName: string } };
  expect(body.data.firstName).toBe("Updated");

  // Restore
  await request.patch("http://localhost:4000/api/v1/users/me", {
    data: { firstName: "Test", lastName: "Customer" },
    headers: { Authorization: `Bearer ${customerToken}` },
  });
});

// ─── 56. Create address ────────────────────────────────────────────────────────
test("56. customer can create a delivery address", async ({ customerToken, request }) => {
  const before = await apiGetAddresses(request, { token: customerToken });
  await apiCreateAddress(request, { token: customerToken }, {
    label: `E2E addr ${uniq()}`,
    street: "Testgade 99",
    city: "Aarhus",
    postalCode: "8000",
    isDefault: false,
  });
  const after = await apiGetAddresses(request, { token: customerToken });
  expect(after.length).toBe(before.length + 1);
});

// ─── 57. Delete address ────────────────────────────────────────────────────────
test("57. customer can delete an address", async ({ customerToken, request }) => {
  // Create one to delete
  const addr = await apiCreateAddress(request, { token: customerToken }, {
    label: `ToDelete-${uniq()}`,
    street: "Slettegade 1",
    city: "Odense",
    postalCode: "5000",
    isDefault: false,
  });

  const res = await request.delete(`http://localhost:4000/api/v1/users/me/addresses/${addr.id}`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  expect(res.ok()).toBe(true);

  const after = await apiGetAddresses(request, { token: customerToken });
  expect(after.find((a) => a.id === addr.id)).toBeUndefined();
});
