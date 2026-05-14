/**
 * Playwright global setup — runs once before the entire suite.
 * Logs in all seed users via /auth/login and writes tokens to disk.
 * Fixtures read from this file so /auth/login is called at most once
 * per seed user per suite run, avoiding the 5/min rate limit.
 */
import { request } from "@playwright/test";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { SEED } from "./helpers/api";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const AUTH_STATE_FILE = join(__dirname, ".auth-state.json");

interface AuthState {
  accessToken: string;
  cookieHeader: string;
}

export type AuthStateMap = {
  customer: AuthState;
  owner1: AuthState;
  owner2: AuthState;
  admin: AuthState;
};

async function loginUser(
  ctx: Awaited<ReturnType<typeof request.newContext>>,
  email: string,
  password: string,
): Promise<AuthState> {
  const res = await ctx.post("http://localhost:4000/api/v1/auth/login", {
    data: { email, password },
  });
  if (!res.ok()) {
    throw new Error(`Global setup login failed for ${email}: ${res.status()} ${await res.text()}`);
  }
  const body = (await res.json()) as { data: { accessToken: string } };
  const cookieHeader = res.headers()["set-cookie"] ?? "";
  return { accessToken: body.data.accessToken, cookieHeader };
}

export default async function globalSetup(): Promise<void> {
  const ctx = await request.newContext();

  try {
    const state: AuthStateMap = {
      customer: await loginUser(ctx, SEED.customer.email, SEED.customer.password),
      owner1: await loginUser(ctx, SEED.owner1.email, SEED.owner1.password),
      owner2: await loginUser(ctx, SEED.owner2.email, SEED.owner2.password),
      admin: await loginUser(ctx, SEED.admin.email, SEED.admin.password),
    };

    writeFileSync(AUTH_STATE_FILE, JSON.stringify(state, null, 2));
    console.log("[global-setup] Auth tokens written to", AUTH_STATE_FILE);
  } finally {
    await ctx.dispose();
  }
}
