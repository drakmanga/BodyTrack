import { z } from "zod";

const schema = z.object({
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default("bodytrack"),
  DB_USER: z.string().default("bodytrack"),
  DB_PASSWORD: z.string().default("bodytrack"),
  JWT_SECRET: z.string(),
  JWT_EXPIRATION_MINUTES: z.coerce.number().default(1440),
  CORS_ALLOWED_ORIGIN: z.string().default("http://localhost:5173"),
  PHOTOS_STORAGE_PATH: z.string().default("/data/photos"),
  SERVER_PORT: z.coerce.number().default(8080),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

if (Buffer.byteLength(parsed.data.JWT_SECRET, "utf8") < 32) {
  console.error("JWT_SECRET must be at least 32 bytes long");
  process.exit(1);
}

const databaseUrl = `postgresql://${parsed.data.DB_USER}:${parsed.data.DB_PASSWORD}@${parsed.data.DB_HOST}:${parsed.data.DB_PORT}/${parsed.data.DB_NAME}`;

// PrismaClient reads DATABASE_URL from process.env at instantiation time, so
// this must be set before any module imports @prisma/client.
process.env.DATABASE_URL = databaseUrl;

export const env = {
  ...parsed.data,
  DATABASE_URL: databaseUrl,
};
