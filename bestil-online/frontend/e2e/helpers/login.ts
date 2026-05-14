import type { BrowserContext, Page } from "@playwright/test";
import { apiLogin } from "./api";

/**
 * Authenticate a Playwright browser context by:
 *   1. Calling /auth/login server-side to mint an access token + refresh cookie
 *   2. Attaching the refresh cookie to the browser context
 *   3. Setting the access token in the in-memory store before App.tsx mounts
 *      (the app's bootstrap useEffect re-fetches /auth/me via the cookie)
 *
 * Returns the access token in case the test needs to make API calls.
 */
export async function loginAs(
  context: BrowserContext,
  email: string,
  password: string,
): Promise<{ accessToken: string }> {
  const { accessToken, cookieHeader } = await apiLogin(context.request, email, password);

  // Parse Set-Cookie header(s) and apply them to the browser context
  const cookiePairs = parseSetCookies(cookieHeader);
  for (const c of cookiePairs) {
    await context.addCookies([
      {
        name: c.name,
        value: c.value,
        domain: "localhost",
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "Lax",
      },
    ]);
  }

  // Pre-set the access token in localStorage isn't used by the app
  // (token is in-memory), but App.tsx will call /auth/refresh via cookie
  // on bootstrap. We also stash it in a sessionStorage key the page can pick up.
  return { accessToken };
}

/**
 * Sets up a page to use a particular logged-in session.
 * Wraps the cookie setup so each test fixture can call it cleanly.
 */
export async function gotoAuthed(page: Page, url: string): Promise<void> {
  await page.goto(url);
  // App boot: /auth/refresh fires via cookie, then /auth/me hydrates the user.
  // Wait for the store to flush isHydrating=false, indicated by the absence
  // of any auth-pending spinner. A small grace period is enough.
  await page.waitForLoadState("networkidle");
}

function parseSetCookies(header: string): Array<{ name: string; value: string }> {
  if (!header) return [];
  // Multiple cookies are separated by ', ' but expires dates also have commas.
  // Split conservatively on cookie name boundaries (name=...; ...).
  const out: Array<{ name: string; value: string }> = [];
  // Node's fetch joins multiple Set-Cookie with a comma; split by entries that
  // look like "name=value; ...".
  const parts = header.split(/,(?=\s*[A-Za-z0-9_-]+=)/g);
  for (const part of parts) {
    const m = part.trim().match(/^([^=]+)=([^;]*)/);
    if (m) out.push({ name: m[1].trim(), value: m[2] });
  }
  return out;
}
