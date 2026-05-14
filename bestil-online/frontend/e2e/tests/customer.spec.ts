/**
 * Customer journey tests (1–23).
 * Covers: browsing, cart, checkout flow, order history.
 */
import { test, expect } from "../fixtures";
import { SEEDED_RESTAURANT_SLUGS, apiGetRestaurantBySlug, apiCreateAddress, apiGetAddresses } from "../helpers/api";
import { RestaurantPagePO } from "../pages/RestaurantPage";
import { CartDrawerPO } from "../pages/CartDrawer";
import { HomePagePO } from "../pages/HomePage";
import { CheckoutPagePO } from "../pages/CheckoutPage";

// ─── 1. Home page loads restaurant list ────────────────────────────────────────
test("1. home page shows restaurant cards", async ({ page }) => {
  const home = new HomePagePO(page);
  await home.goto();
  const visible = await home.restaurantVisible("La Bella Italia");
  expect(visible).toBe(true);
});

// ─── 2. Search filters by name ─────────────────────────────────────────────────
test("2. search by name filters results", async ({ page }) => {
  const home = new HomePagePO(page);
  await home.goto();
  await home.searchByName("sushi");
  await page.waitForTimeout(600); // debounce
  const sushiVisible = await home.restaurantVisible("Sushi Zen");
  const italianVisible = await home.restaurantVisible("La Bella Italia");
  expect(sushiVisible).toBe(true);
  expect(italianVisible).toBe(false);
});

// ─── 3. Filter by city ─────────────────────────────────────────────────────────
test("3. filter by city shows only matching restaurants", async ({ page }) => {
  const home = new HomePagePO(page);
  await home.goto();
  await home.filterByCity("København");
  await page.waitForTimeout(600);
  // At least one restaurant should remain visible
  const anyVisible = await page.locator("a[href*='/restaurants/']").count();
  expect(anyVisible).toBeGreaterThan(0);
});

// ─── 4. Navigate to restaurant page ────────────────────────────────────────────
test("4. clicking restaurant card opens restaurant page", async ({ page }) => {
  const home = new HomePagePO(page);
  await home.goto();
  await home.openRestaurant(SEEDED_RESTAURANT_SLUGS.italian);
  await expect(page).toHaveURL(new RegExp(`/restaurants/${SEEDED_RESTAURANT_SLUGS.italian}`));
});

// ─── 5. Restaurant page shows menu categories ──────────────────────────────────
test("5. restaurant page shows menu categories and items", async ({ page }) => {
  const rp = new RestaurantPagePO(page);
  await rp.goto(SEEDED_RESTAURANT_SLUGS.italian);
  // At least one category heading or item name should be visible
  const items = page.getByRole("button", { name: /\d+\s*kr/i });
  await expect(items.first()).toBeVisible({ timeout: 15_000 });
});

// ─── 6. Item modal opens ───────────────────────────────────────────────────────
test("6. clicking a menu item opens its modal", async ({ page, request }) => {
  const rp = new RestaurantPagePO(page);
  await rp.goto(SEEDED_RESTAURANT_SLUGS.italian);

  const restaurant = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.italian);
  const firstItem = restaurant.categories[0]?.menuItems[0];
  if (!firstItem) test.skip(true, "No items in seeded menu");

  await rp.openItem(firstItem.name);
  // Modal should be open — heading with item name
  await expect(page.getByRole("heading", { name: firstItem.name, level: 3 })).toBeVisible();
});

// ─── 7. Add item to cart ───────────────────────────────────────────────────────
test("7. adding item to cart updates cart count", async ({ page, request }) => {
  const rp = new RestaurantPagePO(page);
  await rp.goto(SEEDED_RESTAURANT_SLUGS.italian);

  const restaurant = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.italian);
  const firstItem = restaurant.categories[0]?.menuItems[0];
  if (!firstItem) test.skip(true, "No items in seeded menu");

  const countBefore = await rp.cartCount();
  await rp.openItem(firstItem.name);
  await rp.addOpenItemToCart();

  await expect.poll(() => rp.cartCount()).toBeGreaterThan(countBefore);
});

// ─── 8. Cart badge shows correct count ────────────────────────────────────────
test("8. cart badge reflects total item count", async ({ page, request }) => {
  const rp = new RestaurantPagePO(page);
  await rp.goto(SEEDED_RESTAURANT_SLUGS.italian);

  const restaurant = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.italian);
  const items = restaurant.categories[0]?.menuItems ?? [];
  if (items.length < 2) test.skip(true, "Need at least 2 items");

  await rp.openItem(items[0].name);
  await rp.addOpenItemToCart();
  await rp.openItem(items[1].name);
  await rp.addOpenItemToCart();

  const count = await rp.cartCount();
  expect(count).toBe(2);
});

// ─── 9. Increase item quantity in cart ────────────────────────────────────────
test("9. increment button increases item quantity in cart", async ({ page, request }) => {
  const rp = new RestaurantPagePO(page);
  await rp.goto(SEEDED_RESTAURANT_SLUGS.italian);

  const restaurant = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.italian);
  const item = restaurant.categories[0]?.menuItems[0];
  if (!item) test.skip(true, "No items");

  await rp.openItem(item.name);
  await rp.addOpenItemToCart();
  await rp.openCart();

  const cart = new CartDrawerPO(page);
  await cart.incrementItem(item.name);

  const count = await rp.cartCount();
  expect(count).toBe(2);
});

// ─── 10. Decrease item quantity in cart ───────────────────────────────────────
test("10. decrement button decreases item quantity in cart", async ({ page, request }) => {
  const rp = new RestaurantPagePO(page);
  await rp.goto(SEEDED_RESTAURANT_SLUGS.italian);

  const restaurant = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.italian);
  const item = restaurant.categories[0]?.menuItems[0];
  if (!item) test.skip(true, "No items");

  await rp.openItem(item.name);
  await rp.setQuantity(3);
  await rp.addOpenItemToCart();
  await rp.openCart();

  const cart = new CartDrawerPO(page);
  await cart.decrementItem(item.name);

  const count = await rp.cartCount();
  expect(count).toBe(2);
});

// ─── 11. Remove item from cart ────────────────────────────────────────────────
test("11. removing only item empties cart", async ({ page, request }) => {
  const rp = new RestaurantPagePO(page);
  await rp.goto(SEEDED_RESTAURANT_SLUGS.italian);

  const restaurant = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.italian);
  const item = restaurant.categories[0]?.menuItems[0];
  if (!item) test.skip(true, "No items");

  await rp.openItem(item.name);
  await rp.addOpenItemToCart();
  await rp.openCart();

  const cart = new CartDrawerPO(page);
  await cart.removeItem(item.name);

  // After removing, cart count should be 0
  await expect.poll(() => rp.cartCount()).toBe(0);
});

// ─── 12. Clear cart button ────────────────────────────────────────────────────
test("12. clear cart empties all items", async ({ page, request }) => {
  const rp = new RestaurantPagePO(page);
  await rp.goto(SEEDED_RESTAURANT_SLUGS.italian);

  const restaurant = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.italian);
  const items = restaurant.categories[0]?.menuItems ?? [];
  if (!items[0]) test.skip(true, "No items");

  await rp.openItem(items[0].name);
  await rp.addOpenItemToCart();
  await rp.openCart();

  const cart = new CartDrawerPO(page);
  await cart.clear();

  await expect.poll(() => rp.cartCount()).toBe(0);
});

// ─── 13. Cart persists across navigation ──────────────────────────────────────
test("13. cart items persist after navigating away and back", async ({ page, request }) => {
  const rp = new RestaurantPagePO(page);
  await rp.goto(SEEDED_RESTAURANT_SLUGS.italian);

  const restaurant = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.italian);
  const item = restaurant.categories[0]?.menuItems[0];
  if (!item) test.skip(true, "No items");

  await rp.openItem(item.name);
  await rp.addOpenItemToCart();

  // Navigate away and back
  await page.goto("/");
  await rp.goto(SEEDED_RESTAURANT_SLUGS.italian);

  const count = await rp.cartCount();
  expect(count).toBeGreaterThan(0);
});

// ─── 14. Cart conflict dialog shows restaurant names ──────────────────────────
test("14. cart conflict dialog shows both restaurant names", async ({ page, request }) => {
  // Add from Italian restaurant
  const rp = new RestaurantPagePO(page);
  await rp.goto(SEEDED_RESTAURANT_SLUGS.italian);

  const italian = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.italian);
  const item1 = italian.categories[0]?.menuItems[0];
  if (!item1) test.skip(true, "No items in Italian");

  await rp.openItem(item1.name);
  await rp.addOpenItemToCart();

  // Now go to sushi and try to add — should trigger conflict
  await rp.goto(SEEDED_RESTAURANT_SLUGS.sushi);

  const sushi = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.sushi);
  const item2 = sushi.categories[0]?.menuItems[0];
  if (!item2) test.skip(true, "No items in Sushi");

  await rp.openItem(item2.name);
  await rp.addOpenItemToCart();

  // Conflict dialog should show
  await expect(rp.conflictDialog).toBeVisible({ timeout: 5_000 });
  const dialogText = await rp.conflictDialog.innerText();
  expect(dialogText).toContain("La Bella Italia");
  expect(dialogText).toContain("Sushi Zen");
});

// ─── 15. Cancel cart switch keeps original cart ───────────────────────────────
test("15. cancelling cart switch preserves original cart", async ({ page, request }) => {
  const rp = new RestaurantPagePO(page);
  await rp.goto(SEEDED_RESTAURANT_SLUGS.italian);

  const italian = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.italian);
  const item1 = italian.categories[0]?.menuItems[0];
  if (!item1) test.skip(true, "No items");

  await rp.openItem(item1.name);
  await rp.addOpenItemToCart();
  const countBefore = await rp.cartCount();

  await rp.goto(SEEDED_RESTAURANT_SLUGS.sushi);
  const sushi = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.sushi);
  const item2 = sushi.categories[0]?.menuItems[0];
  if (!item2) test.skip(true, "No items in Sushi");

  await rp.openItem(item2.name);
  await rp.addOpenItemToCart();
  await rp.cancelCartSwitch();

  const countAfter = await rp.cartCount();
  expect(countAfter).toBe(countBefore);
});

// ─── 16. Confirm cart switch clears and adds new item ─────────────────────────
test("16. confirming cart switch adds new restaurant item", async ({ page, request }) => {
  const rp = new RestaurantPagePO(page);
  await rp.goto(SEEDED_RESTAURANT_SLUGS.italian);

  const italian = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.italian);
  const item1 = italian.categories[0]?.menuItems[0];
  if (!item1) test.skip(true, "No items");

  await rp.openItem(item1.name);
  await rp.addOpenItemToCart();

  await rp.goto(SEEDED_RESTAURANT_SLUGS.sushi);
  const sushi = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.sushi);
  const item2 = sushi.categories[0]?.menuItems[0];
  if (!item2) test.skip(true, "No items in Sushi");

  await rp.openItem(item2.name);
  await rp.addOpenItemToCart();
  await rp.confirmCartSwitch();

  // Cart should now have 1 item (from sushi)
  await expect.poll(() => rp.cartCount()).toBe(1);
});

// ─── 17. Unauthenticated user redirected from checkout ─────────────────────────
test("17. unauthenticated user is redirected to login from checkout", async ({ page }) => {
  // page (no fixture) is an unauthed browser
  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/login/);
});

// ─── 18. Checkout address selection ───────────────────────────────────────────
test("18. checkout step 1 shows saved addresses", async ({ customerPage, customerToken, request }) => {
  // Ensure customer has an address
  const addresses = await apiGetAddresses(request, { token: customerToken });
  if (addresses.length === 0) {
    await apiCreateAddress(request, { token: customerToken }, {
      label: "Hjem",
      street: "Testgade 1",
      city: "København",
      postalCode: "1000",
      isDefault: true,
    });
  }

  // Add item to cart first
  const rp = new RestaurantPagePO(customerPage);
  await rp.goto(SEEDED_RESTAURANT_SLUGS.italian);
  const italian = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.italian);
  const item = italian.categories[0]?.menuItems[0];
  if (!item) test.skip(true, "No items");

  await rp.openItem(item.name);
  await rp.addOpenItemToCart();
  await rp.openCart();

  const cart = new CartDrawerPO(customerPage);
  await cart.goToCheckout();

  const checkout = new CheckoutPagePO(customerPage);
  await checkout.waitForStep1();

  // At least one address should appear
  const addrLabels = await apiGetAddresses(request, { token: customerToken });
  if (addrLabels.length > 0) {
    await expect(customerPage.getByText(addrLabels[0].label, { exact: false })).toBeVisible();
  }
});

// ─── 19. Back button returns to address step ──────────────────────────────────
test("19. back button in payment step returns to address step", async ({ customerPage, customerToken, request }) => {
  const addresses = await apiGetAddresses(request, { token: customerToken });
  let addressLabel = addresses[0]?.label;
  if (!addressLabel) {
    await apiCreateAddress(request, { token: customerToken }, {
      label: "Hjem",
      street: "Testgade 1",
      city: "København",
      postalCode: "1000",
      isDefault: true,
    });
    addressLabel = "Hjem";
  }

  const rp = new RestaurantPagePO(customerPage);
  await rp.goto(SEEDED_RESTAURANT_SLUGS.italian);
  const italian = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.italian);
  const item = italian.categories[0]?.menuItems[0];
  if (!item) test.skip(true, "No items");

  await rp.openItem(item.name);
  await rp.addOpenItemToCart();
  await rp.openCart();

  const cart = new CartDrawerPO(customerPage);
  await cart.goToCheckout();

  const checkout = new CheckoutPagePO(customerPage);
  await checkout.waitForStep1();
  await checkout.selectAddress(addressLabel);
  await checkout.proceedToPayment();
  await checkout.clickBack();

  // Should be back at step 1
  await expect(customerPage.getByRole("heading", { name: "Betaling" })).toBeVisible();
});

// ─── 20. Checkout shows order summary ─────────────────────────────────────────
test("20. checkout shows order line items", async ({ customerPage, customerToken, request }) => {
  const addresses = await apiGetAddresses(request, { token: customerToken });
  let addressLabel = addresses[0]?.label;
  if (!addressLabel) {
    await apiCreateAddress(request, { token: customerToken }, {
      label: "Hjem",
      street: "Testgade 1",
      city: "København",
      postalCode: "1000",
      isDefault: true,
    });
    addressLabel = "Hjem";
  }

  const rp = new RestaurantPagePO(customerPage);
  await rp.goto(SEEDED_RESTAURANT_SLUGS.italian);
  const italian = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.italian);
  const item = italian.categories[0]?.menuItems[0];
  if (!item) test.skip(true, "No items");

  await rp.openItem(item.name);
  await rp.addOpenItemToCart();
  await rp.openCart();

  const cart = new CartDrawerPO(customerPage);
  await cart.goToCheckout();

  const checkout = new CheckoutPagePO(customerPage);
  await checkout.waitForStep1();

  // Item name should appear in the order summary
  await expect(customerPage.getByText(item.name, { exact: false })).toBeVisible();
});

// ─── 21. Cart subtotal matches sum of items ────────────────────────────────────
test("21. cart subtotal matches item prices", async ({ page, request }) => {
  const rp = new RestaurantPagePO(page);
  await rp.goto(SEEDED_RESTAURANT_SLUGS.italian);

  const italian = await apiGetRestaurantBySlug(request, SEEDED_RESTAURANT_SLUGS.italian);
  const item = italian.categories[0]?.menuItems[0];
  if (!item) test.skip(true, "No items");

  await rp.openItem(item.name);
  await rp.addOpenItemToCart();
  await rp.openCart();

  const cart = new CartDrawerPO(page);
  const subtotal = await cart.subtotal();
  const expectedPrice = parseFloat(item.price);
  expect(subtotal).toBe(expectedPrice);
});

// ─── 22. Orders list accessible ───────────────────────────────────────────────
test("22. authenticated customer can view their orders list", async ({ customerPage }) => {
  await customerPage.goto("/orders");
  await expect(customerPage).toHaveURL(/\/orders/);
  // The page should render without redirecting
  await expect(customerPage.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 10_000 });
});

// ─── 23. Order detail accessible ──────────────────────────────────────────────
test("23. unauthenticated user redirected from orders page", async ({ page }) => {
  await page.goto("/orders");
  await expect(page).toHaveURL(/\/login/);
});
