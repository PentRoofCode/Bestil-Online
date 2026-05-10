import { Router } from "express";
import bcrypt from "bcrypt";
import { prisma } from "@/config/db";
import { asyncHandler } from "@/utils/asyncHandler";
import { sendSuccess, sendCreated } from "@/utils/ApiResponse";
import { authenticate } from "@/middleware/auth.middleware";
import { ApiError } from "@/utils/ApiError";
import { z } from "zod";
import { validate } from "@/middleware/validate.middleware";

const addressSchema = z.object({
  label: z.string().min(1),
  street: z.string().min(1),
  city: z.string().min(1),
  postalCode: z.string().min(1),
  country: z.string().default("DK"),
  isDefault: z.boolean().default(false),
});

const router = Router();

router.use(authenticate);

router.get(
  "/me/addresses",
  asyncHandler(async (req, res) => {
    const addresses = await prisma.address.findMany({ where: { userId: req.user!.id }, orderBy: { isDefault: "desc" } });
    sendSuccess(res, addresses);
  }),
);

router.post(
  "/me/addresses",
  validate(addressSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof addressSchema>;
    if (data.isDefault) {
      await prisma.address.updateMany({ where: { userId: req.user!.id }, data: { isDefault: false } });
    }
    const address = await prisma.address.create({ data: { ...data, userId: req.user!.id } });
    sendCreated(res, address);
  }),
);

router.patch(
  "/me/addresses/:id",
  validate(addressSchema.partial()),
  asyncHandler(async (req, res) => {
    const address = await prisma.address.findFirst({ where: { id: req.params.id as string, userId: req.user!.id } });
    if (!address) {
      return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Address not found" } });
    }
    const updated = await prisma.address.update({ where: { id: req.params.id as string }, data: req.body });
    sendSuccess(res, updated);
  }),
);

router.delete(
  "/me/addresses/:id",
  asyncHandler(async (req, res) => {
    await prisma.address.deleteMany({ where: { id: req.params.id as string, userId: req.user!.id } });
    sendSuccess(res, null);
  }),
);

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.post(
  "/me/change-password",
  validate(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body as z.infer<typeof changePasswordSchema>;
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw ApiError.notFound("User not found");
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new ApiError(401, "INVALID_CREDENTIALS", "Current password is incorrect");
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user!.id }, data: { passwordHash } });
    sendSuccess(res, null);
  }),
);

router.get(
  "/me",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, role: true, profilePicture: true, emailVerified: true,
      },
    });
    sendSuccess(res, user);
  }),
);

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
});

router.patch(
  "/me",
  validate(updateProfileSchema),
  asyncHandler(async (req, res) => {
    const data = req.body as z.infer<typeof updateProfileSchema>;
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, role: true, profilePicture: true, emailVerified: true,
      },
    });
    sendSuccess(res, user);
  }),
);

export default router;
