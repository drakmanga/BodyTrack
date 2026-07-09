import bcrypt from "bcrypt";
import type { PrismaClient } from "@prisma/client";
import { ApiException } from "../../common/errors.js";
import { METRIC_CATALOG } from "../metrics/metrics.catalog.js";
import type { RegisterInput, LoginInput } from "./auth.schemas.js";

const BCRYPT_ROUNDS = 10;

export interface AuthenticatedUser {
  id: bigint;
  username: string;
  profileId: bigint;
}

export async function registerUser(prisma: PrismaClient, input: RegisterInput): Promise<AuthenticatedUser> {
  const existing = await prisma.user.findUnique({ where: { username: input.username } });
  if (existing) {
    throw ApiException.conflict("Username already taken");
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const { user, profile } = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: { username: input.username, passwordHash },
    });

    const createdProfile = await tx.profile.create({
      data: { accountId: createdUser.id, displayName: createdUser.username, isPrimary: true },
    });

    await tx.metricDefinition.createMany({
      data: METRIC_CATALOG.map((entry, index) => ({
        profileId: createdProfile.id,
        name: entry.name,
        unit: entry.unit,
        displayOrder: index,
        howToMeasure: entry.howToMeasure,
      })),
    });

    return { user: createdUser, profile: createdProfile };
  });

  return { id: user.id, username: user.username, profileId: profile.id };
}

export async function authenticateUser(prisma: PrismaClient, input: LoginInput): Promise<AuthenticatedUser> {
  const user = await prisma.user.findUnique({ where: { username: input.username } });
  if (!user) {
    throw ApiException.unauthorized("Invalid username or password");
  }

  const matches = await bcrypt.compare(input.password, user.passwordHash);
  if (!matches) {
    throw ApiException.unauthorized("Invalid username or password");
  }

  // Login always starts from the primary profile; the frontend re-activates whichever
  // profile the user last had selected right after, if it wasn't the primary one.
  const primaryProfile = await prisma.profile.findFirstOrThrow({
    where: { accountId: user.id, isPrimary: true },
  });

  return { id: user.id, username: user.username, profileId: primaryProfile.id };
}
