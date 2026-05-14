/**
 * Playwright fixtures. Auth tokens are read from the file written by
 * global-setup.ts (which calls /auth/login once per user per suite run).
 * This avoids rate-limit exhaustion from repeated login calls.
 *
 * Auth bootstrap: the React app always calls /auth/refresh on mount.
 * We mock that endpoint to return our pre-known access token so the app
 * bootstraps as the correct user without needing the refresh cookie. This
 * also avoids refresh-token-rotation issues when multiple tests run
 * sequentially with the same original cookie.
 */
import {
  test as base,
  expect,
  type APIRequestContext,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { AuthStateMap } from "./global-setup";

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTH_STATE_FILE = join(__dirname, ".auth-state.json");

interface AuthState {
  accessToken: string;
  cookieHeader: string;
}

interface Fixtures {
  customerPage: Page;
  customerToken: string;
  ownerPage: Page;
  ownerToken: string;
  owner2Page: Page;
  owner2Token: string;
  adminPage: Page;
  adminToken: string;
  api: APIRequestContext;
  // worker-scoped auth map
  authState: AuthStateMap;
}

function readAuthState(): AuthStateMap {
  const raw = readFileSync(AUTH_STATE_FILE, "utf-8");
  return JSON.parse(raw) as AuthStateMap;
}

async function applyAuthToContext(
  context: BrowserContext,
  auth: AuthState,
): Promise<Page> {
  const page = await context.newPage();
  // Mock /auth/refresh so the app bootstraps with our pre-known access token.
  // The app then calls /auth/me with this token to hydrate the user store.
  await page.route("**/auth/refresh", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, data: { accessToken: auth.accessToken } }),
    });
  });
  return page;
}

export const test = base.extend<
  Omit<Fixtures, "authState">,
  Pick<Fixtures, "authState">
>({
  // ── Worker-scoped: read auth state from disk once per worker ────────────────
  authState: [
    async ({}, run) => {
      const state = readAuthState();
      await run(state);
    },
    { scope: "worker" },
  ],

  // ── Test-scoped pages ────────────────────────────────────────────────────────
  customerPage: async ({ context, authState }, run) => {
    const page = await applyAuthToContext(context, authState.customer);
    await run(page);
  },

  customerToken: async ({ authState }, run) => {
    await run(authState.customer.accessToken);
  },

  ownerPage: async ({ context, authState }, run) => {
    const page = await applyAuthToContext(context, authState.owner1);
    await run(page);
  },

  ownerToken: async ({ authState }, run) => {
    await run(authState.owner1.accessToken);
  },

  owner2Page: async ({ context, authState }, run) => {
    const page = await applyAuthToContext(context, authState.owner2);
    await run(page);
  },

  owner2Token: async ({ authState }, run) => {
    await run(authState.owner2.accessToken);
  },

  adminPage: async ({ context, authState }, run) => {
    const page = await applyAuthToContext(context, authState.admin);
    await run(page);
  },

  adminToken: async ({ authState }, run) => {
    await run(authState.admin.accessToken);
  },

  api: async ({ playwright }, run) => {
    const req = await playwright.request.newContext();
    await run(req);
    await req.dispose();
  },
});

export { expect };
