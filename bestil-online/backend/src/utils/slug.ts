import { randomBytes } from "crypto";
import { prisma } from "@/config/db";

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "");
}

function randomSuffix(): string {
  return randomBytes(3).toString("hex");
}

export async function generateSlug(name: string): Promise<string> {
  const base = toKebabCase(name);
  const existing = await prisma.restaurant.findUnique({ where: { slug: base } });
  if (!existing) return base;
  let candidate: string;
  let attempts = 0;
  do {
    candidate = `${base}-${randomSuffix()}`;
    const conflict = await prisma.restaurant.findUnique({ where: { slug: candidate } });
    if (!conflict) return candidate;
    attempts++;
  } while (attempts < 5);
  return `${base}-${Date.now()}`;
}
