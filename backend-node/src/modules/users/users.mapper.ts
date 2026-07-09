import type { User } from "@prisma/client";

export interface UserResponse {
  id: number;
  username: string;
}

export function mapUser(user: User): UserResponse {
  return {
    id: Number(user.id),
    username: user.username,
  };
}
