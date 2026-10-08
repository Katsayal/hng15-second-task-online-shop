import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma: PrismaClient | undefined;
};

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Missing DATABASE_URL");
}

const connectionUrl = new URL(databaseUrl);
if (!connectionUrl.searchParams.has("connect_timeout")) {
  connectionUrl.searchParams.set("connect_timeout", "30");
}
if (!connectionUrl.searchParams.has("pool_timeout")) {
  connectionUrl.searchParams.set("pool_timeout", "30");
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: { db: { url: connectionUrl.toString() } },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
