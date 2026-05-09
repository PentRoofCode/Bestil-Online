import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { prisma } from "@/config/db";
import { redis } from "@/config/redis";
import { env } from "@/config/env";
import { ApiError } from "@/utils/ApiError";
import type { RegisterBody, LoginBody } from "./auth.schemas";

const BCRYPT_ROUNDS = 12;
const REFRESH_TOKEN_BYTES = 40;
const REFRESH_PREFIX = "refresh:";

function makeAccessToken(userId: string, email: string, role: string): string {
  return jwt.sign({ sub: userId, email, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL as never,
  });
}

function makeRefreshToken(): string {
  return randomBytes(REFRESH_TOKEN_BYTES).toString("hex");
}

function refreshTtlSeconds(): number {
  const days = parseInt(env.JWT_REFRESH_TTL.replace("d", ""), 10) || 7;
  return days * 24 * 60 * 60;
}

export const authService = {
  async register(data: RegisterBody) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ApiError(409, "CONFLICT", "Email already in use");
    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: data.role,
      },
      select: { id: true, email: true, firstName: true, lastName: true, role: true },
    });
    return user;
  },

  async login(data: LoginBody) {
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.isActive) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");
    }
    const valid = await bcrypt.compare(data.password, user.passwordHash);
    if (!valid) throw new ApiError(401, "INVALID_CREDENTIALS", "Invalid email or password");

    const accessToken = makeAccessToken(user.id, user.email, user.role);
    const refreshToken = makeRefreshToken();
    await redis.set(`${REFRESH_PREFIX}${refreshToken}`, user.id, "EX", refreshTtlSeconds());

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  },

  async logout(refreshToken: string) {
    await redis.del(`${REFRESH_PREFIX}${refreshToken}`);
  },

  async refresh(refreshToken: string) {
    const userId = await redis.get(`${REFRESH_PREFIX}${refreshToken}`);
    if (!userId) throw new ApiError(401, "TOKEN_EXPIRED", "Refresh token expired or invalid");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user || !user.isActive) throw new ApiError(401, "UNAUTHORIZED", "User not found");

    await redis.del(`${REFRESH_PREFIX}${refreshToken}`);
    const newRefreshToken = makeRefreshToken();
    await redis.set(`${REFRESH_PREFIX}${newRefreshToken}`, user.id, "EX", refreshTtlSeconds());
    const accessToken = makeAccessToken(user.id, user.email, user.role);

    return { accessToken, refreshToken: newRefreshToken };
  },

  async me(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        phone: true,
        emailVerified: true,
        profilePicture: true,
        createdAt: true,
      },
    });
    if (!user) throw ApiError.notFound("User not found");
    return user;
  },
};
