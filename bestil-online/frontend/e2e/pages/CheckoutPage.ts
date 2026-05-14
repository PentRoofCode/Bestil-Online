import type { Page, FrameLocator } from "@playwright/test";
import { expect } from "@playwright/test";

const TEST_CARDS = {
  success: { number: "4242 4242 4242 4242", exp: "12 / 34", cvc: "123", zip: "12345" },
  declined: { number: "4000 0000 0000 0002", exp: "12 / 34", cvc: "123", zip: "12345" },
  threeDS: { number: "4000 0027 6000 3184", exp: "12 / 34", cvc: "123", zip: "12345" },
} as const;

export class CheckoutPagePO {
  constructor(private readonly page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto("/checkout");
  }

  async waitForStep1(): Promise<void> {
    await expect(this.page.getByRole("heading", { name: "Betaling" })).toBeVisible();
  }

  async selectAddress(label: string): Promise<void> {
    await this.page.getByText(label, { exact: true }).first().click();
  }

  async proceedToPayment(): Promise<void> {
    await this.page.getByRole("button", { name: /^Gå til betaling/ }).click();
    await expect(this.page.getByRole("heading", { name: "Vælg betalingsmetode" })).toBeVisible({
      timeout: 20_000,
    });
  }

  async fillCard(kind: keyof typeof TEST_CARDS = "success"): Promise<void> {
    const card = TEST_CARDS[kind];
    // Stripe Payment Element renders inside iframes. Find them.
    // The card number field is typically the first iframe to load.
    const stripeFrame = await this.findStripeFrame();
    await stripeFrame.getByLabel(/card number/i).fill(card.number);
    await stripeFrame.getByLabel(/expiration|expiry|expir/i).fill(card.exp);
    await stripeFrame.getByLabel(/cvc|security code/i).fill(card.cvc);

    // ZIP/postal is sometimes shown, sometimes hidden — try, ignore failure.
    const zipField = stripeFrame.getByLabel(/zip|postal/i);
    if (await zipField.count() > 0) {
      await zipField.first().fill(card.zip).catch(() => {});
    }
  }

  async submitPayment(): Promise<void> {
    await this.page.getByRole("button", { name: /^Betal/ }).click();
  }

  async waitForPaymentError(): Promise<void> {
    // The error appears in a <p> with red text near the button.
    await expect(this.page.locator("p.text-red-500")).toBeVisible({ timeout: 30_000 });
  }

  async getPaymentError(): Promise<string> {
    return (await this.page.locator("p.text-red-500").first().innerText()).trim();
  }

  async clickBack(): Promise<void> {
    await this.page.getByRole("button", { name: /Tilbage/ }).click();
  }

  /**
   * Locate the Stripe iframe containing the Payment Element fields.
   * Different Stripe SDKs nest iframes differently; we try a few options.
   */
  private async findStripeFrame(): Promise<FrameLocator> {
    // Wait for any Stripe iframe to be present.
    await this.page.locator("iframe[name*='__privateStripe'], iframe[title*='Secure'], iframe[src*='stripe']").first().waitFor({ timeout: 30_000 });
    // The PaymentElement typically renders in an iframe with a title.
    const candidates: FrameLocator[] = [
      this.page.frameLocator("iframe[title*='Secure payment input frame']"),
      this.page.frameLocator("iframe[name*='__privateStripeFrame']").first() as unknown as FrameLocator,
      this.page.frameLocator("iframe[src*='stripe']").first() as unknown as FrameLocator,
    ];
    for (const f of candidates) {
      const cardField = f.getByLabel(/card number/i);
      if (await cardField.count().catch(() => 0) > 0) return f;
    }
    return candidates[0];
  }
}

export { TEST_CARDS };
