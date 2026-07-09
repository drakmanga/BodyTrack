import type { PrismaClient, User } from "@prisma/client";
import { ApiException } from "../../common/errors.js";

export async function getUserById(prisma: PrismaClient, userId: bigint): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw ApiException.notFound("User not found");
  }
  return user;
}
